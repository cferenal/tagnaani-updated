import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { openStore } from "./store.js";
import { advisory, equalSecret, normalizePhone, parseSms, sendSms, SMS_HELP, verifyTwilio } from "./sms.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const usernameKey = (value) => String(value ?? "").trim().toLowerCase();
const validUser = (name) => /^[a-z0-9][a-z0-9_.-]{1,39}$/i.test(name);
const validPassword = (password) => typeof password === "string" && password.length >= 12 && password.length <= 128;
const minute = 60_000;
const sessionLifetime = 7 * 24 * 60 * minute;
const sessionName = "tagna_session";

function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const key = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `${salt}:${key.toString("hex")}`;
}

function matches(password, stored) {
  const candidate = passwordHash(password, stored?.split(":")[0] || "missing-account");
  return Boolean(stored && timingSafeEqual(Buffer.from(candidate), Buffer.from(stored)));
}

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function publicUser(user, state) {
  return {
    id: user.id, username: user.username, role: user.role,
    phone: user.phone || null, subscribed: Boolean(state.subscriptions[user.phone]?.subscribed),
  };
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 32_768) fail(413, "Request is too large.");
  }
  if (req.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }
  try {
    const data = JSON.parse(body || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    fail(400, "Invalid request body.");
  }
}

function applySmsCommand(state, phone, command, message, now) {
  const entry = state.subscriptions[phone];
  if (command.kind === "verify") {
    const user = Object.values(state.users).find(({ pairing, role }) =>
      role !== "admin" && pairing?.until > now && pairing.phone === phone && pairing.code === hash(command.code));
    if (!user) return "Tagna-Ani: This verification code is invalid or expired.";
    if (Object.values(state.users).some((other) => other !== user && other.phone === phone)) {
      return "Tagna-Ani: This number is already linked.";
    }
    if (user.phone && user.phone !== phone && state.subscriptions[user.phone]) {
      state.subscriptions[user.phone].subscribed = false;
    }
    user.phone = phone;
    delete user.pairing;
    delete user.reset;
    return "Tagna-Ani: Your mobile number is verified. Return to the app to continue.";
  }
  if (command.kind === "help") return SMS_HELP;
  if (command.kind === "alerts") {
    if (command.on && !process.env.SMS_DAILY_SECRET) return "Tagna-Ani: Daily reminders are currently unavailable.";
    if (!entry && command.on) return "Tagna-Ani: Send an advisory request first. " + SMS_HELP;
    if (entry) {
      entry.subscribed = command.on;
      if (command.on && /\s+(BIS|TAG|ENG)$/i.test(message.trim())) entry.lang = command.lang;
    }
    return command.on ? "Tagna-Ani: Daily reminders are on. Text ANI ALERTS OFF to stop." : "Tagna-Ani: Daily reminders are off.";
  }
  state.subscriptions[phone] = { ...command, subscribed: entry?.subscribed || false, lastDaily: entry?.lastDaily };
  return command;
}

