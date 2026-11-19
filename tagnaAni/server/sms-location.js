import { lookupLocations } from "../src/lib/locations.js";

const lookups = new Map();
const normalize = (text) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "")
  .toLowerCase().trim().replace(/\s+/g, " ");
const variants = (name) => [normalize(name), normalize(name).replace(/ city$/, "")];

async function findPlace(place) {
  const pieces = place.split(",").map((part) => part.trim()).filter(Boolean);
  const [locality, province] = pieces;
  if (!locality || pieces.length > 2) return null;
  const words = locality.split(/\s+/);
  const queries = [...new Set([locality, words.slice(-3).join(" "), words.slice(-2).join(" "), words.at(-1)])]
    .filter((query) => query.length >= 3);
  const signal = AbortSignal.timeout(2800);
  const matches = await Promise.all(queries.map(async (query) => {
    try {
      let options = await lookupLocations(query, signal);
      if (!/^\d{4}$/.test(query)) {
        const names = variants(query);
        options = options.filter(({ name }) => variants(name).some((value) => names.includes(value)));
      }
      if (province) options = options.filter((option) => [option.province, option.region]
        .some((value) => value && normalize(value) === normalize(province)));
      return options.length === 1 ? { ...options[0], query } : null;
    } catch {
      return null;
    }
  }));
  return matches.find(Boolean) || null;
}

export async function resolveSmsLocation({ place, crop, problem, lang }) {
  const key = normalize(place);
  let entry = lookups.get(key);
  if (!entry || entry.until <= Date.now()) {
    if (lookups.size >= 200 && !lookups.has(key)) lookups.delete(lookups.keys().next().value);
    const value = findPlace(place);
    entry = { value, until: Date.now() + 3600000 };
    lookups.set(key, entry);
    if (!await value) entry.until = Date.now() + 30000;
  }
  const location = await entry.value;
  if (!location) return { kind: "help", lang };
  return { kind: "advisory", city: location.name, crop, problem, lang, lat: location.lat, lon: location.lon,
    province: location.province, ...(key !== normalize(location.query) && { locality: place }) };
}
