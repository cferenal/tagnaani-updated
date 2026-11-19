import land from "./philippines-land.json" with { type: "json" };
import { MINDANAO_LOCATIONS, MINDANAO_POSTAL_CODES } from "./farmData.js";

function insideRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

// Natural Earth 1:50m Philippine land boundary via world-atlas, public domain.
export function isPhilippineLand(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    land.some(([outer, ...holes]) => insideRing(lon, lat, outer) &&
      !holes.some((hole) => insideRing(lon, lat, hole)));
}

export function savedLocation(profile) {
  if (!profile?.city) return null;
  const existing = MINDANAO_LOCATIONS.find(({ name }) => name === profile.city);
  const lat = profile.latitude ?? existing?.lat;
  const lon = profile.longitude ?? existing?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { name: profile.city, province: profile.province, region: profile.region, lat, lon };
}

export function localLocations(query) {
  const q = query.trim().toLowerCase();
  const postal = MINDANAO_POSTAL_CODES[q];
  return MINDANAO_LOCATIONS.filter((place) => postal
    ? postal === place.name
    : [place.name, place.province, place.region].some((label) => label.toLowerCase().includes(q)));
}

export async function lookupLocations(query, signal) {
  const terms = query.split(",").map((term) => term.trim()).filter(Boolean);
  const postal = query.match(/\b\d{4}\b/)?.[0];
  const attempts = [...new Set([query, postal, ...terms].filter(Boolean))];
  for (const name of attempts) {
    const params = new URLSearchParams({ name, count: "12", language: "en", countryCode: "PH" });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
    if (!response.ok) throw new Error("Location search is unavailable.");
    const { results = [] } = await response.json();
    const options = results.filter((item) => item.country_code === "PH" &&
      (!/^\d{4}$/.test(name) || item.postcodes?.includes(name)) &&
      Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map((item) => ({
        name: item.name, province: item.admin2, region: item.admin1,
        lat: item.latitude, lon: item.longitude,
      }));
    if (options.length) return options;
  }
  return [];
}
