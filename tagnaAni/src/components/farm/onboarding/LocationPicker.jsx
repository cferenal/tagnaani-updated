import { useEffect, useState } from "react";
import { Search, MapPin, Check } from "lucide-react";
import { isPhilippineLand, localLocations, lookupLocations } from "@/lib/locations";
import { tagnaRequest } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export default function LocationPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState([]);
  const [status, setStatus] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [checking, setChecking] = useState(false);
  const [coordinateError, setCoordinateError] = useState("");
  const term = query.trim();

  useEffect(() => {
    setRemote([]);
    setStatus("");
    if (term.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("Searching Philippine locations…");
      try {
        const results = await lookupLocations(term, AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]));
        if (controller.signal.aborted) return;
        setRemote(results);
        setStatus(results.length || localLocations(term).length ? "" : "No match. Try the town and province or enter coordinates.");
      } catch {
        if (!controller.signal.aborted) setStatus("Online search is unavailable. Try a listed location or enter coordinates.");
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const options = [...new Map([...remote, ...localLocations(term)]
    .map((location) => [`${location.name}:${location.lat}:${location.lon}`, location])).values()];

  async function checkCoordinates() {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setCoordinateError("Enter both coordinates in decimal degrees.");
      return;
    }
    if (!isPhilippineLand(lat, lon)) {
      setCoordinateError("These coordinates are outside the Philippine land area in our map.");
      return;
    }
    setCoordinateError("");
    setChecking(true);
    let location;
    try {
      ({ location } = await tagnaRequest("/location/reverse", { lat, lon }));
    } catch {
      // Retain the verified point if the place-name lookup is temporarily unavailable.
    } finally {
      setChecking(false);
    }
    onChange({ name: location?.name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      province: location?.province || "", region: location?.region || "Philippines", lat, lon, coordinateSelection: Boolean(location?.name) });
    if (!location) setCoordinateError("Coordinates are valid. The English place name is unavailable.");
  }

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search Philippine address, town or ZIP code</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)}
          placeholder="Town, province, or ZIP code" className={cn(field, "pl-9 text-base")} />
      </label>
      {value && <p className="flex items-center gap-2 text-sm"><Check size={16} /> Selected: {value.coordinateSelection ? `${value.lat.toFixed(5)}, ${value.lon.toFixed(5)} (${value.name})` : value.name}</p>}
      {status && <p role="status" className="text-sm">{status}</p>}
      {options.length > 0 && (
        <div className="no-scrollbar max-h-56 space-y-1.5 overflow-y-auto">
          {options.map((location) => (
            <button key={`${location.name}:${location.lat}:${location.lon}`} type="button"
              onClick={() => onChange(location)}
              aria-pressed={value?.lat === location.lat && value?.lon === location.lon}
              className="flex w-full items-start gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm aria-pressed:border-primary aria-pressed:bg-secondary">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>{location.name}<small className="block">{[location.province, location.region].filter(Boolean).join(" · ")}</small></span>
            </button>
          ))}
        </div>
      )}
      <details className="rounded-xl border border-border bg-card p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Enter latitude and longitude</summary>
        <p className="my-2">Use decimal degrees from your map pin. The app checks Philippine land coverage.</p>
        <div className="grid grid-cols-2 gap-2">
          <label>Latitude<input className={field} value={latitude} inputMode="decimal" placeholder="8.22800"
            onChange={(event) => { setLatitude(event.target.value); setCoordinateError(""); }} /></label>
          <label>Longitude<input className={field} value={longitude} inputMode="decimal" placeholder="124.24520"
            onChange={(event) => { setLongitude(event.target.value); setCoordinateError(""); }} /></label>
        </div>
        <button type="button" onClick={checkCoordinates} disabled={checking} className="mt-2 rounded-lg border border-primary/50 px-3 py-2">{checking ? "Looking up place…" : "Check and use coordinates"}</button>
        <p className="mt-2 text-xs">Place names from <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.</p>
        {coordinateError && <p role="alert" className="mt-2 text-destructive">{coordinateError}</p>}
      </details>
    </div>
  );
}
