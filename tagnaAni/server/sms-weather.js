const cache = new Map();
const monthKeys = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");
const forecastFields = ["temperature_2m", "relative_humidity_2m", "precipitation", "weather_code", "shortwave_radiation"];

async function cachedLookup(key, duration, load) {
  const previous = cache.get(key);
  if (previous?.until > Date.now()) return previous.value;
  const value = load().catch((error) => {
    console.warn("Tagna-Ani SMS data unavailable:", key.split(":")[0], error.code || error.name);
    return null;
  });
  cache.set(key, { value, until: Date.now() + duration });
  if (!await value && cache.get(key)?.value === value) cache.get(key).until = Date.now() + 30_000;
  return value;
}

async function json(url, params, options = {}) {
  const response = await fetch(`${url}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(3400), ...options });
  if (!response.ok) throw Object.assign(new Error("Weather source rejected the request"), { code: `HTTP_${response.status}` });
  return response.json();
}

export async function forecast(location) {
  const { lat, lon, name } = location;
  const open = await cachedLookup(`Open-Meteo:${name}`, 10 * 60_000, async () => {
    const { current, daily } = await json("https://api.open-meteo.com/v1/forecast", {
      latitude: lat, longitude: lon, timezone: "Asia/Manila", forecast_days: 1,
      current: forecastFields.join(","), daily: "precipitation_probability_max",
    });
    if (!current && !daily) return null;
    const weather = {
      temp: current?.temperature_2m, humidity: current?.relative_humidity_2m,
      rain: current?.precipitation, chance: daily?.precipitation_probability_max?.[0],
      radiation: current?.shortwave_radiation, code: current?.weather_code,
    };
    if (!Object.values(weather).some(Number.isFinite)) return null;
    return { ...weather, source: "Open-Meteo" };
  });
  if (open) return open;
  return cachedLookup(`MET Norway:${name}`, 30 * 60_000, async () => {
    const result = await json("https://api.met.no/weatherapi/locationforecast/2.0/compact", {
      lat: lat.toFixed(4), lon: lon.toFixed(4),
    }, { headers: { "User-Agent": "Tagna-Ani/1.0 (tagna.aniapp@gmail.com)" } });
    const first = result.properties?.timeseries?.[0]?.data;
    if (!first) return null;
    return {
      temp: first.instant?.details?.air_temperature, humidity: first.instant?.details?.relative_humidity,
      nextHourRain: first.next_1_hours?.details?.precipitation_amount,
      symbol: first.next_1_hours?.summary?.symbol_code, source: "MET Norway",
    };
  });
}

export function monthlyClimate(location) {
  return cachedLookup(`NASA POWER:${location.name}`, 24 * 60 * 60_000, async () => {
    const result = await json("https://power.larc.nasa.gov/api/temporal/climatology/point", {
      community: "AG", latitude: location.lat, longitude: location.lon,
      parameters: "GWETROOT,PRECTOTCORR,T2M_MAX", format: "JSON",
    }, { signal: AbortSignal.timeout(6000) });
    const variables = result.properties?.parameter;
    if (!variables) return null;
    const extract = (key, min, max) => monthKeys.map((month) => {
      const value = variables[key]?.[month];
      return Number.isFinite(value) && value >= min && value <= max ? value : null;
    });
    const climate = {
      rainBase: extract("PRECTOTCORR", 0, 500),
      tempBase: extract("T2M_MAX", -30, 65),
      gwetBase: extract("GWETROOT", 0, 1),
    };
    return Object.values(climate).some((values) => values.some(Number.isFinite)) ? climate : null;
  });
}
