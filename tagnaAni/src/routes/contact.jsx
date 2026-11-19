import { createFileRoute } from "@tanstack/react-router";
import { PublicArticle } from "@/components/PublicPage";

const email = import.meta.env.VITE_TAGNA_CONTACT_EMAIL?.trim() || "tagna.aniapp@gmail.com";

export const Route = createFileRoute("/contact")({ component: () => (
  <PublicArticle title="Contact us">
    <p>Team prECEsion welcomes collaboration with farmers, agriculture offices, researchers, and teams working on rural SMS access.</p>
    <a className="font-bold underline" href={`mailto:${email}`}>{email}</a>
    <section className="space-y-3 rounded-2xl border border-[#643100]/25 bg-[#ead0b3] p-5">
      <h2 className="font-display text-2xl font-bold">Suggest an improvement</h2>
      <p>Tell us what you tried and what would make Tagna-Ani easier to use. The link opens a draft in your email app.</p>
      <a className="inline-flex rounded-full bg-[#643100] px-4 py-2 font-semibold !text-white"
        href={`mailto:${email}?subject=${encodeURIComponent("Tagna-Ani suggestion")}`}>Email a suggestion</a>
    </section>
  </PublicArticle>
) });
