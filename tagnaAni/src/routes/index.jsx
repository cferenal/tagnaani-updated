import { useSiteLanguage } from "@/lib/siteLanguage";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, MessageSquareText, Sprout } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { PublicPage } from "@/components/PublicPage";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const { t } = useSiteLanguage();
  const { user } = useAuth();
  return (
    <PublicPage>
      <section className="grid items-center gap-8 py-12 sm:py-20 md:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-7xl">{t("Farm guidance for Mindanao")}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed">{t("Check local weather, get guidance on a crop problem by text, and keep track of your farm in Tagna-Ani.")}</p>
          <Link to={user?.mustChangePassword ? "/change-temporary-password" : "/dashboard"} className="mt-7 inline-flex rounded-full bg-[#643100] px-5 py-3 text-sm font-bold !text-white">{user?.mustChangePassword ? t("Change temporary password") : user ? t("Return to dashboard") : t("Open the app")}</Link>
        </div>
        <img src="/logo.png" className="mx-auto w-full max-w-56 rounded-[2rem] sm:max-w-72" alt="Tagna-Ani" width="288" height="288" />
      </section>
      <section className="grid gap-4 pb-10 sm:grid-cols-2" aria-label={t("User guides")}>
        <Link to="/guides/sms" className="group rounded-3xl border border-[#643100]/25 bg-[#ead0b3] p-6 hover:border-[#643100]">
          <MessageSquareText aria-hidden="true" />
          <h2 className="mt-4 flex items-center justify-between font-display text-2xl font-bold">{t("Use SMS") + " "}<ArrowUpRight size={20} aria-hidden="true" /></h2>
          <p className="mt-2">{t("Text your location, crop, and problem. No registration or mobile data required.")}</p>
        </Link>
        <Link to="/guides/app" className="group rounded-3xl border border-[#643100]/25 bg-[#ead0b3] p-6 hover:border-[#643100]">
          <Sprout aria-hidden="true" />
          <h2 className="mt-4 flex items-center justify-between font-display text-2xl font-bold">{t("Use the app") + " "}<ArrowUpRight size={20} aria-hidden="true" /></h2>
          <p className="mt-2">{t("Set up your farm, check weather and crop planning, and record expenses and harvests.")}</p>
        </Link>
        <p className="text-sm sm:col-span-2">{t("Tagna-Ani currently accepts SMS from Philippine mobile numbers only.")}</p>
      </section>
    </PublicPage>
  );
}
