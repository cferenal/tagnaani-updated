import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LocationPicker from "@/components/farm/onboarding/LocationPicker";
import CropPicker from "@/components/farm/onboarding/CropPicker";
import ProblemsPicker from "@/components/farm/onboarding/ProblemsPicker";
import { savedLocation } from "@/lib/locations";

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[15px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
const LABEL = "mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export default function ProfileEditor({ open, onOpenChange, profile, onSave }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState(null);
  const [farmSize, setFarmSize] = useState("");
  const [crops, setCrops] = useState([]);
  const [problems, setProblems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(profile?.farmer_name || "");
    setLocation(savedLocation(profile));
    setFarmSize(profile?.farm_size ? String(profile.farm_size) : "");
    setCrops(profile?.crops || []);
    setProblems(profile?.problems || []);
    setError("");
  }, [open, profile]);

  async function submit() {
    const loc = location;
    if (!loc) return;
    try {
      setSaving(true);
      setError("");
      await onSave({
        patchVersion: profile?.patchVersion,
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
      });
      onOpenChange(false);
    } catch {
      setError("Could not save changes. Try again when you are back online.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[400px] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-[21px]">Farm profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className={LABEL}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Farm area (hectares)</label>
            <input
              value={farmSize}
              onChange={(e) => setFarmSize(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          <div>
            <label className={LABEL}>Crops</label>
            <CropPicker value={crops} onChange={setCrops} />
          </div>
          <div>
            <label className={LABEL}>Challenges</label>
            <ProblemsPicker value={problems} onChange={setProblems} />
          </div>

          {error && <p className="text-[12.5px] text-destructive">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={saving || !location || name.trim().length < 2}
            className="w-full rounded-2xl bg-primary py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}