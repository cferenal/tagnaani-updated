import assert from "node:assert/strict";
import test from "node:test";
import { advisory, normalizePhone, parseSms, smsHelp } from "./sms.js";

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

test("ANI HELP uses short and full language names and includes the supported lists", () => {
  for (const [command, lang, heading] of [
    ["ANI HELP BIS", "BIS", "Mga tanom"],
    ["ANI HELP BISAYA", "BIS", "Mga tanom"],
    ["ANI HELP TAGALOG", "TAG", "Mga pananim"],
    ["ANI HELP ENGLISH", "ENG", "Crop presets"],
  ]) {
    assert.deepEqual(parseSms(command), { kind: "help", lang });
    assert.ok(smsHelp(lang).includes(heading));
    assert.ok(smsHelp(lang).includes("Sweet potato"));
  }
  assert.match(smsHelp(), /Pest infestation.*High input costs/);
  assert.equal(parseSms("ANI 9200 CORN DROUGHT TAGALOG").lang, "TAG");
});

test("advisory formats real, partial, and unavailable provider data without sample values", async (t) => {
  const months = Object.fromEntries("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ").map((key) => [key, 7]));
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    const lat = Number(url.searchParams.get("latitude") || url.searchParams.get("lat"));
    if (lat === 7.4478 && url.hostname === "api.open-meteo.com") {
      return Response.json({ current: { temperature_2m: 29, relative_humidity_2m: 85, shortwave_radiation: 350, weather_code: 2 },
        daily: { precipitation_probability_max: [75] } });
    }
    if (lat === 7.4478 && url.hostname === "power.larc.nasa.gov") {
      const values = (value) => Object.fromEntries(Object.keys(months).map((key) => [key, value]));
      return Response.json({ properties: { parameter: {
        PRECTOTCORR: months, T2M_MAX: values(29), GWETROOT: values(0.62),
      } } });
    }
    if (lat === 8.228 && url.hostname === "api.met.no") {
      return Response.json({ properties: { timeseries: [{ data: {
        instant: { details: { air_temperature: 27, relative_humidity: 80 } },
      } }] } });
    }
    return new Response(null, { status: 503 });
  });
  const tagum = await advisory(parseSms("ANI 8100 RICE DROUGHT BISAYA"));
  assert.match(tagum, /^Maayong adlaw, Ka-Ani!/);
  assert.match(tagum, /Tagum City, Davao del Norte/);
  assert.match(tagum, /Radiation sa adlaw: 350 W\/m\^2/);
  assert.match(tagum, /62% \(binulang aberids\)/);
  assert.match(tagum, /rotasyon: .* -> /);
  assert.match(tagum, /CO2: wala masukod/);
  const iligan = await advisory(parseSms("ANI 9200 CORN DROUGHT"));
  assert.match(iligan, /Temperature: 27 C/);
  assert.match(iligan, /Precipitation: unavailable/);
  assert.match(iligan, /MET Norway/);
  const mati = await advisory(parseSms("ANI 8200 RICE DROUGHT"));
  assert.match(mati, /Mati City, Davao Oriental/);
  assert.match(mati, /Temperature: unavailable/);
  assert.match(mati, /Farm advice/);
  assert.doesNotMatch(mati, /420|350|68%/);
});

test("advisory syntax accepts one or two pipes and preserves a barangay prefix", () => {
  const expected = { kind: "advisory", city: "Iligan City", crop: "Rice (palay)", problem: "drought", lang: "ENG" };
  assert.deepEqual(parseSms("ani iligan city | rice drought"), expected);
  assert.deepEqual(parseSms("ANI Iligan City | rice | drought"), expected);
  for (const divider of [" ", " | "]) {
    assert.deepEqual(parseSms(`ani bagong silang iligan city | rice${divider}drought`),
      { ...expected, locality: "bagong silang iligan city" });
  }
  assert.equal(parseSms("bagong silang iligan city | rice | drought"), null);
  assert.equal(parseSms("ANI constructor RICE DROUGHT").kind, "help");
  assert.equal(parseSms("ANI 9200 | sweet potato yellow leaves").crop, "Sweet potato");
  assert.equal(smsHelp("BIS").includes("\n\nMga tanom:"), true);
  assert.equal(smsHelp("BIS").includes("\n\nKasagarang problema sa uma:"), true);
  assert.equal(smsHelp("ENG").includes("\n\nCrop presets:"), true);
  assert.equal(smsHelp("TAG").includes("\n\nKaraniwang problema sa bukid:"), true);
});
