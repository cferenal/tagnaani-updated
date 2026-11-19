import { Thermometer, Flame, Droplets, CloudRain, Sun } from "lucide-react";
import { TONE_CLASS, pestRiskLevel } from "@/lib/weather";
import { cn } from "@/lib/utils";

function Metric({ Icon, label, value, unit, sub }) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center gap-2 text-muted-foreground/90">
        <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-[24px] leading-none">
        {value}
        {unit && <span className="ml-1 font-body text-[11px] text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function MetricsGrid({ current, pestScore }) {
  const pest = pestRiskLevel(pestScore);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
      <Metric Icon={Thermometer} label="Temp" value={Math.round(current.temp)} unit="°C" sub="Air temperature" />
      <Metric Icon={Flame} label="Heat index" value={Math.round(current.heatIndex)} unit="°C" sub="Feels like" />
      <Metric Icon={Droplets} label="Humidity" value={Math.round(current.humidity)} unit="%" sub="Relative" />
      <Metric Icon={CloudRain} label="Rain" value={current.precip.toFixed(1)} unit="mm" sub="Today so far" />
      <Metric Icon={Sun} label="Radiation" value={Math.round(current.radiation)} unit="W/m²" sub="Solar intensity" />

      <div className="card-soft col-span-full p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
            Pest likelihood
          </span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", TONE_CLASS[pest.tone])}>
            {pest.label}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(6, pestScore))}%` }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Warm, humid conditions drive insect and fungal pressure. Scout the field in the early morning.
        </p>
      </div>
    </div>
  );
}