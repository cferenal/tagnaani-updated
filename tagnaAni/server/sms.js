import { createHmac, timingSafeEqual } from "node:crypto";
import { CROPS, PROBLEMS, MINDANAO_LOCATIONS, MINDANAO_POSTAL_CODES } from "../src/lib/farmData.js";

export { advisory } from "./sms-advisory.js";

const languageCodes = { ENG: "ENG", ENGLISH: "ENG", BIS: "BIS", BISAYA: "BIS", TAG: "TAG", TAGALOG: "TAG" };
export const SMS_LANGUAGE_SUFFIX = /\s+(BISAYA|BIS|TAGALOG|TAG|ENGLISH|ENG)$/i;

const helpCopy = {
  ENG: ["Text ANI <ZIP/CITY> <CROP> <PROBLEM>.", "Example", "For names with spaces", "Crop presets", "Common farm problems", "You can describe other problems in your own words."],
  BIS: ["I-text ang ANI <ZIP/SYUDAD> <TANOM> <PROBLEMA>.", "Pananglitan", "Para sa ngalan nga adunay espasyo", "Mga tanom", "Kasagarang problema sa uma", "Pwede nimong ihulagway ang ubang problema sa kaugalingong mga pulong."],
  TAG: ["I-text ang ANI <ZIP/LUNGSOD> <PANANIM> <PROBLEMA>.", "Halimbawa", "Kung may espasyo sa pangalan", "Mga pananim", "Karaniwang problema sa bukid", "Puwede mong ilarawan ang iba pang problema sa sarili mong salita."],
};
const problemLabels = {
  BIS: ["Peste", "Ubos nga ani", "Dili matag-an nga panahon", "Katambok sa yuta", "Tubig / irigasyon", "Taas nga gasto sa mga gamit sa uma"],
  TAG: ["Peste", "Mababang ani", "Pabago-bagong panahon", "Taba ng lupa", "Tubig / irigasyon", "Mataas na gastos sa pagsasaka"],
};

export function smsHelp(lang = "ENG") {
  const [format, example, spaces, crops, problems, other] = helpCopy[lang] || helpCopy.ENG;
  return [
    format,
    `${example}: ANI 9200 RICE DROUGHT`,
    `${spaces}: ANI Iligan City | Sweet potato | Pest infestation`,
    `${crops}: ${CROPS.join(", ")}`,
    `${problems}: ${(problemLabels[lang] || PROBLEMS).join(", ")}`,
    other,
  ].join("\n");
}

export function normalizePhone(value) {
  let number = String(value ?? "").trim().replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(number)) number = "+63" + number.slice(1);
  if (/^639\d{9}$/.test(number)) number = "+" + number;
  return /^\+639\d{9}$/.test(number) ? number : null;
}

export function parseSms(message) {
  const match = String(message ?? "").trim().match(/^ANI(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  let body = match[1]?.trim() || "";
  const lang = languageCodes[body.match(SMS_LANGUAGE_SUFFIX)?.[1].toUpperCase()] || "ENG";
  body = body.replace(SMS_LANGUAGE_SUFFIX, "").trim();
  if (/^HELP$/i.test(body)) return { kind: "help", lang };
  if (/^ALERTS (ON|OFF)$/i.test(body)) return { kind: "alerts", on: /ON$/i.test(body), lang };
  if (/^VERIFY \d{8}$/i.test(body)) return { kind: "verify", code: body.slice(-8) };

  const pipe = body.split("|").map((part) => part.trim());
  const words = body.split(/\s+/);
  const [place, rawCrop, problem] = pipe.length === 3
    ? pipe
    : [words[0], words[1], words.slice(2).join(" ")];
  const city = MINDANAO_POSTAL_CODES[place] || place?.replaceAll("_", " ");
  const location = MINDANAO_LOCATIONS.find(({ name }) =>
    name.toLowerCase() === city?.toLowerCase() ||
    name.toLowerCase().replace(/ city$/, "") === city?.toLowerCase());
  if (!location || !rawCrop || !problem || /\|/.test(problem) || message.length > 480) return { kind: "help", lang };
  const cropKey = rawCrop.replaceAll("_", " ").toLowerCase();
  const crop = /^rice$|^palay$/i.test(cropKey) ? "Rice (palay)"
    : CROPS.find((name) => name.toLowerCase() === cropKey) || rawCrop.replaceAll("_", " ");
  return { kind: "advisory", city: location.name, crop, problem, lang };
}

export function equalSecret(value, expected) {
  if (!value || !expected) return false;
  const a = Buffer.from(String(value));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyTwilio(signature, publicUrl, data, authToken) {
  if (!authToken || !publicUrl) return false;
  const value = Object.keys(data).sort().reduce((all, key) => all + key + data[key], publicUrl);
  return equalSecret(signature, createHmac("sha1", authToken).update(value).digest("base64"));
}

export async function sendSms(phone, message) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from,
    MACRODROID_REPLY_URL: macro } = process.env;
  let response;
  const signal = AbortSignal.timeout(7000);
  if (sid && token && from) {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") },
      body: new URLSearchParams({ To: phone, From: from, Body: message }),
      signal,
    });
  } else if (macro) {
    const url = new URL(macro);
    if (url.protocol !== "https:" || url.hostname !== "trigger.macrodroid.com") throw new Error("Invalid SMS relay configuration.");
    url.searchParams.set("reply_number", phone);
    url.searchParams.set("reply_text", message);
    response = await fetch(url, { signal, redirect: "error" });
  } else {
    throw new Error("No outbound SMS transport configured.");
  }
  if (!response.ok) {
    throw Object.assign(new Error("SMS provider rejected the request."), { code: `SMS_HTTP_${response.status}` });
  }
}
