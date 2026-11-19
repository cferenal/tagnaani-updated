import { useEffect, useState } from "react";
import { tagnaRequest } from "@/api/base44Client";

export function Announcements() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    tagnaRequest("/announcements").then(({ items }) => {
      if (active) setItems(items);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (!items.length) return null;
  return (
    <section className="mb-5 rounded-2xl border border-[#643100]/30 bg-[#EACAAE] p-4">
      <h2 className="font-display text-lg font-bold">Announcements</h2>
      <ul className="divide-y divide-[#643100]/25">
        {items.map(({ id, message, at }) => (
          <li key={id} className="whitespace-pre-wrap break-words py-2 text-sm">
            {message.split(/(https:\/\/[^\s<>"']+)/).map((part, index) => part.startsWith("https://")
              ? <a className="underline" key={index} href={part}>{part}</a> : part)}
            <p className="mt-1 text-xs">{new Date(at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
