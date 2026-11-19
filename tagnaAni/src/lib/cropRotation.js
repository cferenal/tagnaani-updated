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

export function buildMonthlyRotation({ start, cropAssumptions, irrigated, rainBase, tempBase, gwetBase }) {
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
            if (!Number.isFinite(rr) || !Number.isFinite(tt) || (!irrigated && rr < c.rain_min) || rr > c.rain_max || tt > c.temp_max) {
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
