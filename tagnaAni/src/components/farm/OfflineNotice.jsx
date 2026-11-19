import { useSiteLanguage } from "@/lib/siteLanguage";
export default function OfflineNotice({ className = "" }) {
  const { t } = useSiteLanguage();
  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#9A6B12]" />{t("Offline · saved on device")}</p>
  );
}