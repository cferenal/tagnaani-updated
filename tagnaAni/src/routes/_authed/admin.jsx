import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { AdminFarmerEditor, AdminInvite } from "@/components/farm/AdminAccountForms";
import { tagnaRequest } from "@/api/base44Client";

export const Route = createFileRoute("/_authed/admin")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  loader: () => tagnaRequest("/admin/users"),
  component: AdminPage,
});

function AdminPage() {
  const { users, smsOnly, smsHistory, auditLog, adminCount, adminLimit, canCreateAdmins } = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState(null);
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
      setEditing(null);
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
      <button type="button" className={button} onClick={() => router.invalidate()}>Refresh accounts and SMS history</button>
      {canCreateAdmins && <AdminInvite count={adminCount} limit={adminLimit} onCreated={() => router.invalidate()} />}
      {editing && <AdminFarmerEditor key={editing.id} account={editing} busy={busy}
        onCancel={() => setEditing(null)}
        onSave={(values) => execute("/admin/edit", values, "Farmer details saved.")} />}
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
              <td className="p-3">{user.pendingPhone ? `•••• ${user.pendingPhone} (pending)` : user.phone ? `•••• ${user.phone}` : "Unverified"}</td>
              <td className="p-3">{user.online ? "Signed in" : "Signed out"}</td>
              <td className="p-3">
                {user.role !== "admin" && <div className="flex flex-wrap gap-2">
                  <button type="button" className={button} disabled={busy}
                    onClick={() => { setEditing(user); setTarget(null); }}>Edit details</button>
                  <button type="button" className={button} disabled={busy || !user.phone}
                    onClick={() => execute("/admin/reset", { username: user.username }, "Reset code sent to the verified mobile number.")}>Send reset SMS</button>
                  <button type="button" className={button} disabled={busy}
                    onClick={() => { setTarget(user); setEditing(null); setConfirmation(""); }}>Delete account</button>
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
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Admin action log</h2>
        {auditLog.length === 0 && <p>No admin actions recorded yet.</p>}
        <ul className="divide-y divide-[#643100]/20">
          {auditLog.map(({ id, at, actor, target, action, changes }) => (
            <li key={id} className="break-words py-2 text-sm">
              <p className="font-semibold">{action} · {target}</p>
              <p>By {actor} · {new Date(at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</p>
              {changes.length > 0 && <ul className="list-disc pl-5">
                {changes.map(({ field, before, after }) =>
                  <li key={field}>{field} · {before || "—"} → {after}</li>)}
              </ul>}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">SMS advisory history</h2>
        <p className="text-sm">Requests are grouped by sender. Shows up to 1,000 requests from the last 30 days. A relay acceptance does not confirm delivery to the phone.</p>
        {smsHistory.length === 0 && <p className="text-sm">No new SMS advisory requests recorded yet.</p>}
        {smsHistory.map(({ phone, queries }) => (
          <details key={phone} className="rounded-xl border border-[#643100]/25 p-3">
            <summary className="cursor-pointer font-bold">{phone} · {queries.length} {queries.length === 1 ? "query" : "queries"}</summary>
            <ul className="mt-2 divide-y divide-[#643100]/20">
              {queries.map(({ id, at, city, crop, problem, lang, status }) => (
                <li key={id} className="break-words py-2 text-sm">
                  <p className="font-semibold">{city} · {crop} · {problem}</p>
                  <p>{new Date(at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} · {lang} · {
                    { pending: "Pending", accepted: "Relay accepted", failed: "Relay failed" }[status]
                  }</p>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </main>
  );
}
