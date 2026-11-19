import { useSiteLanguage } from "@/lib/siteLanguage";
import { useState } from "react";
import { CalendarRange, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { name: "Usual rain", details: "See which crops fit the usual rain and heat for each month." },
  { name: "Less rain · El Niño", details: "See which crops could fit if your area got 25% less rain than usual." },
  { name: "More rain · La Niña", details: "See which crops could fit if your area got 25% more rain than usual." },
];

const dateLabel = (month, locale) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(locale, {
  month: "short", year: "numeric", timeZone: "UTC",
});
const value = (t, number, suffix, digits = 1) => Number.isFinite(number) ? `${number.toFixed(digits)}${suffix}` : t("Unavailable");
const phaseFor = (row) => !row.crop ? "Soil cover" : row.action.startsWith("Plant") ? "Plant" :
  row.action.includes("Harvest") ? "Harvest" : "Grow";
const phaseColors = {
  "Soil cover": "bg-[#efe2be]", Plant: "bg-[#edc89e]",
  Harvest: "bg-[#d2e6cf]", Grow: "bg-[#f6e6d4]",
};

const irrigationHelp = {
  on: "Checked: The planner assumes you can water crops when rain is scarce. It can suggest crops in drier months, but it still checks for too much rain and heat. It cannot tell you when or how much to water.",
  off: "Unchecked: The planner assumes your crops rely on rain. If there is too little rain for a crop during its growing months, it looks for another crop that fits.",
};
const reminder = "Reminder: Use this as a guide. Check the conditions on your farm before planting.";

async function downloadPlan(scenario, option, profile, username, irrigated, t, locale) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const safe = (text) => String(text).replace(/[^\x20-\x7E\xA0-\xFF]/gu, " ");
  const timestamp = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  }).format(new Date());
  const location = [profile.city, profile.province].filter(Boolean).join(", ");
  let y = 20;
  function paragraph(text, size = 10) {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safe(text), 182);
    doc.text(lines, 14, y);
    y += lines.length * size * 0.42 + 2;
  }

  for (let period = 0; period < scenario.months.length; period += 6) {
    if (period > 0) doc.addPage();
    y = 20;
    doc.setTextColor(100, 49, 0);
    paragraph(`Tagna-Ani | ${t("18-month crop rotation")}`, 20);
    if (period === 0) {
      paragraph(t("Prepared for: {name}", { name: profile.farmer_name || username || t("Farmer") }), 12);
      paragraph(t("Farm location: {location}", { location: location || t("Not set") }));
      paragraph(t("Your current crop: {crop}", { crop: t(profile.crops?.[0] || "Not set") }));
      paragraph(t("Your number 1 problem: {problem}", { problem: t(profile.problems?.[0] || "Not set") }));
    }
    const scenarioName = t(option.name).split(" · ").join(" / ");
    paragraph(`${scenarioName} | ${t(irrigated ? "Irrigated farm" : "Farm relies on rain")}`, 12);
    if (period === 0) paragraph(`${t(option.details)} ${t("This is a practice plan. Check PAGASA for the latest outlook.")}`);
    y += 4;
    const rows = scenario.months.slice(period, period + 6);
    paragraph(t("{start} to {end}", { start: dateLabel(rows[0].month, locale), end: dateLabel(rows.at(-1).month, locale) }), 12);
    const cardTop = y;
    rows.forEach((row, index) => {
      const x = 14 + (index % 3) * 62;
      const top = cardTop + Math.floor(index / 3) * 47;
      doc.setFillColor(246, 230, 212);
      doc.roundedRect(x, top, 58, 42, 4, 4, "F");
      doc.setFontSize(10);
      doc.text(safe(dateLabel(row.month, locale)), x + 4, top + 7);
      doc.setFontSize(11);
      const crop = doc.splitTextToSize(safe(t(row.crop || "Cover crop / fallow")), 50);
      const title = crop.length > 3 ? [...crop.slice(0, 2), crop[2].slice(0, 20) + "..."] : crop;
      doc.text(title, x + 4, top + 13);
      doc.setFontSize(9);
      doc.text(safe(t(phaseFor(row))), x + 4, top + 27);
      doc.text(safe(t("Rain: {amount}", { amount: value(t, row.scenario_rain_mm_day, " " + t("mm/day")) })), x + 4, top + 33);
      doc.text(safe(t("Typical high: {amount}", { amount: value(t, row.historical_max_air_c, " °C") })), x + 4, top + 38);
    });
    y = cardTop + 99;
    paragraph(t("Farm advice: Use the planting and harvest windows to plan ahead. Check rainfall and soil conditions before choosing a planting date."));
    paragraph(t("Source: NASA POWER historical monthly climate averages."));
    y += 4;
    paragraph(t(reminder));
    y += 4;
    paragraph(t("Powered by Tagna-Ani App (Generated: {date} PHT)", { date: timestamp }));
  }
  doc.save(`tagna-ani-rotation-${scenario.months[0].month}.pdf`);
}

