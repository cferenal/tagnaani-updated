import { useSiteLanguage } from "@/lib/siteLanguage";
import { Lock, User } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { registerSimple } from "@/api/base44Client";

export function RegisterPage() {
  const { t } = useSiteLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await registerSimple(username, password);
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err.message || "Registration failed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full items-center justify-center overflow-x-hidden bg-[#D49961] px-5 py-8 text-[#7F3E00]">
      <div className="w-full max-w-[400px]">
        <Link to="/" className="mb-4 inline-block text-sm font-semibold underline">{t("Back to Tagna-Ani")}</Link>
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="Tagna-Ani Logo"
            className="mx-auto mb-3 h-24 w-24 rounded-2xl border-2 border-[#643100] bg-[#EACAAE] object-cover shadow-md"
          />
          <h1 className="font-display text-[32px] font-bold tracking-tight text-[#643100]">
            Tagna-Ani
          </h1>
          <p className="mt-1.5 text-[12.5px] font-semibold text-[#643100]">{t("Empowering Farmers Through Knowledge and Technology.")}</p>
          <p className="text-[12px] italic text-[#7F3E00]">{t("Kaalaman at teknolohiya para sa magsasaka.")}</p>
        </div>

        <div className="rounded-[1.65rem] border border-[#643100]/30 bg-[#F6E6D4] p-7 shadow-[0_18px_40px_-24px_rgba(100,49,0,0.65)]">
          <h2 className="font-display text-[22px] font-bold text-[#643100]">{t("Create your account")}</h2>
          <p className="mt-1 text-[12.5px] text-[#7F3E00]">{t("Choose a username and password to start your 4-step farm setup.")}</p>

          {error && (
            <div className="mt-4 rounded-xl border border-[#643100]/40 bg-[#EACAAE] p-3 text-[12.5px] font-bold text-[#643100]">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="register-username"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]"
              >{t("Username")}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#643100]" />
                <input
                  id="register-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder={t("Choose a username")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  className="h-12 w-full rounded-xl border border-[#643100]/45 bg-[#EACAAE] pl-10 pr-3.5 text-[14px] text-[#643100] placeholder:text-[#7F3E00]/65 focus:outline-none focus:ring-2 focus:ring-[#643100]"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]"
              >{t("Password")}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#643100]" />
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  placeholder={t("At least 12 characters")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="h-12 w-full rounded-xl border border-[#643100]/45 bg-[#EACAAE] pl-10 pr-3.5 text-[14px] text-[#643100] placeholder:text-[#7F3E00]/65 focus:outline-none focus:ring-2 focus:ring-[#643100]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-12 w-full rounded-xl border-2 border-[#643100] bg-[#EACAAE] text-[12.5px] font-bold uppercase tracking-[0.14em] text-[#643100] shadow-sm transition-transform active:scale-98 disabled:opacity-50"
            >
              {busy ? t("Creating account...") : t("Register & Start Farm Setup")}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-[#7F3E00]">{t("Already have an account?")}{" "}
            <Link to="/login" className="font-bold text-[#643100] underline">{t("Log in")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}