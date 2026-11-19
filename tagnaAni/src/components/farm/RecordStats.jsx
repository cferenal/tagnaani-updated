import { formatNumber } from "@/lib/farmData";

export default function RecordStats({ totals }) {
  const items = [
    { label: "Total harvest", value: `${formatNumber(totals.harvest, 0)} kg` },
    { label: "Seeds planted", value: formatNumber(totals.planted) },
    { label: "Standing crop", value: formatNumber(totals.standing) },
    { label: "Seed stock", value: formatNumber(totals.stored) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="card-soft p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
            {item.label}
          </p>
          <p className="mt-2.5 font-display text-[22px] leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  );
}