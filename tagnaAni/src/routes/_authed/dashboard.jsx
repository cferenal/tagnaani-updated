import { Announcements } from "@/components/farm/Announcements";
import "@/api/base44Client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarRange,
  Droplets,
  MapPin,
  RefreshCw,
  Sprout,
} from "lucide-react";

import { db, syncFarmName } from "@/api/base44Client";
import {
  getCropRotationPlan,
  getFarmWeather,
} from "@/lib/server-fns";
import { cacheGet, cacheSet } from "@/lib/offline";
import { buildAlerts, buildCropAdvice, buildPriority, pestScore } from "@/lib/advice";
import { findLocation, greeting } from "@/lib/farmData";
import { weatherCodeInfo } from "@/lib/weather";
import PriorityCard from "@/components/farm/PriorityCard";
import WeatherTimeline from "@/components/farm/WeatherTimeline";
import MetricsGrid from "@/components/farm/MetricsGrid";
import CropAdvice from "@/components/farm/CropAdvice";
import AlertsSheet from "@/components/farm/AlertsSheet";
import OfflineNotice from "@/components/farm/OfflineNotice";
import { cn } from "@/lib/utils";
import { SmsSettings } from "@/components/farm/SmsSettings";
import { LogoLoading } from "@/components/LogoLoading";

export const Route = createFileRoute("/_authed/dashboard")({
  component: HomePage,
});

