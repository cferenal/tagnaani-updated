import { useSiteLanguage } from "@/lib/siteLanguage";
import { weatherCodeInfo } from "@/lib/weather";
import { cn } from "@/lib/utils";

function dayLabel(dateStr, locale) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

export default function WeatherTimeline({ daily = [] }) {
  const { t, locale } = useSiteLanguage();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const alignedDaily = daily.filter((day) => day.date >= todayStr);
  if (!alignedDaily.length) return <p className="text-sm">{t("Forecast unavailable. Refresh to check again.")}</p>;

  return (
    <div className="grid w-full grid-flow-col auto-cols-[minmax(90px,1fr)] gap-2.5 overflow-x-auto pb-1">
      {alignedDaily.map((day, i) => {
        const { Icon } = weatherCodeInfo(day.code);
        const active = day.date === todayStr;
        return (
          <div
            key={day.date + i}
            className={cn(
              "min-w-0 rounded-[1.5rem] border px-2.5 py-4 text-center transition-colors",
              active
                ? "border-2 border-[#643100] bg-[#EACAAE] text-[#643100]"
                : "border-[#643100]/30 bg-[#F6E6D4] text-[#643100]",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#643100]">
              {active ? t("Today") : dayLabel(day.date, locale)}
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
              {Math.round(day.rainChance)}{t("% rain")}</p>
          </div>
        );
      })}
    </div>
  );
}