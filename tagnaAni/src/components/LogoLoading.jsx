import { useSiteLanguage } from "@/lib/siteLanguage";
export function LogoLoading() {
  const { t } = useSiteLanguage();
  return (
    <div className="grid h-full min-h-64 place-items-center" role="status" aria-label={t("Loading Tagna-Ani")}>
      <div className="space-y-2 px-4 text-center">
        <img className="mx-auto h-24 w-24 rounded-3xl shadow-md motion-safe:animate-pulse" src="/logo.png" alt="" width="96" height="96" />
        <p className="font-display text-2xl font-bold">Tagna-Ani</p>
        <p className="font-semibold">{t("Empowering Farmers Through Knowledge and Technology.")}</p>
        <p className="text-sm italic" lang="fil">{t("Kaalaman at teknolohiya para sa magsasaka.")}</p>
      </div>
    </div>
  );
}
