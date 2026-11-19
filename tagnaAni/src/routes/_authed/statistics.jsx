import { useSiteLanguage } from "@/lib/siteLanguage";
const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useAuth } from "@/lib/AuthContext";
import { cacheGet, cacheSet } from "@/lib/offline";
import { formatPeso } from "@/lib/farmData";
import { moneyStatistics } from "@/lib/statistics";
import PageHeader from "@/components/farm/PageHeader";
import OfflineNotice from "@/components/farm/OfflineNotice";
import MoneyTotals from "@/components/farm/MoneyTotals";
import MoneyBreakdown from "@/components/farm/MoneyBreakdown";

export const Route = createFileRoute("/_authed/statistics")({
  component: StatisticsPage,
});

function StatisticsPage() {
  const { t } = useSiteLanguage();
  const { user, isLoadingAuth } = useAuth();
  const uid = user?.id || "device";

  const [transactions, setTransactions] = useState([]);
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const cached = cacheGet(`transactions:${uid}`)?.value;
    if (cached) setTransactions(cached);

    try {
      const page = await db.entities.Transaction.list({ sort: "-created_date", limit: 200 });
      const items = page.items || [];
      setTransactions(items);
      cacheSet(`transactions:${uid}`, items);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setReady(true);
    }
  }, [uid]);

  useEffect(() => {
    if (!isLoadingAuth && user) load();
  }, [isLoadingAuth, user, load]);

  useEffect(() => {
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const stats = moneyStatistics(transactions);

  return (
    <div className="px-5 pt-9">
      <PageHeader
        eyebrow="Money · saved on device"
        title={t("Statistics")}
        subtitle={t("Every peso you logged, added up even without signal.")}
      />

      {offline && <OfflineNotice className="mt-4" />}

      <MoneyTotals totals={stats} />

      {stats.rows.length > 0 ? (
        <div className="mt-8">
          <MoneyBreakdown
            title={t("Where the money goes")}
            note={`${formatPeso(stats.expense)} · ${stats.entries} entries`}
            rows={stats.rows}
          />
        </div>
      ) : ready ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-border/80 bg-card/50 p-6 text-center">
          <p className="font-display text-[17px]">{t("No money entries yet")}</p>
          <p className="mx-auto mt-2 max-w-[250px] text-[12.5px] leading-relaxed text-muted-foreground">{t("Log fertilizer, seeds and every sale in Records. Your totals and this breakdown build themselves, online or offline.")}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-2.5">
          <div className="h-28 animate-pulse rounded-[1.65rem] bg-muted" />
          <div className="h-20 animate-pulse rounded-[1.65rem] bg-muted" />
        </div>
      )}

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{t("Totals follow the entries saved on this device")}</p>
    </div>
  );
}