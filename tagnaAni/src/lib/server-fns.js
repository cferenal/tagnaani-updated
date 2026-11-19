import { tagnaRequest } from "@/api/base44Client";
import { buildCropAssumptions, buildMonthlyRotation } from "@/lib/cropRotation";
import { heatIndex } from "@/lib/heat";

const API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Bantay-Local": "1",
};

export { buildCropAssumptions };

export async function getFarmWeather({ data }) {
  const lat = Number(data?.lat ?? 8.2289);
  const lon = Number(data?.lon ?? 124.2434);

  // 1. Try local Python backend first
  try {
    if (!API_BASE) throw new Error("Local backend is disabled.");
    const res = await fetch(`${API_BASE}/tagna-weather`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ lat, lon }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    /* fallback to direct Open-Meteo below */
  }

  // 2. Direct browser call to Open-Meteo
  try {
    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,shortwave_radiation" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,shortwave_radiation_sum" +
      "&timezone=Asia%2FManila&forecast_days=7";

    const wxRes = await fetch(forecastUrl);
    if (wxRes.ok) {
      const wx = await wxRes.json();
      const cur = wx.current || {};
      const d = wx.daily || {};
      const temp = cur.temperature_2m ?? 28;
      const humidity = cur.relative_humidity_2m ?? 82;
      return {
        current: {
          temp,
          humidity,
          precip: cur.precipitation ?? 0,
          radiation: cur.shortwave_radiation ?? 350,
          code: cur.weather_code ?? 2,
          heatIndex: heatIndex(temp, humidity) ?? Math.round(temp),
        },
        daily: (d.time || []).map((dateStr, i) => ({
          date: dateStr,
          code: d.weather_code?.[i] ?? 2,
          tMax: d.temperature_2m_max?.[i] ?? 30,
          tMin: d.temperature_2m_min?.[i] ?? 23,
          rain: d.precipitation_sum?.[i] ?? 0,
          rainChance: d.precipitation_probability_max?.[i] ?? 65,
          radiation: d.shortwave_radiation_sum?.[i] ?? 18,
        })),
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    /* fallback to Mindanao baseline below */
  }

  // 3. Offline Fail-Safe Mindanao Baseline
  const today = new Date();
  const daily = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() + i);
    const rain = i % 2 === 0 ? 6.4 : 2.1;
    return {
      date: dt.toISOString().slice(0, 10),
      code: rain > 5 ? 61 : 2,
      tMax: 30 + (i % 2),
      tMin: 23,
      rain,
      rainChance: rain > 5 ? 75 : 40,
      radiation: 18,
    };
  });

  return {
    current: {
      temp: 26,
      humidity: 85,
      precip: 3.2,
      radiation: 350,
      code: 2,
      heatIndex: 30,
    },
    daily,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCropRotationPlan({ lat, lon, crops = [], irrigated = false, startMonth }) {
  const calendar = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", timeZone: "Asia/Manila",
  }).formatToParts().map(({ type, value }) => [type, value]));
  const start = startMonth || `${calendar.year}-${calendar.month}`;
  const { climate } = await tagnaRequest("/climate", { lat, lon });
  if (!climate || ![...climate.rainBase, ...climate.tempBase].every(Number.isFinite)) return null;
  return buildMonthlyRotation({
    start, cropAssumptions: buildCropAssumptions(crops), irrigated, ...climate,
  });
}
