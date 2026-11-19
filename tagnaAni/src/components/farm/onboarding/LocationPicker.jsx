import { useState } from "react";
import { Search, MapPin, Check } from "lucide-react";
import { MINDANAO_LOCATIONS } from "@/lib/farmData";
import { cn } from "@/lib/utils";

export default function LocationPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const options = q
    ? MINDANAO_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.province.toLowerCase().includes(q) ||
          l.region.toLowerCase().includes(q),
      )
    : MINDANAO_LOCATIONS;

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city or province"
          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-[14px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="no-scrollbar mt-3 max-h-64 space-y-1.5 overflow-y-auto">
        {options.map((l) => {
          const active = value === l.name;
          return (
            <button
              key={l.name}
              type="button"
              onClick={() => onChange(l.name)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors",
                active ? "border-primary bg-secondary" : "border-border/70 bg-card hover:border-primary/30",
              )}
            >
              <span className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 text-primary/70" strokeWidth={1.8} />
                <span>
                  <span className="block text-[13.5px] font-medium leading-tight">{l.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {l.province} · {l.region}
                  </span>
                </span>
              </span>
              {active && <Check className="h-4 w-4 text-primary" strokeWidth={2.2} />}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted-foreground">No match. Try another town.</p>
        )}
      </div>
    </div>
  );
}