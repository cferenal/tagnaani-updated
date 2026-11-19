export default function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-[30px] leading-none">{title}</h1>
        {subtitle && <p className="mt-2 text-[12.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}