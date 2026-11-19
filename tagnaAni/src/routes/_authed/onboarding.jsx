import "@/api/base44Client";
import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { db, getSessionUser, syncFarmProfile } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { cacheGet, cacheSet } from "@/lib/offline";
import { findLocation } from "@/lib/farmData";
import LocationPicker from "@/components/farm/onboarding/LocationPicker";
import CropPicker from "@/components/farm/onboarding/CropPicker";
import ProblemsPicker from "@/components/farm/onboarding/ProblemsPicker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/onboarding")({
  component: OnboardingPage,
});

const STEPS = [
  { key: "farm", label: "Your farm", question: "Where do you farm?" },
  { key: "crops", label: "What you grow", question: "What is on your land?" },
  { key: "problems", label: "Challenges", question: "What gets in the way?" },
  { key: "review", label: "Review", question: "Ready to begin?" },
];

const FIELD =
  "w-full rounded-xl border border-[#643100]/45 bg-[#EACAAE] px-3.5 py-3 text-[15px] text-[#643100] placeholder:text-[#7F3E00]/65 outline-none focus:border-[#643100] focus:ring-2 focus:ring-[#643100]/25";

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessionUser = getSessionUser() || user;
  const uid = sessionUser?.id || "device";

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);
  // Leave name blank after registration so the farmer types their name manually
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [crops, setCrops] = useState([]);
  const [problems, setProblems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function prefill() {
      const cached = cacheGet(`profile:${uid}`)?.value;
      let existing = null;
      try {
        const page = await db.entities.FarmProfile.list({ sort: "-created_date", limit: 1 });
        existing = page.items?.[0] || cached || null;
      } catch {
        existing = cached || null;
      }
      if (cancelled || !existing) return;
      setProfile(existing);
      setName(existing.farmer_name || "");
      setLocationName(existing.city || "");
      setFarmSize(existing.farm_size ? String(existing.farm_size) : "");
      setCrops(existing.crops || []);
      setProblems(existing.problems || []);
    }
    prefill();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const current = STEPS[step];

  const canContinue =
    step === 0
      ? name.trim().length > 1 && !!locationName
      : step === 1
        ? crops.length > 0 && parseFloat(farmSize) > 0
        : step === 2
          ? problems.length > 0
          : true;

  const location = locationName ? findLocation(locationName) : null;

  async function finish() {
    const loc = findLocation(locationName);
    const payload = {
      farmer_name: name.trim(),
      city: loc.name,
      province: loc.province,
      region: loc.region,
      latitude: loc.lat,
      longitude: loc.lon,
      farm_size: parseFloat(farmSize) || 0,
      crops,
      problems,
      onboarded: true,
    };
    try {
      setSaving(true);
      setError("");
      const saved = profile?.id
        ? await db.entities.FarmProfile.update(profile.id, payload)
        : await db.entities.FarmProfile.create(payload);
      cacheSet(`profile:${uid}`, saved);
      await syncFarmProfile(saved);
      navigate({ to: "/dashboard" });
    } catch {
      setError("We could not save your profile. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden px-5 pb-8 pt-9">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#643100] bg-[#EACAAE] text-[#643100]"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )}
          <img
            src="/logo.png"
            alt="Tagna-Ani Logo"
            className="h-10 w-10 rounded-xl border border-[#643100]/40 bg-[#EACAAE] object-cover"
          />
          <div>
            <span className="block font-display text-[16px] font-bold leading-none text-[#643100]">
              Tagna-Ani
            </span>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#7F3E00]">
              Farm profiling
            </span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-5 bg-[#643100]" : i < step ? "w-1.5 bg-[#643100]/50" : "w-1.5 bg-[#EACAAE]",
              )}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[#7F3E00]">
        <strong className="text-[#643100]">Empowering Farmers Through Knowledge and Technology.</strong>{" "}
        <span className="italic">Kaalaman at teknolohiya para sa magsasaka.</span>
      </p>

      <div className="mt-8">
        <p className="eyebrow">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-3 text-[32px] leading-[1.1] text-[#643100]">{current.question}</h1>
      </div>

      <div className="mt-7 flex-1">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]">
                Your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name (e.g. Juan dela Cruz)"
                className={FIELD}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]">
                Farm location in Mindanao
              </label>
              <LocationPicker value={locationName} onChange={setLocationName} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]">
                Farm area (hectares)
              </label>
              <input
                value={farmSize}
                onChange={(e) => setFarmSize(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="1.5"
                className={FIELD}
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#643100]">
                Crops you grow (Select at least 1)
              </label>
              <CropPicker value={crops} onChange={setCrops} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-[13px] leading-relaxed text-[#7F3E00]">
              Choose at least one challenge making farming hard right now. Advice is tuned around it.
            </p>
            <ProblemsPicker value={problems} onChange={setProblems} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
              <p className="eyebrow">Farmer</p>
              <p className="mt-2 font-display text-[18px] text-[#643100]">{name || "—"}</p>
            </div>
            <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
              <p className="eyebrow">Location</p>
              <p className="mt-2 font-display text-[18px] text-[#643100]">{location?.name || "—"}</p>
              <p className="mt-1 text-[12px] text-[#7F3E00]">
                {location ? `${location.province} · ${location.region}` : ""}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
              <p className="eyebrow">Farm area</p>
              <p className="mt-2 font-display text-[18px] text-[#643100]">{farmSize || "0"} hectares</p>
            </div>
            <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
              <p className="eyebrow">Crops</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {crops.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-[#EACAAE] px-2.5 py-1 text-[11.5px] font-bold text-[#643100]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            {problems.length > 0 && (
              <div className="rounded-[1.35rem] border border-border/80 bg-card p-4">
                <p className="eyebrow">Challenges</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {problems.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-[#EACAAE] px-2.5 py-1 text-[11.5px] font-bold text-[#643100]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-[12.5px] font-bold text-destructive">{error}</p>}
      </div>

      <div className="mt-6 flex gap-2.5">
        {step > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-[#643100] bg-card px-5 py-4 text-[13px] font-bold uppercase tracking-[0.14em] text-[#643100] transition-opacity disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
            Back
          </button>
        )}

        <button
          type="button"
          disabled={!canContinue || saving}
          onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#643100] bg-[#EACAAE] py-4 text-[13px] font-bold uppercase tracking-[0.14em] text-[#643100] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step === STEPS.length - 1 ? (saving ? "Saving…" : "Start farming") : "Continue"}
          {step < STEPS.length - 1 && <Check className="h-4 w-4" strokeWidth={2.4} />}
        </button>
      </div>
    </div>
  );
}