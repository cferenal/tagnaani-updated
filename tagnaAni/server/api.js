import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { isPhilippineLand } from "../src/lib/locations.js";
import { resolveSmsLocation } from "./sms-location.js";
import { monthlyClimate } from "./sms-weather.js";
import { reverseLocation } from "./reverse-location.js";
import { drainSms, enqueue, summaries } from "./reminders.js";
import { openStore } from "./store.js";
import { advisory, equalSecret, normalizePhone, parseSms, sendSms, smsHelp, SMS_LANGUAGE_SUFFIX, verifyTwilio } from "./sms.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const usernameKey = (value) => String(value ?? "").trim().toLowerCase();
const validUser = (name) => /^[a-z0-9][a-z0-9_.-]{1,39}$/i.test(name);
const validPassword = (password) => typeof password === "string" && password.length >= 12 && password.length <= 128;
const minute = 60_000;
const sessionLifetime = 7 * 24 * 60 * minute;
const sessionName = "tagna_session";
const adminLimit = 7;
const countAdmins = (state) => Object.values(state.users).filter(({ role }) => role === "admin").length;
const ownerKey = () => usernameKey(process.env.TAGNA_ADMIN_USERNAME);
const shortText = (value) => typeof value === "string" ? value.trim().slice(0, 100) : "";
const phoneEnding = (phone) => phone ? `•••• ${phone.slice(-4)}` : "—";

function audit(state, actor, target, action, changes = []) {
  state.adminAudit = [
    { id: randomUUID(), at: Date.now(), actor: actor.username, target: target.username, action, changes },
    ...(state.adminAudit || []).slice(0, 999),
  ];
}

function syncReminderFarm(state, user) {
  const subscription = state.subscriptions[user.phone];
  const farm = user.farm;
  if (!subscription?.subscribed || !farm?.city || !farm.crop || !farm.problem) return;
  const { location } = farm;
  Object.assign(subscription, { city: farm.city, crop: farm.crop, problem: farm.problem,
    lat: location?.lat, lon: location?.lon, province: location?.province });
  delete subscription.locality;
}

function updateFarmer(state, actor, target, data) {
  const changes = [];
  const farm = target.farm || {};
  const patch = { ...target.farmPatch };
  if (data.location) {
    const { name, province, region, lat, lon } = data.location;
    if (!shortText(name) || !isPhilippineLand(lat, lon)) fail(400, "Choose a location on Philippine land.");
    patch.location = { name: shortText(name), province: shortText(province), region: shortText(region), lat, lon };
    changes.push({ field: "Location", before: farm.city, after: `${patch.location.name} (${lat}, ${lon})` });
    farm.city = patch.location.name;
    farm.location = patch.location;
  }
  for (const [key, field, plural] of [["crop", "Current crop", "crops"], ["problem", "Current problem", "problems"]]) {
    if (!Object.hasOwn(data, key)) continue;
    const value = shortText(data[key]);
    if (!value) fail(400, `Enter a value for ${field.toLowerCase()}.`);
    if (farm[key] === value) continue;
    changes.push({ field, before: farm[key], after: value });
    farm[key] = value;
    if (patch[plural]) patch[plural] = [value, ...patch[plural].slice(1).filter((item) => item !== value)];
    else patch[key] = value;
  }
  if (Object.hasOwn(data, "phone")) {
    const phone = normalizePhone(data.phone);
    if (!phone) fail(400, "Enter a Philippine mobile number.");
    const old = target.pendingPhone || target.phone;
    if (phone !== old) {
      if (Object.values(state.users).some((entry) => entry.id !== target.id && (entry.phone === phone || entry.pendingPhone === phone))) {
        fail(409, "That mobile number is already assigned.");
      }
      if (target.phone && state.subscriptions[target.phone]) state.subscriptions[target.phone].subscribed = false;
      changes.push({ field: "Mobile number", before: phoneEnding(old), after: `${phoneEnding(phone)} (verification pending)` });
      target.pendingPhone = phone;
      delete target.phone;
      delete target.reset;
      delete target.pairing;
    }
  }
  if (changes.some(({ field }) => field !== "Mobile number")) {
    target.farm = farm;
    syncReminderFarm(state, target);
    target.farmPatch = { ...patch, version: randomUUID() };
  }
  if (changes.length) audit(state, actor, target, "Edited farmer details", changes);
}

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
    mustChangePassword: Boolean(user.mustChangePassword),
    pendingPhone: user.pendingPhone || null, phone: user.phone || null, subscribed: Boolean(state.subscriptions[user.phone]?.subscribed),
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

