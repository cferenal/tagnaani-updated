import { useSiteLanguage } from "@/lib/siteLanguage";
import { Plus, Search } from "lucide-react";

export default function ContactsHeader({ query, onQueryChange, onAdd }) {
  const { t } = useSiteLanguage();
  return (
    <header className="relative overflow-hidden rounded-b-[2rem] olive-band px-5 pb-7 pt-9">
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] !text-[#EACAAE]">{t("People around the farm")}</p>
            <h1 className="mt-2 font-display text-[28px] font-bold leading-none !text-[#FFF5EA]">{t("Farm contacts")}</h1>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label={t("Add contact")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#643100] bg-[#EACAAE] text-[#643100] shadow-sm transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="relative mt-5">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#643100]"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("Search suppliers, buyers, place…")}
            aria-label={t("Search contacts")}
            className="w-full rounded-full border border-[#643100]/45 bg-[#EACAAE] py-3.5 pl-11 pr-4 text-[13px] text-[#643100] outline-none placeholder:text-[#7F3E00]/70 focus:ring-2 focus:ring-[#FFF5EA]"
          />
        </div>
      </div>
    </header>
  );
}