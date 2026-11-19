import useRevealBars from "@/hooks/useRevealBars";

const TINTS = [
  { bg: "#E2E9DA", ink: "#3E5B45", fill: "#8FAE87" },
  { bg: "#EFE5D3", ink: "#6B5433", fill: "#C8A776" },
  { bg: "#E3E8ED", ink: "#4B5B6A", fill: "#9AAFC0" },
  { bg: "#E9E3ED", ink: "#5C4F65", fill: "#B5A7C1" },
];

const peso = (value) => Math.round(Number(value) || 0).toLocaleString("en-PH");

export default function MoneyBreakdown({ title, note, rows = [] }) {
  const ref = useRevealBars();
  if (!rows.length) return null;

  return (
    <section ref={ref} className="card-soft mbrk p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[17px] leading-none">{title}</h2>
        <span className="text-[11px] text-muted-foreground">{note}</span>
      </div>

      <ol className="mbrk-list mt-4">
        {rows.map((row, i) => {
          const tint = TINTS[i % TINTS.length];
          return (
            <li
              key={row.label}
              data-mbrk-row
              className="mbrk-row"
              style={{
                "--tag-bg": tint.bg,
                "--tag-ink": tint.ink,
                "--fill": tint.fill,
                "--pct": `${row.pct}%`,
                "--d": `${i * 90}ms`,
              }}
            >
              <span className="mbrk-tag">{row.label}</span>
              <div className="mbrk-head">
                <h3 className="mbrk-name">{row.crop}</h3>
                <p className="mbrk-value">
                  <span className="mbrk-sym">₱</span>
                  <span className="mbrk-num" data-value={row.value}>
                    {peso(row.value)}
                  </span>
                </p>
              </div>
              <div
                className="mbrk-bar"
                role="meter"
                aria-label={`${row.label} share of expenses`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(row.pct)}
              >
                <span className="mbrk-fill" />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}