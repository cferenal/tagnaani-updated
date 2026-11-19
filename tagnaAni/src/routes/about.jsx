import { useSiteLanguage } from "@/lib/siteLanguage";
import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  const { t } = useSiteLanguage();
  return (
  <PublicArticle title={t("About Team prECEsion")}>
    <p>{t("We are Team prECEsion, a team of Electronics Engineering students and an Electronics Engineering Technology student. We built Tagna-Ani during the NASA Space Apps Challenge.")}</p>
    <p>{t("We designed Tagna-Ani to help farmers in Mindanao access weather and farm guidance from a web app or by sending a regular text message.")}</p>
  </PublicArticle>
  );
}
