import { MINDANAO_LOCATIONS } from "../src/lib/farmData.js";

const cache = new Map();
let lastRequest = 0;

export async function reverseLocation(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  // Only resolve on explicit user action. Share the public provider's rate limit.
  if (Date.now() - lastRequest >= 1100) {
    lastRequest = Date.now();
    try {
      const parameters = new URLSearchParams({
        lat: lat.toFixed(4), lon: lon.toFixed(4), format: "jsonv2", zoom: "14", "accept-language": "en",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${parameters}`, {
        headers: { "User-Agent": "Tagna-Ani/1.0 (tagna.aniapp@gmail.com)" },
        signal: AbortSignal.timeout(4500),
      });
      if (response.ok) {
        const { address } = await response.json();
        const named = address?.city || address?.town || address?.municipality || address?.village;
        if (address?.country_code === "ph" && named) {
          const result = { name: named, province: address.state_district || "", region: address.region || "", source: "OpenStreetMap" };
          if (cache.size >= 500) cache.delete(cache.keys().next().value);
          cache.set(key, result);
          return result;
        }
      }
    } catch {
      // Use a nearby named city only when the point is within a small radius.
    }
  }
  const [place, distance] = MINDANAO_LOCATIONS.reduce(([best, min], candidate) => {
    const delta = Math.hypot(lat - candidate.lat, (lon - candidate.lon) * Math.cos(lat * Math.PI / 180));
    return delta < min ? [candidate, delta] : [best, min];
  }, [null, Infinity]);
  return distance < 0.08 ? { name: `Near ${place.name}`, province: place.province, region: place.region } : null;
}
