import { heatIndex } from "@/lib/heat";

const API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Bantay-Local": "1",
};

const CROP_ASSUMPTIONS_MAP = {
  "Rice (palay)": { name: "Rice (palay)", family: "grass", months: 4, rain_min: 5.0, rain_max: 25.0, temp_max: 35 },
  Corn: { name: "Corn", family: "grass", months: 4, rain_min: 3.5, rain_max: 18.0, temp_max: 35 },
  Peanut: { name: "Peanut", family: "legume", months: 3, rain_min: 2.0, rain_max: 14.0, temp_max: 36 },
  Soybean: { name: "Soybean", family: "legume", months: 3, rain_min: 2.5, rain_max: 15.0, temp_max: 35 },
  "Mungbean (Monggo)": { name: "Mungbean (Monggo)", family: "legume", months: 2, rain_min: 1.8, rain_max: 12.0, temp_max: 36 },
  "Sweet potato": { name: "Sweet potato", family: "root", months: 4, rain_min: 2.0, rain_max: 16.0, temp_max: 36 },
  Cassava: { name: "Cassava", family: "root", months: 6, rain_min: 1.8, rain_max: 18.0, temp_max: 37 },
  Vegetables: { name: "Vegetables", family: "vegetable", months: 2, rain_min: 2.5, rain_max: 15.0, temp_max: 34 },
  Banana: { name: "Banana", family: "perennial", months: 6, rain_min: 4.0, rain_max: 22.0, temp_max: 35 },
  Coconut: { name: "Coconut", family: "palm", months: 6, rain_min: 3.5, rain_max: 22.0, temp_max: 36 },
  Coffee: { name: "Coffee", family: "shrub", months: 6, rain_min: 3.5, rain_max: 18.0, temp_max: 32 },
  Cacao: { name: "Cacao", family: "tree", months: 6, rain_min: 4.0, rain_max: 20.0, temp_max: 33 },
  Sugarcane: { name: "Sugarcane", family: "grass", months: 6, rain_min: 4.0, rain_max: 20.0, temp_max: 36 },
  Pineapple: { name: "Pineapple", family: "bromeliad", months: 5, rain_min: 2.5, rain_max: 16.0, temp_max: 35 },
};

export function buildCropAssumptions(profileCrops = []) {
  const chosen = [];
  const seen = new Set();
  for (const c of profileCrops) {
    const preset = CROP_ASSUMPTIONS_MAP[c] || {
      name: c,
      family: "custom",
      months: 3,
      rain_min: 2.5,
      rain_max: 16.0,
      temp_max: 35,
    };
    if (!seen.has(preset.name)) {
      seen.add(preset.name);
      chosen.push(preset);
    }
  }
  const rotationPartners = [
    CROP_ASSUMPTIONS_MAP["Mungbean (Monggo)"],
    CROP_ASSUMPTIONS_MAP["Peanut"],
    CROP_ASSUMPTIONS_MAP["Sweet potato"],
    CROP_ASSUMPTIONS_MAP["Corn"],
  ];
  for (const partner of rotationPartners) {
    if (chosen.length < 4 && !seen.has(partner.name)) {
      seen.add(partner.name);
      chosen.push(partner);
    }
  }
  return chosen.slice(0, 6);
}

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
          co2: 420,
          gwetroot: 0.68,
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
      co2: 420,
      gwetroot: 0.68,
    },
    daily,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCropRotationPlan({ lat, lon, crops = [], irrigated = false, startMonth }) {
  const now = new Date();
  const start =
    startMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const cropAssumptions = buildCropAssumptions(crops);

  try {
    if (!API_BASE) throw new Error("Local backend is disabled.");
    const res = await fetch(`${API_BASE}/plan`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        lat: Number(lat ?? 8.2289),
        lon: Number(lon ?? 124.2434),
        start,
        crops: cropAssumptions,
        irrigated: Boolean(irrigated),
        dry_factor: 0.75,
        wet_factor: 1.25,
        review_hold_months: 0,
        allow_fallback: true,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    /* fallback to client-side 18-month calculation if backend is offline */
  }

  const rainBase = [5.2, 4.4, 3.8, 3.5, 6.4, 8.2, 8.6, 8.1, 8.4, 8.0, 6.8, 5.8];
  const tempBase = [30.2, 30.8, 31.8, 32.6, 32.1, 31.2, 30.8, 31.0, 31.1, 31.0, 30.8, 30.4];
  const gwetBase = [0.62, 0.56, 0.48, 0.44, 0.6, 0.72, 0.75, 0.73, 0.74, 0.72, 0.68, 0.65];
  const [startY, startM] = start.split("-").map(Number);

  const scenarios = [
    ["Historical baseline", 1.0],
    ["Drier sensitivity", 0.75],
    ["Wetter sensitivity", 1.25],
  ].map(([name, factor]) => {
    const rows = [];
    let remaining = 0;
    let active = null;
    let previous = null;

    for (let i = 0; i < 18; i += 1) {
      const idx = startY * 12 + (startM - 1) + i;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      const rain = rainBase[m - 1];
      const temp = tempBase[m - 1];

      let stage = "Grow / monitor";
      if (remaining === 0) {
        const candidates = cropAssumptions.filter((c) => {
          for (let j = 0; j < c.months; j += 1) {
            const mm = ((m - 1 + j) % 12) + 1;
            const rr = rainBase[mm - 1] * factor;
            const tt = tempBase[mm - 1];
            if ((!irrigated && rr < c.rain_min) || rr > c.rain_max || tt > c.temp_max) {
              return false;
            }
          }
          return true;
        });
        candidates.sort((a, b) => {
          const sameFamA = previous && a.family === previous.family ? 1 : 0;
          const sameFamB = previous && b.family === previous.family ? 1 : 0;
          return sameFamA - sameFamB;
        });
        if (candidates.length > 0) {
          active = candidates[0];
          remaining = active.months;
          stage = "Plant / establish";
        } else {
          active = null;
          stage = "Review / soil-cover interval";
        }
      }
      if (active && remaining === 1) {
        stage = active.months === 1 ? "Plant and harvest in this month" : "Harvest window";
      }
      rows.push({
        month: `${y}-${String(m).padStart(2, "0")}`,
        crop: active ? active.name : null,
        family: active ? active.family : null,
        action: stage,
        historical_rain_mm_day: rain,
        scenario_rain_mm_day: Number((rain * factor).toFixed(2)),
        historical_max_air_c: temp,
        root_wetness_index: gwetBase[m - 1],
        reason: active
          ? "Passes monthly NASA climate screen across crop duration."
          : "Rainfall/heat outside threshold; use cover crop or irrigation.",
      });
      if (active) {
        remaining -= 1;
        if (remaining === 0) previous = active;
      }
    }
    return { name, rain_multiplier: factor, months: rows };
  });

  return {
    generated_at: new Date().toISOString(),
    scenarios,
  };
}
