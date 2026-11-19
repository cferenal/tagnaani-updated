import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

const email = import.meta.env.VITE_TAGNA_CONTACT_EMAIL?.trim();

export const Route = createFileRoute("/contact")({ component: () => (
  <PublicArticle title="Contact us">
    <p>Team prECEsion welcomes collaboration with farmers, agriculture offices, researchers, and teams interested in SMS access for rural communities.</p>
    {email
      ? <a className="font-bold underline" href={`mailto:${email}`}>{email}</a>
      : <p>We’re setting up a shared email address for collaboration inquiries.</p>}
  </PublicArticle>
) });
