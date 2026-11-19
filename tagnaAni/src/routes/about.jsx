import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

export const Route = createFileRoute("/about")({ component: () => (
  <PublicArticle title="About Team prECEsion">
    <p>We are Team prECEsion, a group of electronics engineering students who built Tagna-Ani during the NASA Space Apps Challenge.</p>
    <p>We designed Tagna-Ani to help farmers in Mindanao access weather and farm guidance from a web app or by sending a regular text message.</p>
  </PublicArticle>
) });
