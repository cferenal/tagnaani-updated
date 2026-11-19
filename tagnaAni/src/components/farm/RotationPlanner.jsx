import { useState } from "react";
import { CalendarRange, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { name: "Historical baseline", details: "Repeats the historical monthly rainfall and temperature averages for this location." },
  { name: "El Niño · drier test", details: "Tests rainfall 25% below the baseline to see which crop choices still pass." },
  { name: "La Niña · wetter test", details: "Tests rainfall 25% above the baseline to see which crop choices still pass." },
];

const dateLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
  month: "short", year: "numeric", timeZone: "UTC",
});
const value = (number, suffix, digits = 1) => Number.isFinite(number) ? `${number.toFixed(digits)}${suffix}` : "Unavailable";
const phaseFor = (row) => !row.crop ? "Soil cover" : row.action.startsWith("Plant") ? "Plant" :
  row.action.includes("Harvest") ? "Harvest" : "Grow";
const phaseColors = {
  "Soil cover": "bg-[#efe2be]", Plant: "bg-[#edc89e]",
  Harvest: "bg-[#d2e6cf]", Grow: "bg-[#f6e6d4]",
};

async function downloadPlan(scenario, option, city, irrigated) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const safe = (text) => String(text).normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
  doc.setTextColor(100, 49, 0);
  doc.setFontSize(22);
  doc.text("Tagna-Ani | 18-month crop rotation", 14, 21);
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(safe(city), 180).slice(0, 2), 14, 29);
  const rainfall = scenario.rain_multiplier === 1 ? "historical baseline"
    : (scenario.rain_multiplier < 1 ? "El Nino dry test (-25%)" : "La Nina wet test (+25%)");
  doc.text(`${rainfall} | ${irrigated ? "Irrigated" : "Rainfed"}`, 14, 41);
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(`${safe(option.details)} Uses NASA POWER historical averages and crop assumptions. This is a planning scenario, not an ENSO or weather forecast.`, 182), 14, 50);
  doc.setFillColor(100, 49, 0);
  doc.rect(14, 65, 182, 8, "F");
  doc.setTextColor(255, 255, 255);
  for (const [column, x] of [["Month", 17], ["Crop", 48], ["Phase", 107], ["Rain mm/d", 137], ["Max C", 169]]) doc.text(column, x, 70);
  doc.setTextColor(100, 49, 0);
  scenario.months.forEach((row, index) => {
    const y = 73 + index * 9;
    if (index % 2 === 0) {
      doc.setFillColor(246, 230, 212);
      doc.rect(14, y, 182, 9, "F");
    }
    doc.text(dateLabel(row.month), 17, y + 6);
    doc.text(safe(row.crop || "Cover crop / fallow").slice(0, 33), 48, y + 6);
    doc.text(phaseFor(row), 107, y + 6);
    doc.text(value(row.scenario_rain_mm_day, ""), 137, y + 6);
    doc.text(value(row.historical_max_air_c, ""), 169, y + 6);
  });
  doc.text("Source: NASA POWER agroclimatology. Check local field conditions before planting.", 14, 248);
  doc.save(`tagna-ani-rotation-${scenario.months[0].month}.pdf`);
}

export function RotationPlanner({ plan, loading, city, irrigated, onIrrigationChange, onEditCrops }) {
  const [scenarioIndex, setScenario] = useState(0);
  const [monthIndex, setMonth] = useState(0);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const scenario = plan?.scenarios[scenarioIndex];
  const option = options[scenarioIndex];
  const month = scenario?.months[monthIndex];
  const start = Math.floor(monthIndex / 6) * 6;
  const button = "rounded-lg border border-[#643100]/35 px-3 py-2 text-sm font-semibold disabled:opacity-45";

  async function download() {
    setStatus("");
    setDownloading(true);
    try {
      await downloadPlan(scenario, option, city, irrigated);
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
          <CalendarRange size={21} /> 18-month crop rotation
        </h3>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={irrigated} onChange={(event) => onIrrigationChange(event.target.checked)} /> Irrigated farm
        </label>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed">Start with NASA POWER’s historical monthly averages for {city}. Try the El Niño or La Niña tab to see how drier or wetter conditions could change the crop choices. The ±25% rainfall changes are planning assumptions. Check PAGASA for the current ENSO outlook.</p>
      <div className="grid gap-2 sm:grid-cols-3" aria-label="Rainfall scenario">
        {options.map(({ name }, index) => (
          <button type="button" key={name} aria-pressed={index === scenarioIndex}
            className={cn(button, "text-left aria-pressed:bg-[#ead0b3]")} onClick={() => setScenario(index)}>{name}</button>
        ))}
      </div>
      <p className="text-sm">{option.details}</p>
      {loading ? <p role="status">Loading NASA POWER climate data…</p> : !scenario ? (
        <p role="status">NASA POWER climate data is unavailable for this location. Refresh to try again.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" aria-label="Six-month periods">
            {[0, 6, 12].map((index) => (
              <button key={index} type="button" aria-pressed={start === index} onClick={() => setMonth(index)}
                className={cn(button, "aria-pressed:bg-[#ead0b3]")}>{index + 1}–{index + 6} months</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {scenario.months.slice(start, start + 6).map((row, index) => (
              <button type="button" key={row.month} aria-pressed={start + index === monthIndex}
                onClick={() => setMonth(start + index)}
                className={cn("rounded-xl border border-[#643100]/25 p-3 text-left aria-pressed:ring-2 aria-pressed:ring-[#643100]",
                  phaseColors[phaseFor(row)])}>
                <span className="block text-xs">{dateLabel(row.month)}</span>
                <span className="block font-semibold">{row.crop || "Cover crop / fallow"}</span>
                <span className="mt-1 block text-xs">{phaseFor(row)}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-[#643100]/25 p-4 text-sm" aria-live="polite">
            <h4 className="font-bold">{dateLabel(month.month)} · {month.action}</h4>
            <p className="mt-1">{month.reason}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-3">
              <div><dt>Scenario rainfall</dt><dd className="font-bold">{value(month.scenario_rain_mm_day, " mm/day")}</dd></div>
              <div><dt>Historical max temperature</dt><dd className="font-bold">{value(month.historical_max_air_c, " °C")}</dd></div>
              <div><dt>Historical root-zone wetness</dt><dd className="font-bold">{value(month.root_wetness_index, " / 1", 2)}</dd></div>
            </dl>
          </div>
          <button type="button" onClick={download} disabled={downloading} className={cn(button, "inline-flex items-center gap-2")}>
            <Download size={16} /> {downloading ? "Preparing PDF…" : "Download 18-month PDF"}
          </button>
        </>
      )}{" "}
      <button type="button" className="text-sm font-semibold underline" onClick={onEditCrops}>Edit farm crops</button>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
