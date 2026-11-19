import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhone, parseSms } from "./sms.js";

test("only ANI as the first complete token can start an SMS command", () => {
  for (const text of ["Please ANI 9200 RICE DROUGHT", "ANIMAL 9200 RICE DROUGHT", "HELP", "ANI: 9200 RICE DROUGHT"]) {
    assert.equal(parseSms(text), null);
  }
  assert.equal(parseSms("  ani 9200 RICE DROUGHT  ").kind, "advisory");
});

test("advisories require supported location, current crop and complete problem", () => {
  assert.equal(parseSms("ANI 9200 RICE TAG").kind, "help");
  assert.equal(parseSms("ANI 0000 RICE DROUGHT").kind, "help");
  assert.deepEqual(parseSms("ANI Iligan City | Sweet potato | Yellow leaves BIS"), {
    kind: "advisory", city: "Iligan City", crop: "Sweet potato",
    problem: "Yellow leaves", lang: "BIS",
  });
});

test("SMS uses Philippine mobile numbers and never substitutes a default sender", () => {
  assert.equal(normalizePhone("0917 123 4567"), "+639171234567");
  assert.equal(normalizePhone("639171234567"), "+639171234567");
  assert.equal(normalizePhone("+639171234567"), "+639171234567");
  assert.equal(normalizePhone("+12025550123"), null);
  assert.equal(normalizePhone(""), null);
});