function HomePage() {
  const { user: sessionUser } = Route.useRouteContext();
  const navigate = useNavigate();
  const uid = sessionUser.id;
  const isAdmin = sessionUser.role === "admin";

  const [profile, setProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [plan, setPlan] = useState(null);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [irrigated, setIrrigated] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  const [records, setRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(
    async (overrideIrrigated) => {
      const useIrr = overrideIrrigated ?? irrigated;
      const cachedProfile = cacheGet(`profile:${uid}`)?.value;
      const cachedWeather = cacheGet(`weather:${uid}`)?.value;
      const cachedRecords = cacheGet(`records:${uid}`)?.value;
      const cachedTx = cacheGet(`transactions:${uid}`)?.value;
      if (cachedProfile) setProfile(cachedProfile);
      if (cachedWeather) setWeather(cachedWeather);
      if (cachedRecords) setRecords(cachedRecords);
      if (cachedTx) setTransactions(cachedTx);

      const [pRes, rRes, tRes] = await Promise.allSettled([
        db.entities.FarmProfile.list({ sort: "-created_date", limit: 1 }),
        db.entities.CropRecord.list({ sort: "-created_date", limit: 200 }),
        db.entities.Transaction.list({ sort: "-created_date", limit: 200 }),
      ]);

      const entityProfile = pRes.status === "fulfilled" ? pRes.value.items?.[0] : undefined;
      let currentProfile = entityProfile || cachedProfile || null;

      if (!currentProfile && isAdmin) {
        const defaultLoc = findLocation("Iligan City");
        currentProfile = await db.entities.FarmProfile.create({
          farmer_name: sessionUser?.username || "Admin",
          city: defaultLoc.name,
          province: defaultLoc.province,
          region: defaultLoc.region,
          latitude: defaultLoc.lat,
          longitude: defaultLoc.lon,
          farm_size: 2.5,
          crops: ["Rice (palay)", "Corn", "Mungbean (Monggo)"],
          problems: ["Unpredictable weather", "Soil fertility"],
          onboarded: true,
        });
      }

      if (!currentProfile || currentProfile.onboarded === false) {
        setLoading(false);
        navigate({ to: "/onboarding" });
        return;
      }

      setProfile(currentProfile);
      void syncFarmName(currentProfile);
      cacheSet(`profile:${uid}`, currentProfile);

      if (rRes.status === "fulfilled") {
        const items = rRes.value.items || [];
        setRecords(items);
        cacheSet(`records:${uid}`, items);
      }
      if (tRes.status === "fulfilled") {
        const items = tRes.value.items || [];
        setTransactions(items);
        cacheSet(`transactions:${uid}`, items);
      }

      const loc = findLocation(currentProfile.city);
      const lat = currentProfile.latitude ?? loc.lat;
      const lon = currentProfile.longitude ?? loc.lon;

      try {
        const [wx, rotationPlan] = await Promise.all([
          getFarmWeather({ data: { lat, lon } }),
          getCropRotationPlan({
            lat,
            lon,
            crops: currentProfile.crops || ["Rice (palay)", "Peanut"],
            irrigated: useIrr,
          }),
        ]);
        setWeather(wx);
        setPlan(rotationPlan);
        cacheSet(`weather:${uid}`, wx);
        setOffline(false);
      } catch {
        setOffline(true);
      }

      setLoading(false);
    },
    [uid, irrigated, navigate, isAdmin],
  );

  useEffect(() => {
    load();
  }, [load]);

  const insights = useMemo(() => {
    if (!weather || !profile) return null;
    return {
      priority: buildPriority(weather, profile),
      alerts: buildAlerts(weather),
      advice: buildCropAdvice({ records, transactions, profile }),
      pest: pestScore(weather),
      updated: new Date(weather.fetchedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }),
    };
  }, [weather, profile, records, transactions]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleIrrigated() {
    const next = !irrigated;
    setIrrigated(next);
    await load(next);
  }

  if (!profile || (loading && !weather)) return <LogoLoading />;

  const firstName = (profile?.farmer_name || sessionUser?.username || "farmer").split(" ")[0];
  const scenarios = plan?.scenarios || [];
  const activeScenario = scenarios[scenarioIdx] || scenarios[0];
  const visibleMonths = showAllMonths
    ? activeScenario?.months || []
    : (activeScenario?.months || []).slice(0, 6);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 pt-7">
      {/* TAGNA-ANI BRAND BANNER & LOGO */}
      <Announcements />
      <div className="mb-5 rounded-2xl border border-[#643100]/30 bg-[#EACAAE] px-3.5 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Tagna-Ani Logo"
              className="h-10 w-10 shrink-0 rounded-xl border border-[#643100]/40 bg-[#EACAAE] object-cover"
            />
            <div className="min-w-0">
              <span className="block truncate font-display text-[17px] font-bold tracking-tight text-[#643100]">
                Tagna-Ani
              </span>
              <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-[#7F3E00]">
                Mindanao Smart Farming
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-xs font-semibold">
          <Link to="/" className="underline">User guides</Link>
          {isAdmin && <Link to="/admin" className="underline">Admin</Link>}
        </div>
        <p className="mt-2 text-[11px] font-bold leading-snug text-[#643100]">
          Empowering Farmers Through Knowledge and Technology.
        </p>
        <p className="text-[10.5px] italic text-[#7F3E00]">
          Kaalaman at teknolohiya para sa magsasaka.
        </p>
      </div>

      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#643100]">
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
            <span className="truncate">
              {[profile?.region, profile?.city].filter(Boolean).join(" · ")}
            </span>
          </p>
          <h1 className="mt-3 truncate text-[28px] leading-[1.08] text-[#643100]">
            {greeting()},
            <br />
            <span className="italic text-[#643100]">{firstName}.</span>
          </h1>
        </div>

        <div className="mt-1 flex shrink-0 items-center gap-1.5">

          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh weather"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#643100]/40 bg-card text-[#643100] transition-transform active:scale-95"
          >
            <RefreshCw className={`h-[16px] w-[16px] ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.9} />
          </button>

          <AlertsSheet
            alerts={insights?.alerts || []}
            trigger={
              <button
                type="button"
                aria-label="Open notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#643100]/40 bg-card text-[#643100] transition-transform active:scale-95"
              >
                <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} />
                {(insights?.alerts || []).length > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#B4452F]" />
                )}
              </button>
            }
          />
        </div>
      </header>

      {offline && <OfflineNotice className="mt-4" />}

      {insights && (
        <>
          <div className="mt-5">
            <PriorityCard priority={insights.priority} />
          </div>

          <SmsSettings />

          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="eyebrow">Weather · 7 days</h3>
              <span className="text-[11px] text-[#7F3E00]">Updated {insights.updated}</span>
            </div>
            <WeatherTimeline daily={weather.daily} />
          </section>

          <section className="mt-8">
            <h3 className="eyebrow mb-3">Field conditions</h3>
            <MetricsGrid current={weather.current} pestScore={insights.pest} />
          </section>

          {/* 18-MONTH NASA CROP ROTATION PLANNER */}
          {activeScenario && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0 text-[#643100]" strokeWidth={2} />
                  <h3 className="eyebrow truncate">18-Month NASA Crop Rotation</h3>
                </div>
                <button
                  type="button"
                  onClick={toggleIrrigated}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#643100] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider transition-colors",
                    irrigated ? "bg-[#EACAAE] text-[#643100]" : "bg-card text-[#7F3E00]",
                  )}
                >
                  <Droplets className="h-3 w-3" />
                  {irrigated ? "Irrigated: Yes" : "Rainfed"}
                </button>
              </div>

              <div className="card-soft overflow-hidden p-4">
                <div className="flex gap-1 rounded-full bg-muted p-1">
                  {scenarios.map((s, idx) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setScenarioIdx(idx)}
                      className={cn(
                        "min-w-0 flex-1 truncate rounded-full px-1.5 py-1.5 text-[10px] font-bold transition-colors",
                        scenarioIdx === idx
                          ? "bg-[#EACAAE] text-[#643100] shadow-sm"
                          : "text-[#7F3E00]",
                      )}
                    >
                      {idx === 0 ? "Baseline" : idx === 1 ? "El Niño (-25%)" : "La Niña (+25%)"}
                    </button>
                  ))}
                </div>

                <p className="mt-2.5 text-[11.5px] text-[#7F3E00]">
                  NASA POWER monthly agroclimatology screen for{" "}
                  <span className="font-bold text-[#643100]">{profile.city}</span>. Rotates crop families
                  to protect soil nitrogen and root moisture.
                </p>

                <div className="mt-3 space-y-2">
                  {visibleMonths.map((row) => {
                    const isPlant = row.action.startsWith("Plant");
                    const isHarvest = row.action.includes("Harvest");
                    const isHold = !row.crop;
                    return (
                      <div
                        key={row.month}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-[#643100]/25 bg-[#EACAAE]/60 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#643100]">
                              {row.month}
                            </span>
                            <span className="truncate font-display text-[14px] font-bold text-[#643100]">
                              {row.crop || "Cover crop / fallow"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[#7F3E00]">
                            Rain {row.scenario_rain_mm_day ?? "—"} mm/d · Max{" "}
                            {row.historical_max_air_c ? `${Math.round(row.historical_max_air_c)}°C` : "—"} ·
                            Root{" "}
                            {row.root_wetness_index ? `${Math.round(row.root_wetness_index * 100)}%` : "—"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                            isHold
                              ? "bg-[#9A6B12]/15 text-[#643100]"
                              : isPlant
                                ? "border border-[#643100]/40 bg-[#EACAAE] text-[#643100]"
                                : isHarvest
                                  ? "bg-[#2E6B44]/15 text-[#2E6B44]"
                                  : "bg-card text-[#7F3E00]",
                          )}
                        >
                          {isHold ? "Soil cover" : isPlant ? "Plant" : isHarvest ? "Harvest" : "Grow"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllMonths((v) => !v)}
                    className="text-[11.5px] font-bold text-[#643100] underline"
                  >
                    {showAllMonths ? "Show first 6 months" : "Show all 18 months"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/onboarding" })}
                    className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#643100] hover:underline"
                  >
                    <Sprout className="h-3.5 w-3.5" />
                    Edit farm crops
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="mt-8">
            <h3 className="eyebrow mb-3">From your records</h3>
            <CropAdvice advice={insights.advice} />
          </section>

          <div className="mt-8 text-center">
            <p className="font-display text-[13px] font-bold text-[#643100]">Tagna-Ani</p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-[#643100]">
              Empowering Farmers Through Knowledge and Technology.
            </p>
            <p className="text-[10px] italic text-[#7F3E00]">
              Kaalaman at teknolohiya para sa magsasaka.
            </p>
          </div>
        </>
      )}
    </div>
  );
}