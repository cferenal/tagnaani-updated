import { Announcements } from "@/components/farm/Announcements";
import "@/api/base44Client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Bell,
  MapPin,
  RefreshCw,
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
import { RotationPlanner } from "@/components/farm/RotationPlanner";
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
  const [irrigated, setIrrigated] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);

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

      setPlanLoading(true);
      setPlan(null);
      const [forecast, rotation] = await Promise.allSettled([
        getFarmWeather({ data: { lat, lon } }),
        getCropRotationPlan({ lat, lon, crops: currentProfile.crops || [], irrigated: useIrr }),
      ]);
      if (forecast.status === "fulfilled") {
        setWeather(forecast.value);
        cacheSet(`weather:${uid}`, forecast.value);
        setOffline(false);
      } else {
        setOffline(true);
      }
      setPlan(rotation.status === "fulfilled" ? rotation.value : null);
      setPlanLoading(false);

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

  if (!profile || (loading && !weather)) return <LogoLoading />;

  const firstName = (profile?.farmer_name || sessionUser?.username || "farmer").split(" ")[0];
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

          <RotationPlanner plan={plan} loading={planLoading} city={profile.city} irrigated={irrigated}
            onIrrigationChange={setIrrigated} onEditCrops={() => navigate({ to: "/onboarding" })} />

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