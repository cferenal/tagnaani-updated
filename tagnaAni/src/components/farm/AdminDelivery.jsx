import { useSiteLanguage } from "@/lib/siteLanguage";
import { useState } from "react";
import { tagnaRequest } from "@/api/base44Client";

const button = "rounded-lg border border-[#643100]/40 px-3 py-2 disabled:opacity-50";
const field = "block w-full rounded-lg border border-[#643100]/40 p-2";

export function AdminDelivery({ canDeploy, schedulerConfigured, subscriberCount, jobs, reload }) {
  const { t } = useSiteLanguage();
  const [audience, setAudience] = useState("sms");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deployConfirm, setDeployConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const max = audience === "sms" ? 700 : 2000;

  async function drain() {
    while (true) {
      const result = await tagnaRequest("/admin/broadcast/drain", {});
      setStatus(`SMS broadcast queue · ${result.pending} pending`);
      if (!result.pending) break;
      await new Promise((resolve) => setTimeout(resolve, result.retryAfterMs || 6500));
    }
    await reload();
  }

  async function run(action) {
    setStatus("");
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-2xl space-y-5">
      <h2 className="font-display text-2xl font-bold">{t("Messages and deployment")}</h2>
      <p>{subscriberCount}{" " + t("SMS reminder subscribers.") + " "}{schedulerConfigured ? t("Reminder endpoint configured for the 6:00 a.m. schedule.") : t("Set up the 6:00 a.m. scheduler to start automatic delivery.")}</p>
      <form className="space-y-3 rounded-xl border border-[#643100]/25 p-4" onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          await tagnaRequest("/admin/broadcast", { audience, message, confirm });
          setMessage("");
          setConfirm("");
          if (audience === "sms") await drain();
          else setStatus("Announcement published on the dashboard.");
        });
      }}>
        <label className="block">{t("Audience")}<select className={field} value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="sms">{t("Daily reminder subscribers · SMS")}</option>
            <option value="app">{t("All app accounts · dashboard announcement")}</option>
          </select>
        </label>
        <label className="block">{t("Message")}<textarea className={field} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={max} required />
        </label>
        <p className="text-sm">{message.length}/{max}{" " + t("characters")}</p>
        <label className="block">{t("Type SEND to confirm")}<input className={field} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        <button disabled={busy || confirm !== "SEND" || message.trim().length > max || (audience === "sms" && !subscriberCount)} className={button}>
          {audience === "sms" ? t("Send SMS broadcast") : t("Publish announcement")}
        </button>
      </form>
      {jobs.some(({ kind, pending }) => kind === "broadcast" && pending > 0) && (
        <button type="button" className={button} disabled={busy} onClick={() => run(drain)}>{t("Resume pending SMS broadcast")}</button>
      )}
      {jobs.length > 0 && <ul className="space-y-1 text-sm">
        {jobs.map(({ id, kind, total, pending, accepted, failed, skipped }) =>
          <li key={id}>{kind === "daily" ? t("Daily reminder") : t("Manual broadcast")} · {total}{" " + t("recipients ·") + " "}{accepted}{" " + t("relay accepted ·") + " "}{pending}{" " + t("pending ·") + " "}{failed}{" " + t("failed ·") + " "}{skipped}{" " + t("skipped")}</li>)}
      </ul>}
      {canDeploy && <form className="space-y-3 border-t border-[#643100]/25 pt-4" onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          await tagnaRequest("/admin/redeploy", { confirm: deployConfirm });
          setDeployConfirm("");
          setStatus("Render accepted the request to deploy the latest linked commit.");
        });
      }}>
        <h3 className="font-display text-xl font-bold">{t("Deploy latest GitHub commit")}</h3>
        <label className="block">{t("Type REDEPLOY to confirm")}<input className={field} value={deployConfirm} onChange={(event) => setDeployConfirm(event.target.value)} /></label>
        <button className={button} disabled={busy || deployConfirm !== "REDEPLOY"}>{t("Redeploy on Render")}</button>
      </form>}
      {status && <p role="status">{t(status)}</p>}
    </section>
  );
}
