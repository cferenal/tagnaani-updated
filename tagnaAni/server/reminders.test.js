import assert from "node:assert/strict";
import test from "node:test";
import { drainSms, enqueue, summaries } from "./reminders.js";

const first = "+639171234567";
const second = "+639171234568";

test("daily queue creates one job per Manila day for opted-in numbers", () => {
  const now = Date.parse("2026-11-20T22:00:00Z");
  const state = { subscriptions: { [first]: { subscribed: true }, [second]: { subscribed: false } } };
  const job = enqueue(state, "daily", "", now);
  assert.equal(job.id, "daily:2026-11-21");
  assert.deepEqual(job.recipients.map(({ phone }) => phone), [first]);
  assert.equal(enqueue(state, "daily", "", now + 60_000), null);
});

test("manual broadcast checks unsubscribe status and spaces out sends", async (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-20T22:00:00Z"));
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url.searchParams.get("reply_number"), first);
    assert.match(url.searchParams.get("reply_text"), /Field update/);
    return new Response("accepted");
  });
  const old = process.env.MACRODROID_REPLY_URL;
  process.env.MACRODROID_REPLY_URL = "https://trigger.macrodroid.com/test/fixture";
  t.after(() => { if (old === undefined) delete process.env.MACRODROID_REPLY_URL; else process.env.MACRODROID_REPLY_URL = old; });
  const state = { subscriptions: { [first]: { subscribed: true }, [second]: { subscribed: true } } };
  enqueue(state, "broadcast", "Field update");
  const change = (update) => update(state);
  state.subscriptions[second].subscribed = false;
  assert.deepEqual(await drainSms(change), { pending: 0, retryAfterMs: 6500, accepted: true });
  const [summary] = summaries(state);
  assert.equal(summary.accepted, 1);
  assert.equal(summary.skipped, 1);
  state.subscriptions[second].subscribed = true;
  enqueue(state, "broadcast", "Later");
  assert.deepEqual(await drainSms(change), { pending: 2, retryAfterMs: 6500 });
});
