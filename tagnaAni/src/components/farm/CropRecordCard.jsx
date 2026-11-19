import { useSiteLanguage } from "@/lib/siteLanguage";
import { Pencil, Trash2, Clock } from "lucide-react";
import { formatNumber } from "@/lib/farmData";

function shortDate(value) {
  if (!value) return "No date";
  try {
    return new Date(value + (value.length === 10 ? "T00:00:00Z" : "")).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return value;
  }
}

export default function CropRecordCard({ record, onEdit, onDelete }) {
  const { t } = useSiteLanguage();
  const cells = [
    { label: "Planted", value: formatNumber(record.planted_seeds) },
    { label: "Standing", value: formatNumber(record.current_crop_count) },
    { label: "Seed stock", value: formatNumber(record.stored_seeds) },
    { label: "Harvest", value: `${formatNumber(record.harvest_kg, 0)} kg` },
  ];

  return (
    <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[17px] leading-tight">{t(record.crop)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{record.date ? shortDate(record.date) : t("No date")}</p>
        </div>
        {record.pending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />{" " + t("To sync")}</span>
        ) : (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onEdit(record)}
              aria-label={t("Edit crop record")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(record.id)}
              aria-label={t("Delete crop record")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-border/70 pt-3">
        {cells.map((cell) => (
          <div key={t(cell.label)} className="text-center">
            <p className="font-display text-[14px] leading-none">{cell.value}</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t(cell.label)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}