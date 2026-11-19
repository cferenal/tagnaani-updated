import { useSiteLanguage } from "@/lib/siteLanguage";
import { useState } from "react";
import { tagnaRequest } from "@/api/base44Client";
import LocationPicker from "@/components/farm/onboarding/LocationPicker";
import { CROPS, PROBLEMS } from "@/lib/farmData";

const field = "block w-full rounded-lg border border-[#643100]/40 px-3 py-2";
const button = "rounded-lg border border-[#643100]/40 px-3 py-2 disabled:opacity-50";

export function AdminInvite({ count, limit, onCreated }) {
  const { t } = useSiteLanguage();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setInvite(null);
    try {
      setInvite(await tagnaRequest("/admin/create", { username: new FormData(form).get("username") }));
      form.reset();
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[#643100]/25 p-4">
      <h2 className="font-display text-2xl font-bold">{t("Create an administrator")}</h2>
      <p>{count}{" " + t("of") + " "}{limit}{" " + t("admin accounts in use, including yours.")}</p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label>{t("Admin username")}<input className={field} name="username" minLength={2} maxLength={40} required />
        </label>
        <button className={button} disabled={busy || count >= limit}>{t("Create admin")}</button>
      </form>
      {error && <p role="alert">{t(error)}</p>}
      {invite && <div className="space-y-1 rounded-lg bg-[#ead0b3] p-3" role="status">
        <p>{t("Give these credentials to") + " "}<strong>{invite.username}</strong>{" " + t("privately. They will change the password at first login.")}</p>
        <p>{t("Temporary password") + " "}<code className="select-all break-all">{invite.temporaryPassword}</code></p>
        <button className={button} type="button" onClick={() => setInvite(null)}>{t("Hide password")}</button>
      </div>}
    </section>
  );
}

export function AdminFarmerEditor({ account, busy, onCancel, onSave }) {
  const { t } = useSiteLanguage();
  const [location, setLocation] = useState(null);
  const [changeLocation, setChangeLocation] = useState(false);
  const [phone, setPhone] = useState("");
  const [crop, setCrop] = useState(account.crop);
  const [problem, setProblem] = useState(account.problem);

  function submit(event) {
    event.preventDefault();
    onSave({ userId: account.id, username: account.username,
      ...(phone.trim() && { phone }), ...(location && changeLocation && { location }),
      ...(crop !== account.crop && { crop }), ...(problem !== account.problem && { problem }),
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-3 rounded-xl border border-[#643100]/25 p-4">
      <h2 className="font-display text-2xl font-bold">{t("Edit") + " "}{account.username}</h2>
      <p>{t("Current farm location") + " "}{account.city || "—"}</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={changeLocation} onChange={(event) => setChangeLocation(event.target.checked)} />{t("Change farm location")}</label>
      {changeLocation && <LocationPicker value={location} onChange={setLocation} />}
      <label className="block">{t("New Philippine mobile number")}<input className={field} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("Leave blank to keep the current number")} />
      </label>
      {phone.trim() && <p className="text-sm">{t("The farmer must verify the new number before using SMS recovery. The old number’s daily reminders will stop.")}</p>}
      <label className="block">{t("Current crop")}<input className={field} value={crop} maxLength={100} list="admin-crops" onChange={(event) => setCrop(event.target.value)} />
      </label>
      <datalist id="admin-crops">{CROPS.map((item) => <option key={item} value={item} />)}</datalist>
      <label className="block">{t("Current problem")}<input className={field} maxLength={100} value={problem} list="admin-problems" onChange={(event) => setProblem(event.target.value)} />
      </label>
      <datalist id="admin-problems">{PROBLEMS.map((item) => <option key={item} value={item} />)}</datalist>
      <button className={button} disabled={busy || (changeLocation && !location)}>{t("Save farmer details")}</button>{" "}
      <button type="button" className={button} onClick={onCancel}>{t("Cancel")}</button>
    </form>
  );
}
