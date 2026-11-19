import { useSiteLanguage } from "@/lib/siteLanguage";
import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

const email = import.meta.env.VITE_TAGNA_CONTACT_EMAIL?.trim() || "tagna.aniapp@gmail.com";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const { t } = useSiteLanguage();
  return (
  <PublicArticle title={t("Contact us")}>
    <p>{t("Team prECEsion welcomes collaboration with farmers, agriculture offices, researchers, and teams working on rural SMS access.")}</p>
    <a className="inline-flex rounded-full bg-[#643100] px-4 py-2 font-semibold !text-white" href={`mailto:${email}`}>{t("Email us about collaboration")}</a>
    <p className="text-sm">{email}</p>
    <section className="space-y-2 border-t border-[#643100]/25 pt-5">
      <h2 className="font-display text-xl font-bold">{t("Suggest an improvement")}</h2>
      <p>{t("Tell us what you tried and what would make Tagna-Ani easier to use. The link opens a draft in your email app.")}</p>
      <a className="font-semibold underline"
        href={`mailto:${email}?subject=${encodeURIComponent("Tagna-Ani suggestion")}`}>{t("Email a suggestion")}</a>
    </section>
  </PublicArticle>
  );
}
