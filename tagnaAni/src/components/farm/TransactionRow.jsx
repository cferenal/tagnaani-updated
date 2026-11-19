import { Trash2 } from "lucide-react";
import { formatPeso } from "@/lib/farmData";
import { cn } from "@/lib/utils";

function shortDate(value) {
  if (!value) return "No date";
  try {
    return new Date(value + (value.length === 10 ? "T00:00:00Z" : "")).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return value;
  }
}

export default function TransactionRow({ item, onDelete }) {
  const isExpense = item.kind === "expense";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-border/80 bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium">{item.category || (isExpense ? "Expense" : "Sale")}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {shortDate(item.date)}
          {item.crop ? ` · ${item.crop}` : ""}
          {item.pending ? " · to sync" : ""}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "font-display text-[15px] whitespace-nowrap",
            isExpense ? "text-[#B4452F]" : "text-[#2E6B44]",
          )}
        >
          {isExpense ? "−" : "+"}
          {formatPeso(item.amount)}
        </span>
        {!item.pending && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Delete entry"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
          </button>
        )}
      </div>
    </div>
  );
}