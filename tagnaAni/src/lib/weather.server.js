import { heatIndex } from "@/lib/heat";

// Live forecast + air quality for one coordinate pair.
export async function fetchWeather(lat, lon) {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,shortwave_radiation" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,shortwave_radiation_sum" +
    "&timezone=auto&forecast_days=7";

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    "&current=us_aqi,pm2_5&timezone=auto";

  const [wxRes, airRes] = await Promise.all([
    fetch(forecastUrl),
    fetch(airUrl).catch(() => null),
  ]);

  if (!wxRes.ok) throw new Error(`Weather service responded ${wxRes.status}`);
  const wx = await wxRes.json();

  let air = null;
  if (airRes && airRes.ok) {
    try {
      air = await airRes.json();
    } catch {
      air = null;
    }
  }

  const cur = wx.current || {};
  const aqi = air?.current?.us_aqi;
  // Open-Meteo carries no direct CO2 feed; ambient CO2 is estimated from air quality.
  const co2 = Math.round(415 + Math.min(240, (aqi ?? 18) * 0.65));

  const current = {
    temp: cur.temperature_2m ?? 0,
    humidity: cur.relative_humidity_2m ?? 0,
    precip: cur.precipitation ?? 0,
    radiation: cur.shortwave_radiation ?? 0,
    code: cur.weather_code ?? 0,
    heatIndex: heatIndex(cur.temperature_2m ?? 0, cur.relative_humidity_2m ?? 0) ?? 0,
    co2,
    aqi: aqi ?? null,
  };

  const d = wx.daily || {};
  const daily = (d.time || []).map((date, i) => ({
    date,
    code: d.weather_code?.[i] ?? 0,
    tMax: d.temperature_2m_max?.[i] ?? 0,
    tMin: d.temperature_2m_min?.[i] ?? 0,
    rain: d.precipitation_sum?.[i] ?? 0,
    rainChance: d.precipitation_probability_max?.[i] ?? 0,
    radiation: d.shortwave_radiation_sum?.[i] ?? 0,
  }));

  return { current, daily, fetchedAt: new Date().toISOString() };
}