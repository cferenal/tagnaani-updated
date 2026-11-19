import { useSiteLanguage } from "@/lib/siteLanguage";
import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

export const Route = createFileRoute("/about")({ component: AboutPage });

function AboutPage() {
  const { t } = useSiteLanguage();
  return (
  <PublicArticle title={t("About Team prECEsion")}>
    <p>{t("We are Team prECEsion, a group of Electronics Engineering and Electronics Engineering Technology students from the College of Engineering at Mindanao State University–Iligan Institute of Technology (MSU-IIT). We built Tagna-Ani during the NASA Space Apps Challenge.")}</p>
    <p>{t("We designed Tagna-Ani to help farmers in Mindanao access weather and farm guidance from a web app or by sending a regular text message.")}</p>
  </PublicArticle>
  );
}
