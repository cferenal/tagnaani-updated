import { MINDANAO_LOCATIONS } from "../src/lib/farmData.js";
import { buildCropAssumptions, buildMonthlyRotation } from "../src/lib/cropRotation.js";
import { heatIndex } from "../src/lib/heat.js";
import { forecast, monthlyClimate } from "./sms-weather.js";

const copy = {
  ENG: {
    crop: "Your current crop", problem: "Your number 1 problem", weather: "Weather",
    greeting: "Good day, Ka-Ani!", local: "Farm conditions in", temp: "Temperature", heat: "Heat index",
    humidity: "Humidity", rain: "Precipitation", rainChance: "% chance today", now: "now", nextHour: "in the next hour",
    solar: "Solar radiation", unavailable: "unavailable", historical: "monthly average",
    root: "NASA root-zone wetness index", advice: "Farm advice", rotation: "18-month rotation option",
    reminder: "Reminder: Use this as a guide. Rely on your expertise and check actual field conditions before acting.",
    drought: "Check root-zone soil moisture before irrigating.",
    flood: "Inspect drainage and avoid working in flooded areas.",
    general: "Inspect affected plants and ask your local agriculture office for crop-specific advice.",
    cornWet: "Move drying corn under cover before it gets wet.",
    cornDry: "If the drying surface is dry, spread the corn outside and watch for sudden showers.",
    wet: "Delay fertilizer application or spraying if rain is imminent.",
    conditions: ["clear", "partly cloudy", "overcast", "fog", "rain", "thunderstorm"],
  },
  BIS: {
    crop: "Imong tanom karon", problem: "Imong nag-unang problema", weather: "Panahon",
    greeting: "Maayong adlaw, Ka-Ani!", local: "Mga kondisyon sa uma sa", temp: "Temperatura", heat: "Heat index",
    humidity: "Kaumog sa hangin", rain: "Ulan", rainChance: "% posibilidad karon", now: "karon", nextHour: "sa sunod oras",
    solar: "Radiation sa adlaw", unavailable: "walay datos", historical: "binulang aberids",
    root: "NASA indeks sa kaumog sa dapit sa gamot", advice: "Tambag sa uma", rotation: "Opsiyon sa 18-bulan nga rotasyon",
    reminder: "Pahinumdom: Giya ra kini. Gamita ang inyong kasinatian ug susiha ang aktuwal nga kahimtang sa uma.",
    drought: "Susiha ang kaumog sa yuta duol sa gamot sa dili pa magpatubig.",
    flood: "Susiha ang agianan sa tubig ug likayi ang pagbuhat sa binahang lugar.",
    general: "Susiha ang apektadong tanom ug pangutana sa lokal nga opisina sa agrikultura.",
    cornWet: "Ibalhin sa silong ang gibulad nga mais aron dili mabasa.",
    cornDry: "Kon uga ang bularan, ibulad ang mais ug bantayi ang kalit nga ulan.",
    wet: "Ipalangan ang pag-abono o pag-spray kon duol nang moulan.",
    conditions: ["hayag", "medyo dag-om", "dag-om", "gabon", "ulan", "dalugdog"],
  },
  TAG: {
    crop: "Kasalukuyan mong pananim", problem: "Pangunahing problema mo", weather: "Panahon",
    greeting: "Magandang araw, Ka-Ani!", local: "Kalagayan ng bukid sa", temp: "Temperatura", heat: "Heat index",
    humidity: "Halumigmig", rain: "Pag-ulan", rainChance: "% posibilidad ngayong araw", now: "ngayon", nextHour: "sa susunod na oras",
    solar: "Radyasyon ng araw", unavailable: "walang datos", historical: "buwanang average",
    root: "NASA index ng halumigmig sa sona ng ugat", advice: "Payo sa bukid", rotation: "Opsiyon sa 18-buwang pag-ikot ng pananim",
    reminder: "Paalala: Gabay lamang ito. Gamitin ang inyong karanasan at suriin ang aktuwal na kalagayan ng bukid.",
    drought: "Suriin ang halumigmig ng lupa sa paligid ng ugat bago magpatubig.",
    flood: "Suriin ang daluyan ng tubig at iwasang magtrabaho sa binahang lugar.",
    general: "Suriin ang apektadong halaman at magtanong sa lokal na tanggapan ng agrikultura.",
    cornWet: "Ilipat sa silong ang binibilad na mais bago ito mabasa.",
    cornDry: "Kung tuyo ang bilaran, ibilad ang mais at bantayan ang biglaang ulan.",
    wet: "Ipagpaliban ang pag-abono o pag-spray kung malapit nang umulan.",
    conditions: ["maaliwalas", "bahagyang maulap", "maulap", "mahamog", "maulan", "may pagkulog"],
  },
};
const number = (value) => Number.isFinite(value);

