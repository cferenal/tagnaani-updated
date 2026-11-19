import "@/api/base44Client";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, Pencil, Ruler } from "lucide-react";

import { db, getSessionUser, syncFarmProfile } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cacheGet, cacheSet } from "@/lib/offline";
import PageHeader from "@/components/farm/PageHeader";
import OfflineNotice from "@/components/farm/OfflineNotice";
import ProfileEditor from "@/components/farm/ProfileEditor";

export const Route = createFileRoute("/_authed/profile")({
  component: ProfilePage,
});

function Chip({ children }) {
  return (
    <span className="rounded-full border border-[#643100]/30 bg-[#EACAAE] px-3 py-1 text-[11.5px] font-bold text-[#643100]">
      {children}
    </span>
  );
}

function ProfilePage() {
  const { user, isLoadingAuth, logout } = useAuth();
  const currentUser = getSessionUser() || user;
  const uid = currentUser?.id || "device";

  const [profile, setProfile] = useState(null);
  const [offline, setOffline] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const cached = cacheGet(`profile:${uid}`)?.value;
    if (cached) setProfile(cached);
    try {
      const page = await db.entities.FarmProfile.list({ sort: "-created_date", limit: 1 });
      const found = page.items?.[0] || null;
      if (found) {
        setProfile(found);
        cacheSet(`profile:${uid}`, found);
      }
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [uid]);

  useEffect(() => {
    if (!isLoadingAuth) load();
  }, [isLoadingAuth, user, load]);

  async function handleSave(payload) {
    const saved = profile?.id
      ? await db.entities.FarmProfile.update(profile.id, payload)
      : await db.entities.FarmProfile.create(payload);
    setProfile(saved);
    cacheSet(`profile:${uid}`, saved);
    await syncFarmProfile(saved);
  }

  return (
    <div className="px-5 pt-9">
      <PageHeader
        eyebrow="Tagna-Ani · Your farm"
        title="Profile"
        subtitle="Empowering Farmers Through Knowledge and Technology. Kaalaman at teknolohiya para sa magsasaka."
        action={
          profile && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit profile"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#643100] bg-[#EACAAE] text-[#643100]"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.9} />
            </button>
          )
        }
      />

      {offline && <OfflineNotice className="mt-4" />}

      {!profile ? (
        <div className="mt-6 rounded-[1.35rem] border border-dashed border-[#643100]/40 bg-card/80 p-6 text-center">
          <p className="font-display text-[18px] text-[#643100]">No farm profile yet</p>
          <p className="mx-auto mt-2 max-w-[260px] text-[12.5px] leading-relaxed text-[#7F3E00]">
            Tell us where your farm is and what you grow so the advice fits your land.
          </p>
          <Link
            to="/onboarding"
            className="mt-4 inline-flex rounded-full border border-[#643100] bg-[#EACAAE] px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#643100]"
          >
            Set up profiling
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border-2 border-[#643100] bg-[#EACAAE] p-5 text-[#643100]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7F3E00]">
                {profile.region || "Mindanao"}
              </p>
              <span className="rounded-full border border-[#643100]/30 bg-card px-2.5 py-0.5 text-[10px] font-bold text-[#643100]">
                @{currentUser?.username || "farmer"}
              </span>
            </div>
            <h2 className="mt-2 text-[26px] font-bold leading-tight text-[#643100]">
              {profile.farmer_name}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-[#7F3E00]">
              {profile.city}
              {profile.province ? ` · ${profile.province}` : ""}
            </p>
            <div className="mt-4 flex items-center gap-2 border-t border-[#643100]/20 pt-3.5 text-[12.5px] font-semibold text-[#643100]">
              <Ruler className="h-4 w-4 text-[#643100]" strokeWidth={1.8} />
              {profile.farm_size || 0} hectares under management
            </div>
          </div>

          <section className="mt-7">
            <h3 className="eyebrow mb-3">Crops</h3>
            <div className="flex flex-wrap gap-1.5">
              {(profile.crops || []).map((crop) => (
                <Chip key={crop}>{crop}</Chip>
              ))}
              {(profile.crops || []).length === 0 && (
                <p className="text-[12.5px] text-[#7F3E00]">No crops added yet.</p>
              )}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="eyebrow mb-3">Challenges</h3>
            <div className="flex flex-wrap gap-1.5">
              {(profile.problems || []).map((problem) => (
                <Chip key={problem}>{problem}</Chip>
              ))}
              {(profile.problems || []).length === 0 && (
                <p className="text-[12.5px] text-[#7F3E00]">Nothing flagged.</p>
              )}
            </div>
          </section>
        </>
      )}

      <div className="mt-7 flex items-center gap-3 rounded-[1.35rem] border border-border/80 bg-card p-4">
        <img
          src="/logo.png"
          alt="Tagna-Ani"
          className="h-12 w-12 shrink-0 rounded-xl border border-[#643100]/30 bg-[#EACAAE] object-cover"
        />
        <div>
          <p className="font-display text-[15px] font-bold text-[#643100]">Tagna-Ani</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#7F3E00]">
            Empowering Farmers Through Knowledge and Technology. Kaalaman at teknolohiya para sa magsasaka.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => logout()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#643100] bg-[#EACAAE] py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#643100] transition-transform active:scale-98"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
        Log out
      </button>

      {profile && (
        <ProfileEditor
          open={editing}
          onOpenChange={setEditing}
          profile={profile}
          onSave={handleSave}
        />
      )}
    </div>
  );
}