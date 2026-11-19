import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
} from "lucide-react";

export function weatherCodeInfo(code) {
  const c = Number(code);
  if (c === 0) return { label: "Clear skies", Icon: Sun };
  if (c <= 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (c === 3) return { label: "Overcast", Icon: Cloud };
  if (c === 45 || c === 48) return { label: "Foggy", Icon: CloudFog };
  if (c >= 51 && c <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (c >= 61 && c <= 67) return { label: "Rain", Icon: CloudRain };
  if (c >= 71 && c <= 77) return { label: "Snow", Icon: CloudSnow };
  if (c >= 80 && c <= 82) return { label: "Showers", Icon: CloudRain };
  if (c >= 95) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Fair", Icon: CloudSun };
}

export { heatIndex } from "./heat";

export function pestRiskLevel(score) {
  if (score >= 65) return { label: "High", tone: "danger" };
  if (score >= 40) return { label: "Moderate", tone: "warn" };
  return { label: "Low", tone: "safe" };
}

export const TONE_CLASS = {
  danger: "text-[#B4452F] bg-[#B4452F]/10",
  warn: "text-[#9A6B12] bg-[#9A6B12]/10",
  safe: "text-[#2E6B44] bg-[#2E6B44]/10",
};