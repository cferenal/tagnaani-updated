import { useSiteLanguage } from "@/lib/siteLanguage";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTACT_ROLES } from "@/lib/contacts";
import { MINDANAO_LOCATIONS } from "@/lib/farmData";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
const LABEL =
  "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function blank() {
  return {
    name: "",
    role: CONTACT_ROLES[0].value,
    phone: "",
    organization: "",
    location: "",
    supplies: "",
    notes: "",
  };
}

export default function ContactDialog({ open, onOpenChange, onSubmit, initial }) {
  const { t } = useSiteLanguage();
  const [form, setForm] = useState(blank());

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...blank(), ...initial } : blank());
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    onSubmit({
      name,
      role: form.role,
      phone: form.phone.trim(),
      organization: form.organization.trim(),
      location: form.location.trim(),
      supplies: form.supplies.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[400px] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-[21px]">
            {initial?.id ? t("Edit contact") : t("New contact")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className={LABEL}>{t("Name")}</label>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Rene Salvador"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>{t("Connected as")}</label>
              <select value={form.role} onChange={set("role")} className={FIELD}>
                {CONTACT_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {t(r.label)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t("Phone")}</label>
              <input
                value={form.phone}
                onChange={set("phone")}
                inputMode="tel"
                placeholder="0917 000 0000"
                className={FIELD}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>{t("Business")}</label>
              <input
                value={form.organization}
                onChange={set("organization")}
                placeholder={t("Optional")}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>{t("Place")}</label>
              <input
                value={form.location}
                onChange={set("location")}
                list="contact-locations"
                placeholder={t("Municipality")}
                className={FIELD}
              />
              <datalist id="contact-locations">
                {MINDANAO_LOCATIONS.map((l) => (
                  <option key={l.name} value={l.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className={LABEL}>{t("Supplies")}</label>
            <input
              value={form.supplies}
              onChange={set("supplies")}
              placeholder={t("Certified rice seeds")}
              className={FIELD}
            />
          </div>

          <div>
            <label className={LABEL}>{t("Note")}</label>
            <input
              value={form.notes}
              onChange={set("notes")}
              placeholder={t("Delivers every Tuesday")}
              className={FIELD}
            />
          </div>

          <button
            type="submit"
            disabled={!form.name.trim()}
            className="mt-1 w-full rounded-2xl bg-primary py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            {initial?.id ? t("Save changes") : t("Add contact")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}