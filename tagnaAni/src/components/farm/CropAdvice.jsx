import { useSiteLanguage } from "@/lib/siteLanguage";
import { Sprout } from "lucide-react";

export default function CropAdvice({ advice = [] }) {
  const { t } = useSiteLanguage();
  if (!advice.length) return null;
  return (
    <div className="space-y-2.5">
      {advice.map((item) => (
        <div key={item.title} className="rounded-[1.35rem] border border-border/80 bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Sprout className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-foreground/60">
                {item.tag || t("Crop advice")}
              </p>
              <p className="mt-1 font-display text-[16px] leading-snug">{item.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}