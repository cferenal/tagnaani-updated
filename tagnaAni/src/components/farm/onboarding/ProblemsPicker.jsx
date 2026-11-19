import { useSiteLanguage } from "@/lib/siteLanguage";
import { Check } from "lucide-react";
import { PROBLEMS } from "@/lib/farmData";
import { cn } from "@/lib/utils";

export default function ProblemsPicker({ value = [], onChange }) {
  const { t } = useSiteLanguage();

  function toggle(problem) {
    onChange(value.includes(problem) ? value.filter((p) => p !== problem) : [...value, problem]);
  }

  return (
    <div className="space-y-2">
      {PROBLEMS.map((problem) => {
        const active = value.includes(problem);
        return (
          <button
            key={problem}
            type="button"
            onClick={() => toggle(problem)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[13.5px] transition-colors",
              active ? "border-primary bg-secondary font-medium" : "border-border/70 bg-card hover:border-primary/30",
            )}
          >
            {t(problem)}
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}