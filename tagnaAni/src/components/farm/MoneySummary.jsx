import { formatPeso } from "@/lib/farmData";
import { cn } from "@/lib/utils";

export default function MoneySummary({ totals }) {
  return (
    <div className="card-soft p-4">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#643100]">
            Expenses
          </p>
          <p className="mt-1.5 font-display text-[17px] font-bold leading-none text-[#643100]">
            {formatPeso(totals.expense)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#643100]">
            Revenue
          </p>
          <p className="mt-1.5 font-display text-[17px] font-bold leading-none text-[#643100]">
            {formatPeso(totals.revenue)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#643100]">
            Net
          </p>
          <p
            className={cn(
              "mt-1.5 font-display text-[17px] font-bold leading-none",
              totals.net < 0 ? "text-destructive" : "text-[#643100]",
            )}
          >
            {formatPeso(totals.net)}
          </p>
        </div>
      </div>
    </div>
  );
}