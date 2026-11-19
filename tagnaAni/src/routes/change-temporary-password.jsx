import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { refreshSession, setSessionUser, tagnaRequest } from "@/api/base44Client";

export const Route = createFileRoute("/change-temporary-password")({
  ssr: false,
  beforeLoad: async () => {
    const user = await refreshSession();
    if (!user) throw redirect({ to: "/login" });
    if (!user.mustChangePassword) throw redirect({ to: "/dashboard" });
  },
  component: FirstPasswordPage,
});

function FirstPasswordPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const { password, confirm } = Object.fromEntries(new FormData(event.currentTarget));
    if (password !== confirm) {
      setStatus("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await tagnaRequest("/password/first-login", { password });
      setSessionUser(null);
      window.location.assign("/login");
    } catch (error) {
      setStatus(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-full place-items-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5">
        <h1 className="font-display text-2xl font-bold">Change your temporary password</h1>
        <p>Choose a new password of at least 12 characters. Then log in again with your new password.</p>
        {["password", "confirm"].map((name) => (
          <label key={name} className="block">{name === "password" ? "New password" : "Confirm new password"}
            <input className="block w-full rounded-lg border px-3 py-2" autoComplete="new-password"
              name={name} type="password" minLength={12} maxLength={128} required />
          </label>
        ))}
        {status && <p role="alert">{status}</p>}
        <button disabled={busy} className="rounded-lg bg-[#643100] px-4 py-2 !text-white disabled:opacity-50">Save new password</button>
      </form>
    </main>
  );
}
