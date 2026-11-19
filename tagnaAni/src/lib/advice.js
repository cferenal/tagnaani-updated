import { formatNumber, formatPeso } from "./farmData";

export function pestScore(weather) {
  if (!weather?.current) return 0;
  const { current, daily = [] } = weather;
  const rain3 = daily.slice(0, 3).reduce((s, d) => s + (d.rain || 0), 0);
  let score = Math.max(0, Math.min(34, (current.humidity - 58) * 1.5));
  score += Math.min(26, rain3 * 0.8);
  const t = current.temp || 28;
  score += t >= 24 && t <= 32 ? 24 : 10;
  score += 8;
  return Math.round(Math.min(96, score));
}

function dayName(dateStr) {
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

export function buildPriority(weather, profile) {
  const { current, daily = [] } = weather;
  const today = daily[0] || {};
  const next2 = daily.slice(0, 2).reduce((s, d) => s + (d.rain || 0), 0);
  const crop = (profile?.crops || [])[0] || "your crop";
  const score = pestScore(weather);

  if (today.rain >= 12 || next2 >= 28) {
    return {
      label: "Fertilizer & nutrients",
      title: "Hold off on fertilizer",
      detail: `${Math.round(next2)} mm of rain is forecast in the next two days. Nutrients would wash out before the roots take them up — apply right after the wet spell clears.`,
    };
  }
  if (current.heatIndex >= 40) {
    return {
      label: "Water & heat stress",
      title: "Water before 7am",
      detail: `The heat index reaches ${Math.round(current.heatIndex)}°C today. Irrigate early, keep field work out of the 11am–3pm window, and check ${crop.toLowerCase()} for wilting.`,
    };
  }
  if (score >= 65) {
    return {
      label: "Pest & disease",
      title: "Scout the field at dawn",
      detail: `Warm, humid air pushes pest likelihood to ${score}%. Walk the rows and check the undersides of leaves for eggs, borers or blight spots.`,
    };
  }
  if (daily.slice(0, 3).every((d) => (d.rain || 0) < 2)) {
    return {
      label: "Irrigation",
      title: "Start your irrigation cycle",
      detail:
        "No meaningful rain in the next three days and radiation is high. Irrigate in the early morning to cut evaporation loss.",
    };
  }
  return {
    label: "Fertilizer & nutrients",
    title: "A good day to apply fertilizer",
    detail: `Mild rain and moderate heat make today workable for ${crop.toLowerCase()}. Apply in the cooler afternoon and follow with light watering.`,
  };
}

export function buildAlerts(weather) {
  const alerts = [];
  const { current, daily = [] } = weather;
  const wet = daily.filter((d) => (d.rain || 0) >= 15).slice(0, 2);
  if (wet.length) {
    const peak = Math.round(Math.max(...wet.map((d) => d.rain)));
    alerts.push({
      tone: "rain",
      title: `Heavy rain ${dayName(wet[0].date)}`,
      detail: `Up to ${peak} mm forecast — delay spraying and fertilizer, and clear your drainage canals.`,
    });
  }
  if (current.heatIndex >= 38) {
    alerts.push({
      tone: "heat",
      title: `Heat index peaks at ${Math.round(current.heatIndex)}°C`,
      detail: "Water early morning and avoid field work between 11am and 3pm.",
    });
  }
  const score = pestScore(weather);
  if (score >= 60) {
    alerts.push({
      tone: "warn",
      title: `Pest likelihood at ${score}%`,
      detail: `Humidity near ${Math.round(current.humidity)}% favours fungal blight and stem borers. Scout twice this week.`,
    });
  }
  if (current.radiation > 720) {
    alerts.push({
      tone: "heat",
      title: "Strong solar radiation",
      detail: "Shade new seedlings and water again late afternoon if leaves start to curl.",
    });
  }
  return alerts;
}

export function buildCropAdvice({ records = [], transactions = [], profile }) {
  const out = [];
  const planted = records.reduce((s, r) => s + (r.planted_seeds || 0), 0);
  const stored = records.reduce((s, r) => s + (r.stored_seeds || 0), 0);
  const harvest = records.reduce((s, r) => s + (r.harvest_kg || 0), 0);
  const standing = records.reduce((s, r) => s + (r.current_crop_count || 0), 0);
  const crop = records[0]?.crop || (profile?.crops || [])[0] || "your crop";

  if (records.length === 0) {
    return [
      {
        tag: "Getting started",
        title: "Record your first crop cycle",
        body: "Add what you planted and how much seed you are holding. Advice then follows your own numbers instead of averages.",
      },
    ];
  }

  if (planted > 0 && stored < planted * 0.2) {
    out.push({
      tag: `${crop} · seed stock`,
      title: stored === 0 ? "No seed stock left" : `Only ${formatNumber(stored)} seeds in stock`,
      body: `You planted ${formatNumber(planted)} seeds and hold ${formatNumber(stored)}. Secure certified seed before the next planting window opens.`,
    });
  }
  if (planted > 0 && standing > 0) {
    const survival = (standing / planted) * 100;
    if (survival < 88) {
      out.push({
        tag: `${crop} · stand count`,
        title: `${Math.round(100 - survival)}% of planted seed did not establish`,
        body: `${formatNumber(standing)} plants stand against ${formatNumber(planted)} seeds planted. Replant the gaps while soil moisture is still good.`,
      });
    }
  }
  if (harvest > 0 && planted > 0) {
    out.push({
      tag: `${crop} · yield`,
      title: `${formatNumber(harvest / planted, 2)} kg per seed planted`,
      body: `${formatNumber(harvest)} kg harvested in total. Keep the next cycle's number beside this one to see whether a change paid off.`,
    });
  }

  const expense = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const revenue = transactions.filter((t) => t.kind === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
  if (expense > 0) {
    if (revenue === 0) {
      out.push({
        tag: "Farm books",
        title: "No sales logged yet",
        body: `You have recorded ${formatPeso(expense)} of expenses. Log your sales to see the real margin for this cycle.`,
      });
    } else if (expense > revenue) {
      out.push({
        tag: "Farm books",
        title: "Expenses are above revenue",
        body: `Spent ${formatPeso(expense)} against ${formatPeso(revenue)} earned. Review fertilizer and labour — the two biggest lines on most Mindanao farms.`,
      });
    } else {
      out.push({
        tag: "Farm books",
        title: `Margin of ${formatPeso(revenue - expense)} this cycle`,
        body: "You are ahead of costs. Keep logging every expense so next cycle's advice sharpens.",
      });
    }
  }

  return out.slice(0, 3);
}

export function inventoryTotals(records = []) {
  return {
    harvest: records.reduce((s, r) => s + (r.harvest_kg || 0), 0),
    planted: records.reduce((s, r) => s + (r.planted_seeds || 0), 0),
    standing: records.reduce((s, r) => s + (r.current_crop_count || 0), 0),
    stored: records.reduce((s, r) => s + (r.stored_seeds || 0), 0),
  };
}

export function moneyTotals(transactions = []) {
  const expense = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const revenue = transactions.filter((t) => t.kind === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
  return { expense, revenue, net: revenue - expense };
}