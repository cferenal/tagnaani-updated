import { useSiteLanguage } from "@/lib/siteLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, CloudRain, Sun } from "lucide-react";

const TONE = {
  rain: { Icon: CloudRain, className: "bg-[#2E6B44]/10 text-[#2E6B44]" },
  heat: { Icon: Sun, className: "bg-[#B4452F]/10 text-[#B4452F]" },
  warn: { Icon: AlertTriangle, className: "bg-[#9A6B12]/10 text-[#9A6B12]" },
};

export default function AlertsSheet({ alerts = [], trigger }) {
  const { t } = useSiteLanguage();
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[400px] rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px]">{t("Field notifications")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2.5">
          {alerts.length === 0 && (
            <p className="text-[13px] text-muted-foreground">{t("No weather alerts for the days ahead.")}</p>
          )}
          {alerts.map((a) => {
            const tone = TONE[a.tone] || TONE.warn;
            return (
              <div key={a.title} className="flex gap-3 rounded-2xl border border-border/80 p-3.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.className}`}>
                  <tone.Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold leading-snug">{a.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{a.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}