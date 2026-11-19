import { createHmac, timingSafeEqual } from "node:crypto";
import { CROPS, MINDANAO_LOCATIONS } from "../src/lib/farmData.js";

const postal = {
  8000: "Davao City", 8100: "Tagum City", 8002: "Digos City", 8105: "Panabo City",
  8200: "Mati City", 9500: "General Santos City", 9506: "Koronadal City",
  9400: "Kidapawan City", 9800: "Tacurong City", 9000: "Cagayan de Oro",
  9200: "Iligan City", 8700: "Malaybalay City", 8703: "Manolo Fortich",
  8709: "Valencia City", 9014: "Gingoog City", 7200: "Ozamiz City",
  7000: "Zamboanga City", 7100: "Dipolog City", 7016: "Pagadian City",
  9600: "Cotabato City", 9700: "Marawi City", 8600: "Butuan City", 8400: "Surigao City",
};

export const SMS_HELP = "Text ANI <ZIP/CITY> <CROP> <PROBLEM>. Example: ANI 9200 RICE DROUGHT. For multi-word names: ANI Iligan City | Sweet potato | Yellow leaves.";

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
  const lang = body.match(/\s+(BIS|TAG|ENG)$/i)?.[1].toUpperCase() || "ENG";
  body = body.replace(/\s+(BIS|TAG|ENG)$/i, "").trim();
  if (/^HELP$/i.test(body)) return { kind: "help" };
  if (/^ALERTS (ON|OFF)$/i.test(body)) return { kind: "alerts", on: /ON$/i.test(body), lang };
  if (/^VERIFY \d{8}$/i.test(body)) return { kind: "verify", code: body.slice(-8) };

  const pipe = body.split("|").map((part) => part.trim());
  const words = body.split(/\s+/);
  const [place, rawCrop, problem] = pipe.length === 3
    ? pipe
    : [words[0], words[1], words.slice(2).join(" ")];
  const city = postal[place] || place?.replaceAll("_", " ");
  const location = MINDANAO_LOCATIONS.find(({ name }) =>
    name.toLowerCase() === city?.toLowerCase() ||
    name.toLowerCase().replace(/ city$/, "") === city?.toLowerCase());
  if (!location || !rawCrop || !problem || /\|/.test(problem) || message.length > 480) return { kind: "help" };
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

export async function advisory({ city, crop, problem, lang }) {
  const location = MINDANAO_LOCATIONS.find(({ name }) => name === city);
  const head = `Tagna-Ani | ${city} | ${crop} | ${problem}`;
  const words = {
    ENG: ["Today's high", "chance of rain", "Live weather is unavailable. Check local conditions before field work."],
    TAG: ["Pinakamataas ngayon", "posibilidad ng ulan", "Walang live na datos ng panahon. Suriin muna ang lagay sa bukid."],
    BIS: ["Kinatas-ang temperatura karon", "posibilidad sa ulan", "Walay live nga datos sa panahon. Susiha una ang kahimtang sa uma."],
  }[lang] || ["Today's high", "chance of rain", "Live weather is unavailable."];
  if (location) {
    try {
      const query = new URLSearchParams({
        latitude: location.lat, longitude: location.lon, forecast_days: 1,
        daily: "temperature_2m_max,precipitation_probability_max", timezone: "Asia/Manila",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const { daily } = await response.json();
        const temperature = daily?.temperature_2m_max?.[0];
        const rain = daily?.precipitation_probability_max?.[0];
        if (Number.isFinite(temperature) && Number.isFinite(rain)) {
          const issue = String(problem);
          const advice = /drought|dry|init|tagtuyot/i.test(issue)
            ? { ENG: "Check root-zone moisture before irrigating.", TAG: "Suriin ang halumigmig ng lupa bago magpatubig.", BIS: "Susiha ang kaumog sa yuta sa dili pa magpatubig." }
            : /flood|baha|rain/i.test(issue)
              ? { ENG: "Inspect drainage and avoid working in flooded areas.", TAG: "Suriin ang daluyan ng tubig at iwasan ang binahang lugar.", BIS: "Susiha ang agianan sa tubig ug likayi ang nabahaan nga dapit." }
              : { ENG: "Inspect affected plants and ask your local agriculture office for crop-specific advice.", TAG: "Suriin ang apektadong halaman at magtanong sa lokal na tanggapan ng agrikultura.", BIS: "Susiha ang apektadong tanom ug pangutana sa lokal nga opisina sa agrikultura." };
          return `${head}\n${words[0]} ${Math.round(temperature)} C, ${Math.round(rain)}% ${words[1]}. ${advice[lang] || advice.ENG}`;
        }
      }
    } catch {
      // Report missing observations instead of substituting example weather.
    }
  }
  return `${head}\n${words[2]}`;
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
