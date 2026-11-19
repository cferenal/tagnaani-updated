import { randomUUID } from "node:crypto";
import { advisory, sendSms } from "./sms.js";

const pacingMs = 6500;
const leaseMs = 45_000;
const ttl = 24 * 60 * 60_000;
const stamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
});

export function enqueue(state, kind, message = "", now = Date.now()) {
  state.smsJobs = (state.smsJobs || []).filter((job) => job.createdAt > now - ttl);
  const id = kind === "daily" ? `daily:${stamp.format(now).split(",")[0]}` : randomUUID();
  if (state.smsJobs.some((job) => job.id === id)) return null;
  const recipients = Object.entries(state.subscriptions)
    .filter(([, info]) => info.subscribed)
    .map(([phone]) => ({ phone, attempts: 0 }));
  const job = { id, kind, message, createdAt: now, recipients };
  state.smsJobs.push(job);
  return job;
}

export function summaries(state) {
  return (state.smsJobs || []).filter((job) => job.createdAt > Date.now() - ttl).map(({ id, kind, recipients }) => ({
    id, kind, total: recipients.length,
    pending: recipients.filter((entry) => !entry.status).length,
    accepted: recipients.filter(({ status }) => status === "accepted").length,
    failed: recipients.filter(({ status }) => status === "failed").length,
    skipped: recipients.filter(({ status }) => status === "skipped").length,
  }));
}

export async function drainSms(change, schedule = false) {
  const claim = await change((state) => {
    const now = Date.now();
    if (schedule && Number(stamp.formatToParts(now).find(({ type }) => type === "hour").value) >= 6) {
      enqueue(state, "daily", "", now);
    }
    const pending = [];
    for (const job of state.smsJobs || []) {
      if (job.createdAt <= now - ttl || (!schedule && job.kind === "daily")) continue;
      for (const entry of job.recipients) {
        if (!entry.status && !state.subscriptions[entry.phone]?.subscribed) entry.status = "skipped";
        if (!entry.status) pending.push({ job, entry });
      }
    }
    if (!pending.length) return { pending: 0 };
    const lockedUntil = Math.max(state.smsPacingUntil || 0, state.smsLease?.until || 0);
    if (lockedUntil > now) return { pending: pending.length, retryAfterMs: lockedUntil - now };
    const next = pending.find(({ entry }) => !entry.retryAt || entry.retryAt <= now);
    if (!next) return { pending: pending.length, retryAfterMs: 10_000 };
    const { job, entry } = next;
    const token = randomUUID();
    state.smsLease = { token, until: now + leaseMs };
    entry.attempts++;
    return { token, jobId: job.id, phone: entry.phone, kind: job.kind, message: job.message,
      subscription: state.subscriptions[entry.phone], pending: pending.length };
  });
  if (!claim.token) return claim;

  let accepted = false;
  try {
    const body = claim.kind === "daily" ? await advisory(claim.subscription) : claim.message;
    await sendSms(claim.phone, body + "\nANI ALERTS OFF to stop.");
    accepted = true;
  } catch (error) {
    console.warn("Tagna-Ani reminder relay failed:", error.code || error.name);
  }
  return change((state) => {
    if (state.smsLease?.token !== claim.token) return { pending: claim.pending, retryAfterMs: pacingMs };
    delete state.smsLease;
    const now = Date.now();
    state.smsPacingUntil = now + pacingMs;
    const entry = state.smsJobs?.find(({ id }) => id === claim.jobId)?.recipients.find(({ phone }) => phone === claim.phone);
    if (entry) {
      if (accepted) entry.status = "accepted";
      else if (entry.attempts >= 3) entry.status = "failed";
      else entry.retryAt = now + 30_000;
    }
    return { pending: summaries(state).filter(({ kind }) => schedule || kind !== "daily")
      .reduce((total, job) => total + job.pending, 0), retryAfterMs: pacingMs, accepted };
  });
}
