import { TrendingUp } from "lucide-react";
import { formatPeso } from "@/lib/farmData";
import { cn } from "@/lib/utils";

export default function MoneyTotals({ totals }) {
  return (
    <div className="mt-6 space-y-2.5">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#643100]/35 bg-[#EACAAE] p-5">
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#643100]">
              Total revenue
            </p>
            <p className="mt-2.5 font-display text-[32px] font-bold leading-none text-[#643100]">
              {formatPeso(totals.revenue)}
            </p>
            <p className="mt-2 text-[11.5px] text-[#7F3E00]">
              Harvest sales logged across your crops
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#643100]/30 bg-card">
            <TrendingUp className="h-4 w-4 text-[#643100]" strokeWidth={2} />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="card-soft p-4">
          <p className="eyebrow">Total expenses</p>
          <p className="mt-2.5 font-display text-[21px] font-bold leading-none text-[#643100]">
            {formatPeso(totals.expense)}
          </p>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#7F3E00]">
            Fertilizer &amp; seeds {formatPeso(totals.inputs)}
          </p>
        </div>
        <div className="card-soft p-4">
          <p className="eyebrow">Net</p>
          <p
            className={cn(
              "mt-2.5 font-display text-[21px] font-bold leading-none",
              totals.net < 0 ? "text-destructive" : "text-[#643100]",
            )}
          >
            {formatPeso(totals.net)}
          </p>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#7F3E00]">
            Revenue minus expenses
          </p>
        </div>
      </div>
    </div>
  );
}