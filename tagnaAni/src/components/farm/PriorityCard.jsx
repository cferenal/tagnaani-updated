import { ArrowUpRight } from "lucide-react";

export default function PriorityCard({ priority }) {
  return (
    <div className="relative overflow-hidden rounded-[1.9rem] border border-primary/10 bg-gradient-to-br from-secondary via-secondary to-accent/25 p-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-accent/35 blur-2xl" />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/80">
          Farm priority of the day
        </p>
        <h2 className="mt-3 text-[25px] leading-[1.2] text-foreground">{priority.title}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{priority.detail}</p>
        <div className="mt-5 flex items-center justify-between border-t border-primary/10 pt-4">
          <span className="rounded-full bg-card/80 px-3 py-1 text-[11px] font-medium text-primary">
            {priority.label}
          </span>
          <ArrowUpRight className="h-4 w-4 text-primary/60" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}