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

function dayName(dateStr, locale) {
  try {
    return new Date(dateStr + "T00:00:00Z").toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

export function buildPriority(weather, profile, t) {
  const { current, daily = [] } = weather;
  const today = daily[0] || {};
  const next2 = daily.slice(0, 2).reduce((s, d) => s + (d.rain || 0), 0);
  const crop = (profile?.crops || [])[0] || "your crop";
  const score = pestScore(weather);

  if (today.rain >= 12 || next2 >= 28) {
    return {
      label: t("Fertilizer & nutrients"),
      title: t("Hold off on fertilizer"),
      detail: t("{rain} mm of rain is forecast in the next two days. Nutrients would wash out before the roots take them up — apply right after the wet spell clears.", { rain: Math.round(next2) }),
    };
  }
  if (current.heatIndex >= 40) {
    return {
      label: t("Water & heat stress"),
      title: t("Water before 7am"),
      detail: t("The heat index reaches {heat}°C today. Irrigate early, keep field work out of the 11am–3pm window, and check {crop} for wilting.", { heat: Math.round(current.heatIndex), crop: t(crop).toLowerCase() }),
    };
  }
  if (score >= 65) {
    return {
      label: t("Pest & disease"),
      title: t("Scout the field at dawn"),
      detail: t("Warm, humid air pushes pest likelihood to {score}%. Walk the rows and check the undersides of leaves for eggs, borers or blight spots.", { score }),
    };
  }
  if (daily.slice(0, 3).every((d) => (d.rain || 0) < 2)) {
    return {
      label: t("Irrigation"),
      title: t("Start your irrigation cycle"),
      detail:
        t("No meaningful rain in the next three days and radiation is high. Irrigate in the early morning to cut evaporation loss."),
    };
  }
  return {
    label: t("Fertilizer & nutrients"),
    title: t("A good day to apply fertilizer"),
    detail: t("Mild rain and moderate heat make today workable for {crop}. Apply in the cooler afternoon and follow with light watering.", { crop: t(crop).toLowerCase() }),
  };
}

export function buildAlerts(weather, t, locale) {
  const alerts = [];
  const { current, daily = [] } = weather;
  const wet = daily.filter((d) => (d.rain || 0) >= 15).slice(0, 2);
  if (wet.length) {
    const peak = Math.round(Math.max(...wet.map((d) => d.rain)));
    alerts.push({
      tone: "rain",
      title: t("Heavy rain {day}", { day: dayName(wet[0].date, locale) }),
      detail: t("Up to {rain} mm forecast — delay spraying and fertilizer, and clear your drainage canals.", { rain: peak }),
    });
  }
  if (current.heatIndex >= 38) {
    alerts.push({
      tone: "heat",
      title: t("Heat index peaks at {heat}°C", { heat: Math.round(current.heatIndex) }),
      detail: t("Water early morning and avoid field work between 11am and 3pm."),
    });
  }
  const score = pestScore(weather);
  if (score >= 60) {
    alerts.push({
      tone: "warn",
      title: t("Pest likelihood at {score}%", { score }),
      detail: t("Humidity near {humidity}% favours fungal blight and stem borers. Scout twice this week.", { humidity: Math.round(current.humidity) }),
    });
  }
  if (current.radiation > 720) {
    alerts.push({
      tone: "heat",
      title: t("Strong solar radiation"),
      detail: t("Shade new seedlings and water again late afternoon if leaves start to curl."),
    });
  }
  return alerts;
}

export function buildCropAdvice({ records = [], transactions = [], profile, t }) {
  const out = [];
  const planted = records.reduce((s, r) => s + (r.planted_seeds || 0), 0);
  const stored = records.reduce((s, r) => s + (r.stored_seeds || 0), 0);
  const harvest = records.reduce((s, r) => s + (r.harvest_kg || 0), 0);
  const standing = records.reduce((s, r) => s + (r.current_crop_count || 0), 0);
  const crop = records[0]?.crop || (profile?.crops || [])[0] || "your crop";

  if (records.length === 0) {
    return [
      {
        tag: t("Getting started"),
        title: t("Record your first crop cycle"),
        body: t("Add what you planted and how much seed you are holding. Advice then follows your own numbers instead of averages."),
      },
    ];
  }

  if (planted > 0 && stored < planted * 0.2) {
    out.push({
      tag: t("{crop} · seed stock", { crop: t(crop) }),
      title: stored === 0 ? t("No seed stock left") : t("Only {stock} seeds in stock", { stock: formatNumber(stored) }),
      body: t("You planted {planted} seeds and hold {stock}. Secure certified seed before the next planting window opens.", { planted: formatNumber(planted), stock: formatNumber(stored) }),
    });
  }
  if (planted > 0 && standing > 0) {
    const survival = (standing / planted) * 100;
    if (survival < 88) {
      out.push({
        tag: t("{crop} · stand count", { crop: t(crop) }),
        title: t("{loss}% of planted seed did not establish", { loss: Math.round(100 - survival) }),
        body: t("{standing} plants stand against {planted} seeds planted. Replant the gaps while soil moisture is still good.", { standing: formatNumber(standing), planted: formatNumber(planted) }),
      });
    }
  }
  if (harvest > 0 && planted > 0) {
    out.push({
      tag: t("{crop} · yield", { crop: t(crop) }),
      title: t("{yield} kg per seed planted", { yield: formatNumber(harvest / planted, 2) }),
      body: t("{harvest} kg harvested in total. Keep the next cycle's number beside this one to see whether a change paid off.", { harvest: formatNumber(harvest) }),
    });
  }

  const expense = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const revenue = transactions.filter((t) => t.kind === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
  if (expense > 0) {
    if (revenue === 0) {
      out.push({
        tag: t("Farm books"),
        title: t("No sales logged yet"),
        body: t("You have recorded {expense} of expenses. Log your sales to see the real margin for this cycle.", { expense: formatPeso(expense) }),
      });
    } else if (expense > revenue) {
      out.push({
        tag: t("Farm books"),
        title: t("Expenses are above revenue"),
        body: t("Spent {expense} against {revenue} earned. Review fertilizer and labour — the two biggest lines on most Mindanao farms.", { expense: formatPeso(expense), revenue: formatPeso(revenue) }),
      });
    } else {
      out.push({
        tag: t("Farm books"),
        title: t("Margin of {margin} this cycle", { margin: formatPeso(revenue - expense) }),
        body: t("You are ahead of costs. Keep logging every expense so next cycle's advice sharpens."),
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