const smsHistoryWindow = 30 * 24 * 60 * minute;
const smsHistoryLimit = 1000;

function recentSmsQueries(state, now) {
  return (state.smsQueries || []).filter(({ at }) => at > now - smsHistoryWindow);
}

function updateSmsQuery(state, id, status) {
  const query = state.smsQueries?.find((entry) => entry.id === id);
  if (query) query.status = status;
}

function groupedSmsQueries(state) {
  const groups = new Map();
  state.smsQueries = recentSmsQueries(state, Date.now());
  for (const { phone, ...query } of state.smsQueries) {
    if (!groups.has(phone)) groups.set(phone, []);
    groups.get(phone).push(query);
  }
  return Array.from(groups, ([phone, queries]) => ({ phone, queries }));
}

function applySmsCommand(state, phone, command, message, now) {
  const entry = state.subscriptions[phone];
  if (command.kind === "verify") {
    const user = Object.values(state.users).find(({ pairing, role }) =>
      role !== "admin" && pairing?.until > now && pairing.phone === phone && pairing.code === hash(command.code));
    if (!user) return "Tagna-Ani: This verification code is invalid or expired.";
    if (Object.values(state.users).some((other) => other !== user && (other.phone === phone || other.pendingPhone === phone))) {
      return "Tagna-Ani: This number is already linked.";
    }
    if (user.phone && user.phone !== phone && state.subscriptions[user.phone]) {
      state.subscriptions[user.phone].subscribed = false;
    }
    user.phone = phone;
    delete user.pendingPhone;
    delete user.pairing;
    delete user.reset;
    return "Tagna-Ani: Your mobile number is verified. Return to the app to continue.";
  }
  if (command.kind === "help") return smsHelp(command.lang);
  if (command.kind === "alerts") {

    if (!entry && command.on) return "Tagna-Ani: Send an advisory request first. " + smsHelp(command.lang);
    if (entry) {
      entry.subscribed = command.on;
      if (command.on && SMS_LANGUAGE_SUFFIX.test(message.trim())) entry.lang = command.lang;
    }
    return command.on ? "Tagna-Ani: Subscribed to 6 AM Philippine-time reminders. Text ANI ALERTS OFF to stop." : "Tagna-Ani: Daily reminders are off.";
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
    if (!current && countAdmins(state) >= adminLimit) throw new Error("The seven administrator slots are in use.");
    if (!current || !matches(password, current.passwordHash)) {
      const id = current?.id || randomUUID();
      for (const [token, session] of Object.entries(state.sessions)) {
        if (session.id === id) delete state.sessions[token];
      }
      state.users[key] = { ...current, id, username, role: "admin", passwordHash: passwordHash(password) };
      if (!current) audit(state, state.users[key], state.users[key], "Created administrator from Render settings");
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
        let command = typeof message === "string" && message.length <= 1000 ? parseSms(message, true) : null;
        const respond = () => {
          if (!twilio) return json(200, { ok: true });
          res.writeHead(200, { "Content-Type": "text/xml", "Cache-Control": "no-store" });
          res.end("<Response/>");
        };
        if (!phone || !command) return respond();
        if (twilio && data.AccountSid !== process.env.TWILIO_ACCOUNT_SID) fail(403, "Unexpected SMS account.");
        limit(`sms:${phone}`, 20, 15 * minute);
        if (command.kind === "lookup") command = await resolveSmsLocation(command);
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
          if (command.kind === "advisory") {
            const { city, locality, crop, problem, lang } = command;
            state.smsQueries = [
              { id: messageId, phone, at: now, city: locality || city, crop, problem, lang, status: "pending" },
              ...recentSmsQueries(state, now).slice(0, smsHistoryLimit - 1),
            ];
          }
          return record;
        });
        if (delivery) {
          try {
            await sendSms(phone, typeof delivery.reply === "string" ? delivery.reply : await advisory(delivery.reply));
          } catch (err) {
            await change((state) => {
              state.messages[messageId].lease = 0;
              updateSmsQuery(state, messageId, "failed");
            });
            throw err;
          }
          await change((state) => {
            const record = state.messages[messageId];
            record.sent = true;
            delete record.reply;
            updateSmsQuery(state, messageId, "accepted");
          });
        }
        return respond();
      }

      if (post && path === "/sms/daily") {
        if (!process.env.SMS_DAILY_SECRET || !equalSecret(req.headers.authorization, `Bearer ${process.env.SMS_DAILY_SECRET}`)) fail(403, "Forbidden.");
        return json(200, await drainSms(change, true));
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
      let reverse;
      let climatePoint;
      let deployHook;
      let drain;
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
        if (path === "/password/first-login" && post && user.mustChangePassword) {
          limit(`first-password:${user.id}`, 10, 15 * minute);
          if (!validPassword(data.password)) fail(400, "Use a password between 12 and 128 characters.");
          if (matches(data.password, user.passwordHash)) fail(400, "Choose a different password.");
          user.passwordHash = passwordHash(data.password);
          delete user.mustChangePassword;
          revoke(state, user.id);
          audit(state, user, user, "Changed temporary password");
          sessionCookie(res, "", 0);
          return { ok: true };
        }
        if (user.mustChangePassword) fail(403, "Change your temporary password before continuing.");
        if (path === "/climate" && post) {
          const { lat, lon } = data;
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 4 || lat > 22 || lon < 116 || lon > 128) {
            fail(400, "Choose a Philippine farm location.");
          }
          limit(`climate:${user.id}`, 30, 15 * minute);
          climatePoint = { lat, lon };
          return {};
        }
        if (path === "/location/reverse" && post) {
          const { lat, lon } = data;
          if (!isPhilippineLand(lat, lon)) fail(400, "Enter coordinates on Philippine land.");
          limit(`reverse:${user.id}`, 12, 15 * minute);
          reverse = { lat, lon };
          return {};
        }
        if (path === "/announcements" && !post) return { items: state.announcements || [] };
        if (path === "/profile/name" && post) {
          const name = shortText(data.name);
          if (name) user.farm = { ...user.farm, name };
          return { ok: true };
        }
        if (path === "/profile" && !post) return { patch: user.farmPatch || null };
        if (path === "/profile" && post) {
          if (user.farmPatch && data.patchVersion !== user.farmPatch.version) {
            fail(409, "An administrator updated your farm details. Reload your profile before saving.");
          }
          const point = data.location;
          const location = point && isPhilippineLand(point.lat, point.lon)
            ? { name: shortText(point.name), province: shortText(point.province), region: shortText(point.region), lat: point.lat, lon: point.lon }
            : user.farm?.location;
          user.farm = { name: shortText(data.name) || user.farm?.name, city: shortText(data.city),
            crop: shortText(data.crop), problem: shortText(data.problem), location };
          syncReminderFarm(state, user);
          if (user.farmPatch) {
            const { patchVersion, location, crops, problems } = data;
            user.farmPatch = { version: patchVersion,
              location: location && isPhilippineLand(location.lat, location.lon)
                ? { name: shortText(location.name), province: shortText(location.province), region: shortText(location.region), lat: location.lat, lon: location.lon }
                : user.farmPatch.location,
              crop: user.farmPatch.crop,
              crops: Array.isArray(crops) ? crops.slice(0, 30).map(shortText).filter(Boolean) : user.farmPatch.crops,
              problem: user.farmPatch.problem,
              problems: Array.isArray(problems) ? problems.slice(0, 30).map(shortText).filter(Boolean) : user.farmPatch.problems,
            };
          }
          return { ok: true };
        }
        if (path === "/phone" && post) {
          if (user.role === "admin") fail(403, "Phone pairing is available for farmer accounts.");
          limit(`phone:${user.id}`, 5, 15 * minute);
          const phone = normalizePhone(data.phone);
          if (!phone) fail(400, "Enter a Philippine mobile number.");
          if (user.pendingPhone && phone !== user.pendingPhone) fail(400, "Verify the number assigned by your administrator first.");
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

          const current = state.subscriptions[user.phone];
          const farm = user.farm;
          if (data.subscribed && !current && !(farm?.city && farm?.crop && farm?.problem)) fail(400, "Complete your farm setup first.");
          if (current || data.subscribed) {
            state.subscriptions[user.phone] = {
              ...current, ...(!current && { city: farm?.city, crop: farm?.crop, problem: farm?.problem,
                lat: farm?.location?.lat, lon: farm?.location?.lon, province: farm?.location?.province }),
              subscribed: data.subscribed,
            };
            if (data.subscribed) syncReminderFarm(state, user);
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
              canDeploy: session.key === ownerKey() && Boolean(process.env.RENDER_DEPLOY_HOOK_URL),
              schedulerConfigured: Boolean(process.env.SMS_DAILY_SECRET),
              subscriberCount: Object.values(state.subscriptions).filter(({ subscribed }) => subscribed).length,
              jobs: summaries(state),
              smsHistory: groupedSmsQueries(state),
              auditLog: state.adminAudit || [],
              adminCount: countAdmins(state),
              adminLimit,
              canCreateAdmins: session.key === ownerKey(),
              users: accounts.map((entry) => ({
                ...publicUser(entry, state),
                phone: entry.phone?.slice(-4) || null,
                pendingPhone: entry.pendingPhone?.slice(-4) || null,
                name: entry.farm?.name || "", location: entry.farm?.location || entry.farmPatch?.location || null,
                city: entry.farm?.city || "", crop: entry.farm?.crop || "", problem: entry.farm?.problem || "",
                online: active.has(entry.id),
              })),
              smsOnly: Object.entries(state.subscriptions)
                .filter(([phone, info]) => info.subscribed && !linked.has(phone))
                .map(([phone, { city, crop, problem }]) => ({ mobileEnding: phone.slice(-4), city, crop, problem })),
            };
          }
          if (path === "/admin/redeploy" && post) {
            if (session.key !== ownerKey()) fail(403, "Only the primary admin can redeploy.");
            if (data.confirm !== "REDEPLOY") fail(400, "Type REDEPLOY to confirm.");
            try {
              deployHook = new URL(process.env.RENDER_DEPLOY_HOOK_URL);
              if (deployHook.origin !== "https://api.render.com" || !deployHook.pathname.startsWith("/deploy/")) throw new Error();
            } catch {
              fail(503, "Configure the Render deploy hook first.");
            }
            if ((state.lastDeployRequest || 0) > Date.now() - 5 * minute) fail(429, "Wait five minutes before requesting another deployment.");
            state.lastDeployRequest = Date.now();
            audit(state, user, { username: "Tagna-Ani" }, "Requested redeploy");
            return { ok: true };
          }
          if (path === "/admin/broadcast" && post) {
            const sms = data.audience === "sms";
            const message = typeof data.message === "string" ? data.message.trim() : "";
            if (!sms && data.audience !== "app") fail(400, "Choose an audience.");
            if (data.confirm !== "SEND" || !message || message.length > (sms ? 700 : 2000)) {
              fail(400, "Enter a message within the limit and type SEND to confirm.");
            }
            limit(`broadcast:${user.id}`, 3, 60 * minute);
            if (sms) {
              if (!process.env.MACRODROID_REPLY_URL && !process.env.TWILIO_FROM_NUMBER) fail(503, "Configure the SMS relay first.");
              if (summaries(state).some(({ kind, pending }) => kind === "broadcast" && pending > 0)) fail(409, "An SMS broadcast is already queued.");
              const job = enqueue(state, "broadcast", message);
              if (!job.recipients.length) fail(400, "There are no SMS reminder subscribers.");
              audit(state, user, { username: "SMS subscribers" }, "Queued SMS broadcast",
                [{ field: "Recipients", after: String(job.recipients.length) }]);
              return { count: job.recipients.length };
            }
            state.announcements = [{ id: randomUUID(), message, at: Date.now() }, ...(state.announcements || []).slice(0, 9)];
            audit(state, user, { username: "All app accounts" }, "Published app announcement");
            return { ok: true };
          }
          if (path === "/admin/broadcast/drain" && post) {
            drain = true;
            return {};
          }
          if (path === "/admin/create" && post) {
            if (session.key !== ownerKey()) fail(403, "Only the primary administrator can create admin accounts.");
            if (countAdmins(state) >= adminLimit) fail(409, "All seven administrator slots are in use.");
            const username = String(data.username ?? "").trim();
            const key = usernameKey(username);
            if (!validUser(username)) fail(400, "Enter a username with 2 to 40 letters, digits, dots, hyphens or underscores.");
            if (Object.hasOwn(state.users, key)) fail(409, "Username already in use.");
            const temporaryPassword = randomBytes(18).toString("base64url");
            const created = { id: randomUUID(), username, role: "admin", mustChangePassword: true,
              passwordHash: passwordHash(temporaryPassword) };
            state.users[key] = created;
            audit(state, user, created, "Created administrator");
            return { username, temporaryPassword };
          }
          if (path === "/admin/edit" && post) {
            const key = usernameKey(data.username);
            const target = Object.hasOwn(state.users, key) && state.users[key];
            if (!target || target.id !== data.userId || target.role !== "user") fail(404, "Farmer account unavailable.");
            updateFarmer(state, user, target, data);
            return { ok: true };
          }
          if (path === "/admin/reset" && post) {
            const key = usernameKey(data.username);
            const target = Object.hasOwn(state.users, key) && state.users[key];
            if (!target?.phone || target.role !== "user") fail(404, "Verified farmer account unavailable.");
            limit(`reset:${target.id}`, 3, 15 * minute);
            const code = String(randomInt(10_000_000, 100_000_000));
            target.reset = { code: hash(code), until: Date.now() + 10 * minute, attempts: 0 };
            resetDelivery = { phone: target.phone, code };
            audit(state, user, target, "Requested password reset SMS");
            return { ok: true };
          }
          if (path === "/admin/delete" && post) {
            const key = usernameKey(data.username);
            const target = Object.hasOwn(state.users, key) && state.users[key];
            if (!target || target.id !== data.userId || target.role === "admin") fail(404, "Farmer account unavailable.");
            if (data.confirm !== target.username) fail(400, "Type the username to confirm deletion.");
            if (target.phone) delete state.subscriptions[target.phone];
            audit(state, user, target, "Deleted farmer account");
            delete state.users[key];
            revoke(state, target.id);
            return { ok: true };
          }
        }
        fail(404, "Route not found.");
      });
      if (climatePoint) return json(200, { climate: await monthlyClimate(climatePoint) });
      if (reverse) return json(200, { location: await reverseLocation(reverse.lat, reverse.lon) });
      if (drain) return json(200, await drainSms(change));
      if (deployHook) {
        const response = await fetch(deployHook, { method: "POST", redirect: "error", signal: AbortSignal.timeout(8000) });
        if (!response.ok) fail(502, "Render did not accept this deploy request.");
      }
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
