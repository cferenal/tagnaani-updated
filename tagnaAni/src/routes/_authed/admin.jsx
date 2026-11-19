import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { tagnaRequest } from "@/api/base44Client";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  loader: () => tagnaRequest("/admin/users"),
  component: AdminPage,
});

function AdminPage() {
  const { users, smsOnly } = Route.useLoaderData();
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const button = "rounded-lg border border-[#643100]/40 px-3 py-1.5 disabled:opacity-50";

  async function execute(path, data, success) {
    setBusy(true);
    setStatus("");
    try {
      await tagnaRequest(path, data);
      setTarget(null);
      setConfirmation("");
      await router.invalidate();
      setStatus(success);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Link to="/dashboard" className="text-sm underline">Back to dashboard</Link>
      <h1 className="font-display text-4xl font-bold">Manage accounts</h1>
      <button type="button" className={button} onClick={() => router.invalidate()}>Refresh accounts</button>
      {status && <p role="status">{status}</p>}
      {target && <form className="space-y-3 rounded-xl border border-[#643100]/40 p-4" onSubmit={(event) => {
        event.preventDefault();
        execute("/admin/delete", { userId: target.id, username: target.username, confirm: confirmation }, "Account deleted.");
      }}>
        <label className="block">Type <strong>{target.username}</strong> to permanently delete this account.
          <input className="ml-2 rounded border px-2 py-1" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </label>
        <button className={button} disabled={busy || confirmation !== target.username}>Confirm deletion</button>{" "}
        <button type="button" className={button} onClick={() => setTarget(null)}>Cancel</button>
      </form>}
      <div className="overflow-x-auto rounded-xl border border-[#643100]/25">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#ead0b3]"><tr>
            {["Username", "Location", "Crop", "Problem", "Daily SMS", "Mobile", "Session", "Actions"].map((label) =>
              <th key={label} scope="col" className="p-3">{label}</th>)}
          </tr></thead>
          <tbody>
            {users.map((user) => <tr key={user.id} className="border-t border-[#643100]/20">
              <th scope="row" className="p-3">{user.username}{user.role === "admin" && " (admin)"}</th>
              <td className="p-3">{user.city || "—"}</td>
              <td className="p-3">{user.crop || "—"}</td>
              <td className="p-3">{user.problem || "—"}</td>
              <td className="p-3">{user.subscribed ? "On" : "Off"}</td>
              <td className="p-3">{user.phone ? `•••• ${user.phone.slice(-4)}` : "Unverified"}</td>
              <td className="p-3">{user.online ? "Signed in" : "Signed out"}</td>
              <td className="p-3">
                {user.role !== "admin" && <div className="flex flex-wrap gap-2">
                  <button type="button" className={button} disabled={busy || !user.phone}
                    onClick={() => execute("/admin/reset", { username: user.username }, "Reset code sent to the verified mobile number.")}>Send reset SMS</button>
                  <button type="button" className={button} disabled={busy}
                    onClick={() => { setTarget(user); setConfirmation(""); }}>Delete account</button>
                </div>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {smsOnly.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold">SMS-only daily subscribers</h2>
          <div className="overflow-x-auto rounded-xl border border-[#643100]/25">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#ead0b3]"><tr>
                {["Mobile ending", "Location", "Crop", "Problem"].map((label) =>
                  <th key={label} scope="col" className="p-3">{label}</th>)}
              </tr></thead>
              <tbody>{smsOnly.map((entry, i) => <tr key={i} className="border-t border-[#643100]/20">
                <td className="p-3">•••• {entry.mobileEnding}</td>
                <td className="p-3">{entry.city}</td>
                <td className="p-3">{entry.crop}</td>
                <td className="p-3">{entry.problem}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
