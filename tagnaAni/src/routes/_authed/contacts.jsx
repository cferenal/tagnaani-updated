const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAuth } from "@/lib/AuthContext";
import { cacheGet, cacheSet, isOnline } from "@/lib/offline";
import { isSupplier, roleLabel } from "@/lib/contacts";
import ContactsHeader from "@/components/farm/contacts/ContactsHeader";
import ContactCard from "@/components/farm/contacts/ContactCard";
import ContactDialog from "@/components/farm/contacts/ContactDialog";
import OfflineNotice from "@/components/farm/OfflineNotice";

export const Route = createFileRoute("/_authed/contacts")({
  component: ContactsPage,
});

function matches(contact, query) {
  const haystack = [
    contact.name,
    contact.organization,
    contact.location,
    contact.supplies,
    roleLabel(contact.role),
  ];
  return haystack.some((v) => v && String(v).toLowerCase().includes(query));
}

function ContactsPage() {
  const { user, isLoadingAuth } = useAuth();
  const uid = user?.id || "device";

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const cached = cacheGet(`contacts:${uid}`)?.value;
    if (cached) {
      setContacts(cached);
      setLoading(false);
    }

    try {
      const page = await db.entities.Contact.list({ sort: "-created_date", limit: 200 });
      const items = page.items || [];
      setContacts(items);
      cacheSet(`contacts:${uid}`, items);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
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

  async function handleSave(data) {
    const id = editing?.id;
    try {
      if (id) {
        const updated = await db.entities.Contact.update(id, data);
        const next = contacts.map((c) => (c.id === id ? updated : c));
        setContacts(next);
        cacheSet(`contacts:${uid}`, next);
      } else {
        const created = await db.entities.Contact.create(data);
        const next = [created, ...contacts];
        setContacts(next);
        cacheSet(`contacts:${uid}`, next);
      }
      setDialogOpen(false);
      setEditing(null);
    } catch {
      toast.error(
        isOnline()
          ? "Couldn't save that contact. Try again in a moment."
          : "You're offline — connect to the internet to save this contact.",
      );
    }
  }

  async function handleDelete(id) {
    try {
      await db.entities.Contact.delete(id);
      const next = contacts.filter((c) => c.id !== id);
      setContacts(next);
      cacheSet(`contacts:${uid}`, next);
    } catch {
      toast.error("Couldn't remove that contact. Try again when you're back online.");
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q ? contacts.filter((c) => matches(c, q)) : contacts;
  const suppliers = contacts.filter(isSupplier).length;

  return (
    <div>
      <ContactsHeader
        query={query}
        onQueryChange={setQuery}
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />

      <div className="px-5">
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[19px] leading-none text-olive-ink">Your network</h2>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} · {suppliers}{" "}
              {suppliers === 1 ? "supplier" : "suppliers"}
            </p>
          </div>
          <span className="olive-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em]">
            <span className="h-1.5 w-1.5 rounded-full bg-olive" />
            In your circle
          </span>
        </div>

        {offline && <OfflineNotice className="mt-4" />}

        {loading ? (
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[172px] animate-pulse rounded-[1.65rem] border border-border/60 bg-card/60"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-[1.35rem] border border-dashed border-border bg-card/60 p-6 text-center">
            <p className="font-display text-[17px]">
              {contacts.length === 0 ? "No contacts yet" : "No one matches that search"}
            </p>
            <p className="mx-auto mt-2 max-w-[250px] text-[12.5px] leading-relaxed text-muted-foreground">
              {contacts.length === 0
                ? "Save your seed and fertilizer suppliers, your buyer and the technician you call — numbers and terms stay on this device, offline too."
                : "Try another name, supplier type or place."}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {visible.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={(c) => {
                  setEditing(c);
                  setDialogOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          Contacts save on this device first
        </p>
      </div>

      <ContactDialog
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