export function createTagnaApi() {
  const change = openStore();
  const ready = Promise.resolve().then(() => change((state) => {
    const username = process.env.TAGNA_ADMIN_USERNAME?.trim();
    const password = process.env.TAGNA_ADMIN_PASSWORD;
    if (!username && !password) return;
    if (!validUser(username || "") || !validPassword(password)) throw new Error("Set a valid admin username and a password of at least 12 characters.");
    const key = usernameKey(username);
    const current = Object.hasOwn(state.users, key) && state.users[key];
    if (current?.role !== "admin" && current) throw new Error("Admin username is already registered.");
    if (!current || !matches(password, current.passwordHash)) {
      const id = current?.id || randomUUID();
      for (const [token, session] of Object.entries(state.sessions)) {
        if (session.id === id) delete state.sessions[token];
      }
      state.users[key] = { ...current, id, username, role: "admin", passwordHash: passwordHash(password) };
    }
  }));
  ready.catch(() => console.error("Tagna-Ani could not initialize its database or admin configuration."));

  const rate = new Map();
  function limit(key, max, duration) {
    const now = Date.now();
    for (const [id, entry] of rate) if (entry.until <= now) rate.delete(id);
    const entry = rate.get(key) || { count: 0, until: now + duration };
    if (entry.count >= max) fail(429, "Too many attempts. Try again later.");
    if (rate.size > 10_000 && !rate.has(key)) fail(429, "Server is busy. Try again later.");
    entry.count++;
    rate.set(key, entry);
  }

  function sessionCookie(res, token, maxAge) {
    const secure = process.env.RENDER === "true" || process.env.TAGNA_SECURE_COOKIES === "true";
    res.setHeader("Set-Cookie", `${sessionName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`);
  }

  function revoke(state, id) {
    for (const [key, session] of Object.entries(state.sessions)) {
      if (session.id === id) delete state.sessions[key];
    }
  }

  return async function handleApi(req, res, path) {
    const json = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    };
    try {
      await ready;
      if (path === "/health" && req.method === "GET") {
        await change(() => null);
        return json(200, { ok: true });
      }
      const post = req.method === "POST";
      if (!post && req.method !== "GET") fail(405, "Method not allowed.");
      if (post && req.headers["sec-fetch-site"] === "cross-site") fail(403, "Cross-site request denied.");
      const providerRoute = path === "/sms/twilio";
      if (post && !req.headers["content-type"]?.startsWith(providerRoute
        ? "application/x-www-form-urlencoded" : "application/json")) {
        fail(415, "Unsupported request format.");
      }
      const data = post ? await readBody(req) : {};
      const forwardedIp = process.env.RENDER === "true" && req.headers["x-forwarded-for"]?.split(",").at(-1)?.trim();
      const network = forwardedIp || req.socket.remoteAddress || "unknown";

      if (post && (path === "/sms/inbound" || path === "/sms/twilio")) {
        const twilio = path.endsWith("/twilio");
        const authorized = twilio
          ? verifyTwilio(req.headers["x-twilio-signature"], process.env.TWILIO_WEBHOOK_URL, data, process.env.TWILIO_AUTH_TOKEN)
          : equalSecret(req.headers.authorization, `Bearer ${process.env.SMS_INBOUND_SECRET || ""}`) && process.env.SMS_INBOUND_SECRET;
        if (!authorized) fail(403, "Invalid SMS webhook authentication.");
        const phone = normalizePhone(twilio ? data.From : data.from);
        const message = twilio ? data.Body : data.message;
        const inboundId = twilio ? data.MessageSid : data.id;
        const command = typeof message === "string" && message.length <= 1000 ? parseSms(message) : null;
        const respond = () => {
          if (!twilio) return json(200, { ok: true });
          res.writeHead(200, { "Content-Type": "text/xml", "Cache-Control": "no-store" });
          res.end("<Response/>");
        };
        if (!phone || !command) return respond();
        if (twilio && data.AccountSid !== process.env.TWILIO_ACCOUNT_SID) fail(403, "Unexpected SMS account.");
        limit(`sms:${phone}`, 20, 15 * minute);
        const messageId = hash(inboundId ? `${twilio}:${inboundId}` : `${phone}:${message}:${Math.floor(Date.now() / (5 * minute))}`);
        const delivery = await change((state) => {
          const now = Date.now();
          for (const [id, record] of Object.entries(state.messages)) {
            if (record.until <= now) delete state.messages[id];
          }
          const prior = state.messages[messageId];
          if (prior?.sent || prior?.lease > now) return null;
          if (prior) {
            prior.lease = now + minute;
            return prior;
          }

          const reply = applySmsCommand(state, phone, command, message, now);
          const record = { reply, lease: now + minute, until: now + 24 * 60 * minute };
          state.messages[messageId] = record;
          return record;
        });
        if (delivery) {
          try {
            await sendSms(phone, typeof delivery.reply === "string" ? delivery.reply : await advisory(delivery.reply));
          } catch (err) {
            await change((state) => { state.messages[messageId].lease = 0; });
            throw err;
          }
          await change((state) => {
            const record = state.messages[messageId];
            record.sent = true;
            delete record.reply;
          });
        }
        return respond();
      }

      if (post && path === "/sms/daily") {
        if (!process.env.SMS_DAILY_SECRET || !equalSecret(req.headers.authorization, `Bearer ${process.env.SMS_DAILY_SECRET}`)) fail(403, "Forbidden.");
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", dateStyle: "short" }).format();
        const pending = await change((state) => Object.entries(state.subscriptions)
          .filter(([, info]) => info.subscribed && info.lastDaily !== day)
          .slice(0, 4).map(([phone, info]) => {
            info.lastDaily = day;
            return [phone, info];
          }));
        const results = await Promise.allSettled(pending.map(async ([phone, info]) =>
          sendSms(phone, await advisory(info) + "\nText ANI ALERTS OFF to stop.")));
        await change((state) => results.forEach((result, i) => {
          if (result.status === "rejected" && state.subscriptions[pending[i][0]]?.lastDaily === day) {
            delete state.subscriptions[pending[i][0]].lastDaily;
          }
        }));
        const sent = results.filter(({ status }) => status === "fulfilled").length;
        return json(sent === pending.length ? 200 : 502, { sent, attempted: pending.length });
      }

      if (post && ["/login", "/register", "/reset/request", "/reset/confirm"].includes(path)) {
        const username = String(data.username ?? "").trim();
        const key = usernameKey(username);
        if (!validUser(username)) fail(400, "Enter a valid username.");
        limit(`${path}:user:${key}`, path === "/reset/request" ? 3 : 10, 15 * minute);
        limit(`${path}:network:${network}`, 120, 15 * minute);
        const password = data.password;
        if (path === "/reset/request") {
          const code = String(randomInt(10_000_000, 100_000_000));
          const phone = normalizePhone(data.phone);
          const recipient = await change((state) => {
            const user = Object.hasOwn(state.users, key) && state.users[key];
            if (!user || user.role === "admin" || !phone || user.phone !== phone) return null;
            user.reset = { code: hash(code), until: Date.now() + 10 * minute, attempts: 0 };
            return phone;
          });
          if (recipient) {
            try {
              await sendSms(recipient, `Tagna-Ani reset code: ${code}. Expires in 10 minutes. Keep this code private.`);
            } catch {
              console.error("Tagna-Ani reset SMS dispatch failed.");
            }
          }
          return json(200, { ok: true });
        }
        if (path !== "/login" && !validPassword(password)) fail(400, "Use a password between 12 and 128 characters.");
        if (path === "/login" && (typeof password !== "string" || password.length > 128)) fail(401, "Invalid username or password.");
        const token = randomBytes(32).toString("hex");
        const user = await change((state) => {
          const existing = Object.hasOwn(state.users, key) && state.users[key];
          if (path === "/register") {
            if (existing || key === usernameKey(process.env.TAGNA_ADMIN_USERNAME)) fail(409, "Username already in use.");
            state.users[key] = { id: randomUUID(), username, role: "user", passwordHash: passwordHash(password) };
          } else if (path === "/login") {
            if (!matches(password, existing?.passwordHash)) fail(401, "Invalid username or password.");
          } else {
            const reset = existing?.reset;
            if (!reset || reset.until <= Date.now() || reset.attempts >= 5) return null;
            reset.attempts++;
            if (!equalSecret(hash(String(data.code)), reset.code)) return null;
            existing.passwordHash = passwordHash(password);
            delete existing.reset;
            revoke(state, existing.id);
            return { reset: true };
          }
          for (const [id, session] of Object.entries(state.sessions)) {
            if (session.until <= Date.now()) delete state.sessions[id];
          }
          state.sessions[hash(token)] = { key, id: state.users[key].id, until: Date.now() + sessionLifetime };
          return publicUser(state.users[key], state);
        });
        if (!user) fail(400, "Invalid or expired reset code.");
        if (user.reset) return json(200, { ok: true });
        sessionCookie(res, token, sessionLifetime / 1000);
        return json(200, { user });
      }

      const token = (req.headers.cookie || "").match(/(?:^|;\s*)tagna_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      const sessionId = token && hash(token);
      let resetDelivery;
      const output = await change((state) => {
        const session = sessionId && state.sessions[sessionId];
        const user = session?.until > Date.now() && state.users[session.key];
        if (path === "/logout" && post) {
          if (session) delete state.sessions[sessionId];
          sessionCookie(res, "", 0);
          return { ok: true };
        }
        if (!user) fail(401, "Please log in.");
        if (path === "/me" && !post) return { user: publicUser(user, state) };
        if (path === "/profile" && post) {
          const text = (value) => typeof value === "string" ? value.trim().slice(0, 100) : "";
          user.farm = { city: text(data.city), crop: text(data.crop), problem: text(data.problem) };
          return { ok: true };
        }
        if (path === "/phone" && post) {
          if (user.role === "admin") fail(403, "Phone pairing is available for farmer accounts.");
          limit(`phone:${user.id}`, 5, 15 * minute);
          const phone = normalizePhone(data.phone);
          if (!phone) fail(400, "Enter a Philippine mobile number.");
          if (phone === user.phone) fail(409, "This mobile number is already verified.");
          if (user.phone && (typeof data.password !== "string" || data.password.length > 128 ||
            !matches(data.password, user.passwordHash))) fail(401, "Enter your current password to change numbers.");
          const code = String(randomInt(10_000_000, 100_000_000));
          user.pairing = { phone, code: hash(code), until: Date.now() + 10 * minute };
          return { command: `ANI VERIFY ${code}` };
        }
        if (path === "/subscription" && post) {
          if (!user.phone) fail(400, "Verify your mobile number first.");
          if (typeof data.subscribed !== "boolean") fail(400, "Choose a subscription status.");
          if (data.subscribed && !process.env.SMS_DAILY_SECRET) fail(503, "Daily reminders are currently unavailable.");
          const current = state.subscriptions[user.phone];
          const farm = user.farm;
          if (data.subscribed && !current && !(farm?.city && farm?.crop && farm?.problem)) fail(400, "Complete your farm setup first.");
          if (current || data.subscribed) {
            state.subscriptions[user.phone] = { ...(farm || {}), ...current, subscribed: data.subscribed };
          }
          return { user: publicUser(user, state) };
        }
        if (path.startsWith("/admin/")) {
          if (user.role !== "admin") fail(403, "Administrator access required.");
          if (path === "/admin/users" && !post) {
            const accounts = Object.values(state.users);
            const linked = new Set(accounts.map(({ phone }) => phone));
            const active = new Set(Object.values(state.sessions)
              .filter(({ until }) => until > Date.now()).map(({ id }) => id));
            return {
              users: accounts.map((entry) => ({
                ...publicUser(entry, state),
                phone: entry.phone?.slice(-4) || null,
                city: entry.farm?.city || "", crop: entry.farm?.crop || "", problem: entry.farm?.problem || "",
                online: active.has(entry.id),
              })),
              smsOnly: Object.entries(state.subscriptions)
                .filter(([phone, info]) => info.subscribed && !linked.has(phone))
                .map(([phone, { city, crop, problem }]) => ({ mobileEnding: phone.slice(-4), city, crop, problem })),
            };
          }
          if (path === "/admin/reset" && post) {
            const key = usernameKey(data.username);
            const target = Object.hasOwn(state.users, key) && state.users[key];
            if (!target?.phone || target.role !== "user") fail(404, "Verified farmer account unavailable.");
            limit(`reset:${target.id}`, 3, 15 * minute);
            const code = String(randomInt(10_000_000, 100_000_000));
            target.reset = { code: hash(code), until: Date.now() + 10 * minute, attempts: 0 };
            resetDelivery = { phone: target.phone, code };
            return { ok: true };
          }
          if (path === "/admin/delete" && post) {
            const key = usernameKey(data.username);
            const target = Object.hasOwn(state.users, key) && state.users[key];
            if (!target || target.id !== data.userId || target.role === "admin") fail(404, "Farmer account unavailable.");
            if (data.confirm !== target.username) fail(400, "Type the username to confirm deletion.");
            if (target.phone) delete state.subscriptions[target.phone];
            delete state.users[key];
            revoke(state, target.id);
            return { ok: true };
          }
        }
        fail(404, "Route not found.");
      });
      if (resetDelivery) {
        await sendSms(resetDelivery.phone, `Tagna-Ani reset code: ${resetDelivery.code}. Expires in 10 minutes. Keep this code private.`);
      }
      json(200, output);
    } catch (err) {
      if (!err.status) console.error("Tagna-Ani API error:", err.code || err.name);
      json(err.status || 503, { error: err.status ? err.message : "Service temporarily unavailable." });
    }
  };
}
