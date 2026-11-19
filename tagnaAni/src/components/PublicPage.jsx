import { Link } from "@tanstack/react-router";

export const smsNumber = /^\+639\d{9}$/.test(import.meta.env.VITE_TAGNA_SMS_NUMBER || "")
  ? import.meta.env.VITE_TAGNA_SMS_NUMBER : "";

export function PublicPage({ children }) {
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 sm:px-9">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#643100]/20 py-5">
        <Link to="/" className="flex items-center gap-3 font-display text-xl font-bold">
          <img src="/logo.png" alt="" width="40" height="40" className="rounded-xl" /> Tagna-Ani
        </Link>
        <nav aria-label="Account" className="flex items-center gap-4 text-sm font-bold">
          <Link to="/login" className="underline-offset-4 hover:underline">Log in</Link>
          <Link to="/register" className="rounded-full bg-[#643100] px-4 py-2 !text-white">Register</Link>
        </nav>
      </header>
      <main className="grow">{children}</main>
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#643100]/20 py-6 text-sm">
        <Link to="/guides/sms">SMS guide</Link>
        <Link to="/guides/app">App guide</Link>
        <Link to="/about">About Team prECEsion</Link>
        <Link to="/contact">Contact us</Link>
      </footer>
    </div>
  );
}

export function PublicArticle({ title, children }) {
  return (
    <PublicPage>
      <article className="mx-auto max-w-2xl space-y-5 py-12 leading-relaxed sm:py-20">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        {children}
      </article>
    </PublicPage>
  );
}
