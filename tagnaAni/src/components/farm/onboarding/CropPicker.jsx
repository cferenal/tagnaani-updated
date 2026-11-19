import { Check } from "lucide-react";
import { CROPS } from "@/lib/farmData";
import { cn } from "@/lib/utils";

export default function CropPicker({ value = [], onChange, options = CROPS }) {
  function toggle(crop) {
    onChange(value.includes(crop) ? value.filter((c) => c !== crop) : [...value, crop]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((crop) => {
        const active = value.includes(crop);
        return (
          <button
            key={crop}
            type="button"
            onClick={() => toggle(crop)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={2.5} />}
            {crop}
          </button>
        );
      })}
    </div>
  );
}