import { weatherCodeInfo } from "@/lib/weather";
import { todayKey } from "@/lib/farmData";
import { cn } from "@/lib/utils";

function dayLabel(dateStr, index) {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

export default function WeatherTimeline({ daily = [] }) {
  const todayStr = todayKey();
  const startIdx = daily.findIndex((d) => d.date >= todayStr);
  const alignedDaily = startIdx > 0 ? daily.slice(startIdx) : daily;

  return (
    <div className="no-scrollbar flex w-full max-w-full gap-2.5 overflow-x-auto pb-1">
      {alignedDaily.map((day, i) => {
        const { Icon } = weatherCodeInfo(day.code);
        const active = i === 0;
        return (
          <div
            key={day.date + i}
            className={cn(
              "w-[90px] shrink-0 rounded-[1.5rem] border px-2.5 py-4 text-center transition-colors",
              active
                ? "border-2 border-[#643100] bg-[#EACAAE] text-[#643100]"
                : "border-[#643100]/30 bg-[#F6E6D4] text-[#643100]",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#643100]">
              {dayLabel(day.date, i)}
            </p>
            <Icon
              className="mx-auto my-3 h-6 w-6 text-[#643100]"
              strokeWidth={1.8}
            />
            <p className="font-display text-[15px] font-bold leading-none text-[#643100]">
              {Math.round(day.tMax)}°
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#7F3E00]">
              {Math.round(day.tMin)}°
            </p>
            <p className="mt-2.5 text-[10px] font-semibold tracking-wide text-[#7F3E00]">
              {Math.round(day.rainChance)}% rain
            </p>
          </div>
        );
      })}
    </div>
  );
}