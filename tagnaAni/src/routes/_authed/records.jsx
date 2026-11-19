const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { cacheGet, cacheSet, isOnline, queueAdd, queueGet, queueReplace } from "@/lib/offline";
import { inventoryTotals, moneyTotals } from "@/lib/advice";
import PageHeader from "@/components/farm/PageHeader";
import OfflineNotice from "@/components/farm/OfflineNotice";
import RecordStats from "@/components/farm/RecordStats";
import MoneySummary from "@/components/farm/MoneySummary";
import CropRecordCard from "@/components/farm/CropRecordCard";
import TransactionRow from "@/components/farm/TransactionRow";
import AddRecordDialog from "@/components/farm/AddRecordDialog";

export const Route = createFileRoute("/_authed/records")({
  component: RecordsPage,
});

async function flushQueue(key, createFn) {
  const items = queueGet(key);
  if (!items.length || !isOnline()) return;
  const remaining = [];
  for (const item of items) {
    try {
      await createFn(item.data);
    } catch {
      remaining.push(item);
    }
  }
  queueReplace(key, remaining);
}

function SectionTitle({ children, count }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="eyebrow">{children}</h3>
      {count > 0 && <span className="text-[11px] text-muted-foreground">{count}</span>}
    </div>
  );
}

function RecordsPage() {
  const { user, isLoadingAuth } = useAuth();
  const uid = user?.id || "device";

  const [records, setRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [offline, setOffline] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const cachedRecords = cacheGet(`records:${uid}`)?.value;
    const cachedTx = cacheGet(`transactions:${uid}`)?.value;
    if (cachedRecords) setRecords(cachedRecords);
    if (cachedTx) setTransactions(cachedTx);

    await Promise.all([
      flushQueue(`records:${uid}`, (data) => db.entities.CropRecord.create(data)),
      flushQueue(`transactions:${uid}`, (data) => db.entities.Transaction.create(data)),
    ]);

    let failed = false;
    const [rRes, tRes] = await Promise.allSettled([
      db.entities.CropRecord.list({ sort: "-created_date", limit: 200 }),
      db.entities.Transaction.list({ sort: "-created_date", limit: 200 }),
    ]);

    if (rRes.status === "fulfilled") {
      const items = rRes.value.items || [];
      setRecords(items);
      cacheSet(`records:${uid}`, items);
    } else failed = true;

    if (tRes.status === "fulfilled") {
      const items = tRes.value.items || [];
      setTransactions(items);
      cacheSet(`transactions:${uid}`, items);
    } else failed = true;

    setOffline(failed);
  }, [uid]);

  useEffect(() => {
    if (!isLoadingAuth && user) load();
  }, [isLoadingAuth, user, load]);

  useEffect(() => {
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const stats = inventoryTotals(records);
  const money = moneyTotals(transactions);

  async function handleSave({ target, data }) {
    const editingId = editing?.data?.id;
    const isPending = typeof editingId === "string" && editingId.startsWith("pending-");

    if (target === "crop") {
      if (editingId && !isPending) {
        const updated = await db.entities.CropRecord.update(editingId, data);
        const next = records.map((r) => (r.id === editingId ? updated : r));
        setRecords(next);
        cacheSet(`records:${uid}`, next);
      } else {
        try {
          const created = await db.entities.CropRecord.create(data);
          const next = [created, ...records];
          setRecords(next);
          cacheSet(`records:${uid}`, next);
        } catch {
          const temp = { ...data, id: `pending-${Date.now()}`, pending: true };
          const next = [temp, ...records];
          setRecords(next);
          cacheSet(`records:${uid}`, next);
          queueAdd(`records:${uid}`, { data });
          setOffline(true);
        }
      }
    } else if (editingId && !isPending) {
      const updated = await db.entities.Transaction.update(editingId, data);
      const next = transactions.map((t) => (t.id === editingId ? updated : t));
      setTransactions(next);
      cacheSet(`transactions:${uid}`, next);
    } else {
      try {
        const created = await db.entities.Transaction.create(data);
        const next = [created, ...transactions];
        setTransactions(next);
        cacheSet(`transactions:${uid}`, next);
      } catch {
        const temp = { ...data, id: `pending-${Date.now()}`, pending: true };
        const next = [temp, ...transactions];
        setTransactions(next);
        cacheSet(`transactions:${uid}`, next);
        queueAdd(`transactions:${uid}`, { data });
        setOffline(true);
      }
    }

    setDialogOpen(false);
    setEditing(null);
  }

  async function deleteCrop(id) {
    await db.entities.CropRecord.delete(id);
    const next = records.filter((r) => r.id !== id);
    setRecords(next);
    cacheSet(`records:${uid}`, next);
  }

  async function deleteTransaction(id) {
    await db.entities.Transaction.delete(id);
    const next = transactions.filter((t) => t.id !== id);
    setTransactions(next);
    cacheSet(`transactions:${uid}`, next);
  }

  return (
    <div className="px-5 pt-9">
      <PageHeader
        eyebrow="Inventory & money"
        title="Records"
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            aria-label="Add record"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        }
      />

      {offline && <OfflineNotice className="mt-4" />}

      <div className="mt-6 space-y-2.5">
        <RecordStats totals={stats} />
        <MoneySummary totals={money} />
      </div>

      <section className="mt-8">
        <SectionTitle count={records.length}>Crop cycles</SectionTitle>
        {records.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-border bg-card/60 p-6 text-center">
            <p className="font-display text-[17px]">No crop records yet</p>
            <p className="mx-auto mt-2 max-w-[240px] text-[12.5px] leading-relaxed text-muted-foreground">
              Add what you planted, the seed you hold and the harvest so far. Advice then follows your own numbers.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {records.map((record) => (
              <CropRecordCard
                key={record.id}
                record={record}
                onEdit={(r) => {
                  setEditing({ target: "crop", data: r });
                  setDialogOpen(true);
                }}
                onDelete={deleteCrop}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle count={transactions.length}>Money entries</SectionTitle>
        {transactions.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-border bg-card/60 p-6 text-center">
            <p className="font-display text-[17px]">Keep the books light</p>
            <p className="mx-auto mt-2 max-w-[240px] text-[12.5px] leading-relaxed text-muted-foreground">
              Log fertilizer, seeds, labour and every sale. Your expenses and revenue totals build themselves.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((item) => (
              <TransactionRow key={item.id} item={item} onDelete={deleteTransaction} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Records save on this device first
      </p>

      <AddRecordDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={handleSave}
        initial={editing}
      />
    </div>
  );
}