export function RotationPlanner({ plan, loading, profile, username, irrigated, onIrrigationChange, onEditCrops }) {
  const { t, locale } = useSiteLanguage();
  const [scenarioIndex, setScenario] = useState(0);
  const [monthIndex, setMonth] = useState(0);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const scenario = plan?.irrigated === irrigated ? plan.scenarios[scenarioIndex] : null;
  const option = options[scenarioIndex];
  const month = scenario?.months[monthIndex];
  const start = Math.floor(monthIndex / 6) * 6;
  const button = "rounded-lg border border-[#643100]/35 px-3 py-2 text-sm font-semibold disabled:opacity-45";

  async function download() {
    setStatus("");
    setDownloading(true);
    try {
      await downloadPlan(scenario, option, profile, username, irrigated, t, locale);
    } catch {
      setStatus("The PDF could not be created. Try downloading again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="card-soft mt-8 space-y-4 p-4 sm:p-6" aria-labelledby="crop-rotation-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="crop-rotation-title" className="flex items-center gap-2 font-display text-2xl font-bold">
          <CalendarRange size={21} />{" " + t("18-month crop rotation")}</h3>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" aria-describedby="irrigation-help" checked={irrigated} onChange={(event) => onIrrigationChange(event.target.checked)} />{" " + t("I can water my crops (irrigated farm)")}</label>
      </div>
      <div id="irrigation-help" className="space-y-1 rounded-xl border border-[#643100]/25 p-3 text-sm">
        <p>{t(irrigationHelp.on)}</p>
        <p>{t(irrigationHelp.off)}</p>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed">{t("Use the tabs to see what you could plant in") + " "}{profile.city}{" " + t("with the usual rain, less rain, or more rain. Usual rain comes from past NASA records. The other two tabs show what could happen if those rain amounts changed. For the latest outlook, check")}{" "}
        <a className="font-semibold underline" href="https://www.pagasa.dost.gov.ph/climate/elnino-lanina/monitoring" target="_blank" rel="noreferrer">PAGASA</a>.
      </p>
      <div className="grid gap-2 sm:grid-cols-3" aria-label={t("Rainfall scenario")}>
        {options.map(({ name }, index) => (
          <button type="button" key={name} aria-pressed={index === scenarioIndex}
            className={cn(button, "text-left aria-pressed:bg-[#ead0b3]")} onClick={() => setScenario(index)}>{t(name)}</button>
        ))}
      </div>
      <p className="text-sm">{t(option.details)}</p>
      {loading || (plan && plan.irrigated !== irrigated) ? <p role="status">{t("Loading NASA POWER climate data…")}</p> : !scenario ? (
        <p role="status">{t("NASA POWER climate data is unavailable for this location. Refresh to try again.")}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" aria-label={t("Six-month periods")}>
            {[0, 6, 12].map((index) => (
              <button key={index} type="button" aria-pressed={start === index} onClick={() => setMonth(index)}
                className={cn(button, "aria-pressed:bg-[#ead0b3]")}>{index + 1}–{index + 6}{" " + t("months")}</button>
            ))}
          </div>
          <div className="grid w-full grid-flow-col auto-cols-[minmax(105px,1fr)] items-stretch gap-2.5 overflow-x-auto p-1">
            {scenario.months.slice(start, start + 6).map((row, index) => (
              <button type="button" key={row.month} aria-pressed={start + index === monthIndex}
                onClick={() => setMonth(start + index)}
                className={cn("min-w-0 break-words rounded-[1.5rem] border border-[#643100]/30 px-2.5 py-4 text-center aria-pressed:ring-2 aria-pressed:ring-[#643100]",
                  phaseColors[phaseFor(row)])}>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide">{dateLabel(row.month, locale)}</span>
                <span className="block font-display text-sm font-bold">{t(row.crop || "Cover crop / fallow")}</span>
                <span className="mt-1 block text-xs">{t(phaseFor(row))}</span>
                <span className="mt-2 block text-[10px] font-semibold">{value(t, row.scenario_rain_mm_day, " " + t("mm/day rain"))}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-[#643100]/25 p-4 text-sm" aria-live="polite">
            <h4 className="font-bold">{dateLabel(month.month, locale)} · {t(month.action)}</h4>
            <p className="mt-1">{t(month.reason)}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <div><dt>{t("Rain in this plan")}</dt><dd className="font-bold">{value(t, month.scenario_rain_mm_day, " " + t("mm/day"))}</dd></div>
              <div><dt>{t("Typical high temperature")}</dt><dd className="font-bold">{value(t, month.historical_max_air_c, " °C")}</dd></div>
              <div><dt>{t("Typical soil wetness near roots")}</dt><dd className="font-bold">{value(t, month.root_wetness_index, " / 1", 2)}</dd></div>
            </dl>
          </div>
          <button type="button" onClick={download} disabled={downloading} className={cn(button, "inline-flex items-center gap-2")}>
            <Download size={16} /> {downloading ? t("Preparing PDF…") : t("Download 18-month PDF")}
          </button>
        </>
      )}{" "}
      <button type="button" className="text-sm font-semibold underline" onClick={onEditCrops}>{t("Edit farm crops")}</button>
      {status && <p role="status">{t(status)}</p>}
    </section>
  );
}
