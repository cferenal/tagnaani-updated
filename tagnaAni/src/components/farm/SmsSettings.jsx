import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { getSessionUser, tagnaRequest } from "@/api/base44Client";
import { smsNumber } from "@/components/PublicPage";

export function SmsSettings() {
  const [user, setUser] = useState(getSessionUser);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [command, setCommand] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function perform(action) {
    setBusy(true);
    setStatus("");
    try {
      await action();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (user?.role === "admin") return null;

  return (
    <section className="card-soft mt-6 space-y-3 p-4 text-sm">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BellRing size={17} /> SMS settings</h2>
      <p>Verify a Philippine mobile number to use SMS recovery and daily reminders.</p>
      {user?.phone && <p>Verified number ending in <strong>{user.phone.slice(-4)}</strong>.</p>}
      <form className="space-y-2" onSubmit={(event) => {
        event.preventDefault();
        perform(async () => {
          const pairing = await tagnaRequest("/phone", { phone, password });
          setPassword("");
          setCommand(pairing.command);
        });
      }}>
        <label className="block" htmlFor="sms-phone">Mobile number</label>
        <input id="sms-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-lg border border-[#643100]/35 px-3 py-2" autoComplete="tel" required />
        {user?.phone && <label className="block">Current password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#643100]/35 px-3 py-2"
            autoComplete="current-password" required />
        </label>}
        <button type="submit" disabled={busy || !smsNumber} className="rounded-lg border border-[#643100]/40 px-3 py-2 disabled:opacity-50">Get verification command</button>
      </form>
      {!smsNumber && <p>SMS verification will be available when a service number is published.</p>}
      {command && (
        <div className="space-y-2 rounded-xl bg-[#ead0b3] p-3">
          <p>From the number you entered, text <code>{command}</code> to <a className="underline" href={`sms:${smsNumber}`}>{smsNumber}</a> within 10 minutes.</p>
          <button type="button" disabled={busy} className="underline" onClick={() => perform(async () => {
            const fresh = (await tagnaRequest("/me")).user;
            setUser(fresh);
            setStatus(fresh.phone !== user?.phone ? "Mobile number verified." : "No change yet. Check your SMS and try again.");
            if (fresh.phone !== user?.phone) setCommand("");
          })}>Check verification</button>
        </div>
      )}
      {user?.phone && (
        <button type="button" disabled={busy} className="rounded-lg border border-[#643100]/40 px-3 py-2"
          onClick={() => perform(async () => {
            const result = await tagnaRequest("/subscription", { subscribed: !user.subscribed });
            setUser(result.user);
            setStatus(result.user.subscribed ? "Daily reminders are on." : "Daily reminders are off.");
          })}>
          {user.subscribed ? "Turn off daily reminders" : "Opt in to daily reminders"}
        </button>
      )}
      {status && <p role="status">{status}</p>}
      <Link to="/guides/sms" className="block underline">Read the SMS guide</Link>
    </section>
  );
}
