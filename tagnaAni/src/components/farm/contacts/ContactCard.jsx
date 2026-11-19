import { useSiteLanguage } from "@/lib/siteLanguage";
import { ArrowRight, CheckCircle2, MapPin, Package, Pencil, Phone, Trash2 } from "lucide-react";
import { avatarTone, initials, roleLabel, telHref } from "@/lib/contacts";
import { cn } from "@/lib/utils";

function InfoBox({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1rem] border border-border/60 bg-background/70 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" strokeWidth={1.9} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-[12.5px] font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function ContactCard({ contact, onEdit, onDelete }) {
  const { t } = useSiteLanguage();
  const call = telHref(contact.phone);

  return (
    <article className="card-soft p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tracking-wide text-primary-foreground",
            avatarTone(contact.name),
          )}
        >
          {initials(contact.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate font-display text-[16.5px] leading-tight text-olive-ink">
                {contact.name}
              </p>
              {contact.verified && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-olive" strokeWidth={2} />
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onEdit(contact)}
                aria-label={t("Edit {name}", { name: contact.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="h-3 w-3" strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(contact.id)}
                aria-label={t("Remove {name}", { name: contact.name })}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.9} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="olive-chip rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.03em]">
              {roleLabel(contact.role)}
            </span>
            {contact.location && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10.5px] text-muted-foreground">
                <MapPin className="h-3 w-3" strokeWidth={1.9} />
                {contact.location}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoBox
          icon={Package}
          label={t("Supplies")}
          value={contact.supplies || contact.organization || "—"}
        />
        <InfoBox icon={Phone} label={t("Phone")} value={contact.phone || t("Not saved")} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("Note")}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {contact.notes || t("No note yet")}
          </p>
        </div>
        {call ? (
          <a
            href={call}
            className="olive-solid inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-semibold transition-transform active:scale-95"
          >{t("Call")}<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-3.5 py-2 text-[11.5px] font-semibold text-muted-foreground">{t("No number")}</span>
        )}
      </div>
    </article>
  );
}