function conditionIndex({ code, symbol }) {
  if (number(code)) {
    if (code === 0) return 0;
    if (code <= 2) return 1;
    if (code === 3) return 2;
    if (code === 45 || code === 48) return 3;
    if (code >= 95) return 5;
    if (code >= 51) return 4;
  }
  if (/thunder/.test(symbol)) return 5;
  if (/rain/.test(symbol)) return 4;
  if (/fog/.test(symbol)) return 3;
  if (/partlycloudy|fair/.test(symbol)) return 1;
  if (/cloudy/.test(symbol)) return 2;
  if (/clearsky/.test(symbol)) return 0;
  return null;
}

function rotationOption(climate, crop, start) {
  if (!climate || ![...climate.rainBase, ...climate.tempBase].every(number)) return null;
  const assumptions = buildCropAssumptions([crop]).filter(({ family }) => family !== "custom");
  const { scenarios } = buildMonthlyRotation({ ...climate, start, irrigated: false, cropAssumptions: assumptions });
  const names = scenarios[0].months
    .filter(({ action }) => action === "Plant / establish")
    .map(({ crop: name }) => name)
    .slice(0, 3);
  return names.length >= 2 ? names.join(" -> ") : null;
}

export async function advisory({ city, locality, crop, problem, lang, lat, lon, province }) {
  const words = copy[lang] || copy.ENG;
  const location = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, name: city, province }
    : MINDANAO_LOCATIONS.find(({ name }) => name === city);
  const [weather, climate] = location ? await Promise.all([forecast(location), monthlyClimate(location)]) : [null, null];
  const wx = weather || {};
  const localMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit",
  }).formatToParts();
  const month = localMonth.find(({ type }) => type === "month").value;
  const year = localMonth.find(({ type }) => type === "year").value;
  const wetness = climate?.gwetBase[Number(month) - 1];
  const heat = number(wx.temp) && number(wx.humidity) ? heatIndex(wx.temp, wx.humidity) : null;
  const amount = number(wx.rain) ? `${wx.rain} mm ${words.now}` :
    number(wx.nextHourRain) ? `${wx.nextHourRain} mm ${words.nextHour}` : null;
  const chance = number(wx.chance) ? `${Math.round(wx.chance)}${words.rainChance}` : null;
  const tip = /drought|dry|init|tagtuyot|hulaw/i.test(problem) ? words.drought :
    /flood|baha|rain|ulan/i.test(problem) ? words.flood : words.general;
  const show = (value, unit) => number(value) ? `${Math.round(value)}${unit}` : words.unavailable;
  const rotation = rotationOption(climate, crop, `${year}-${month}`);
  const wet = wx.chance >= 65 || wx.rain > 0 || wx.nextHourRain > 0;
  const dry = number(wx.chance) && wx.chance <= 15 && wx.rain === 0;
  const corn = /^(corn|mais)$/i.test(crop);
  const weatherAdvice = corn && wet ? words.cornWet : corn && dry ? words.cornDry : wet ? words.wet : "";
  const weatherNote = words.conditions[conditionIndex(wx)];
  const generated = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  }).format(new Date());
  return [
    words.greeting,
    "",
    `${words.local} ${[locality || city, location?.province].filter(Boolean).join(", ")}.`,
    locality ? `${words.weather}: ${city}` : null,
    `${words.crop}: ${crop}`,
    `${words.problem}: ${problem}`,
    "",
    `${words.temp}: ${show(wx.temp, " C")}`,
    `${words.heat}: ${show(heat, " C")}`,
    `${words.humidity}: ${show(wx.humidity, "%")}`,
    `${words.rain}: ${[amount, chance].filter(Boolean).join("; ") || words.unavailable}`,
    `${words.solar}: ${show(wx.radiation, " W/m^2")}${weatherNote ? `, ${weatherNote}` : ""}`,
    `${words.root}: ${number(wetness) ? `${Math.round(wetness * 100)}% (${words.historical})` : words.unavailable}`,
    "",
    `${words.advice}: ${tip}${weatherAdvice ? " " + weatherAdvice : ""}`,
    `${words.rotation}: ${rotation || words.unavailable}`,
    "",
    words.reminder,
    "",
    `Powered by Tagna-Ani App (Generated: ${generated} PHT)`,
  ].filter((line) => line != null).join("\n");
}
