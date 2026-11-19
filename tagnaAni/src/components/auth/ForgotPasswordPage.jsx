import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { tagnaRequest } from "@/api/base44Client";

export function ForgotPasswordPage() {
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const field = "block w-full rounded-lg border border-[#643100]/40 px-3 py-2";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await tagnaRequest(requested ? "/reset/confirm" : "/reset/request", values);
      if (requested) {
        setComplete(true);
        setStatus("Password updated. You can now log in.");
      } else {
        setRequested(true);
        setStatus("If the mobile number matches a verified account, you’ll receive a reset code.");
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center px-5 py-9">
      <section className="rounded-3xl bg-card p-5">
        <h1 className="font-display text-2xl font-bold">Reset your password</h1>
        <p className="my-3 text-sm">Use the Philippine mobile number you verified in Tagna-Ani.</p>
        {!complete && <form onSubmit={submit} className="space-y-3">
          <label className="block">Username<input className={field} name="username" autoComplete="username" required /></label>
          {requested ? <>
            <label className="block">SMS reset code<input className={field} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" required /></label>
            <label className="block">New password<input className={field} name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          </> : (
            <label className="block">Verified mobile number<input className={field} name="phone" type="tel" autoComplete="tel" required /></label>
          )}
          <button type="submit" disabled={busy} className="rounded-lg bg-[#643100] px-4 py-2 !text-white disabled:opacity-50">{requested ? "Set new password" : "Send reset code"}</button>
        </form>}
        {status && <p role="status" className="mt-3 text-sm">{status}</p>}
        <Link to="/login" className="mt-4 block text-sm underline">Back to log in</Link>
      </section>
    </main>
  );
}
