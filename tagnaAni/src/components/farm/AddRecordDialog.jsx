import { useSiteLanguage } from "@/lib/siteLanguage";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CROPS, EXPENSE_CATEGORIES, todayKey } from "@/lib/farmData";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
const LABEL = "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function blank() {
  return {
    crop: CROPS[0],
    planted_seeds: "",
    current_crop_count: "",
    stored_seeds: "",
    harvest_kg: "",
    money_kind: "expense",
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    date: todayKey(),
    notes: "",
  };
}

export default function AddRecordDialog({ open, onOpenChange, onSubmit, initial }) {
  const { t } = useSiteLanguage();
  const [tab, setTab] = useState("crop");
  const [form, setForm] = useState(blank());

  useEffect(() => {
    if (!open) return;
    if (initial?.target === "crop") {
      setTab("crop");
      setForm({ ...blank(), ...initial.data, date: initial.data.date || todayKey() });
    } else if (initial?.target === "money") {
      setTab("money");
      setForm({
        ...blank(),
        ...initial.data,
        money_kind: initial.data.kind || "expense",
        amount: String(initial.data.amount ?? ""),
        date: initial.data.date || todayKey(),
      });
    } else {
      setTab("crop");
      setForm(blank());
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  function submit(e) {
    e.preventDefault();
    if (tab === "crop") {
      onSubmit({
        target: "crop",
        data: {
          crop: form.crop,
          planted_seeds: num(form.planted_seeds),
          current_crop_count: num(form.current_crop_count),
          stored_seeds: num(form.stored_seeds),
          harvest_kg: num(form.harvest_kg),
          date: form.date,
          notes: form.notes,
        },
      });
    } else {
      onSubmit({
        target: "money",
        data: {
          kind: form.money_kind,
          category: form.category,
          amount: num(form.amount),
          crop: form.crop,
          date: form.date,
          notes: form.notes,
        },
      });
    }
  }

  const isEdit = Boolean(initial?.data?.id);
  const disabled = tab === "money" ? !form.amount : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[400px] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-[21px]">
            {isEdit ? t("Edit entry") : t("New record")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1.5 rounded-full bg-muted p-1">
          {[
            { value: "crop", label: "Crop cycle" },
            { value: "money", label: "Money" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={cn(
                "flex-1 rounded-full py-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-colors",
                tab === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {t(option.label)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {tab === "crop" ? (
            <>
              <div>
                <label className={LABEL}>{t("Crop")}</label>
                <select value={form.crop} onChange={set("crop")} className={FIELD}>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>{t("Seeds planted")}</label>
                  <input value={form.planted_seeds} onChange={set("planted_seeds")} inputMode="numeric" placeholder="0" className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>{t("Standing plants")}</label>
                  <input value={form.current_crop_count} onChange={set("current_crop_count")} inputMode="numeric" placeholder="0" className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>{t("Seed stock")}</label>
                  <input value={form.stored_seeds} onChange={set("stored_seeds")} inputMode="numeric" placeholder="0" className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>{t("Harvest (kg)")}</label>
                  <input value={form.harvest_kg} onChange={set("harvest_kg")} inputMode="decimal" placeholder="0" className={FIELD} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-1.5">
                {[
                  { value: "expense", label: "Expense" },
                  { value: "revenue", label: "Revenue" },
                ].map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, money_kind: k.value }))}
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors",
                      form.money_kind === k.value
                        ? "border-primary bg-secondary text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {t(k.label)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>{t("Category")}</label>
                  <select value={form.category} onChange={set("category")} className={FIELD}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>{t("Amount (₱)")}</label>
                  <input value={form.amount} onChange={set("amount")} inputMode="decimal" placeholder="0" className={FIELD} />
                </div>
              </div>
              <div>
                <label className={LABEL}>{t("Crop")}</label>
                <select value={form.crop} onChange={set("crop")} className={FIELD}>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>{t("Date")}</label>
              <input type="date" value={form.date} onChange={set("date")} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>{t("Note")}</label>
              <input value={form.notes} onChange={set("notes")} placeholder={t("Optional")} className={FIELD} />
            </div>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="mt-1 w-full rounded-2xl bg-primary py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            {isEdit ? t("Save changes") : t("Add record")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}