export const MINDANAO_POSTAL_CODES = {
  8000: "Davao City", 8100: "Tagum City", 8002: "Digos City", 8105: "Panabo City",
  8200: "Mati City", 9500: "General Santos City", 9506: "Koronadal City",
  9400: "Kidapawan City", 9800: "Tacurong City", 9000: "Cagayan de Oro",
  9020: "Gitagum", 9200: "Iligan City", 8700: "Malaybalay City", 8703: "Manolo Fortich",
  8709: "Valencia City", 9014: "Gingoog City", 7200: "Ozamiz City",
  7000: "Zamboanga City", 7100: "Dipolog City", 7016: "Pagadian City",
  9600: "Cotabato City", 9700: "Marawi City", 8600: "Butuan City", 8400: "Surigao City",
};

export const MINDANAO_LOCATIONS = [
  { name: "Davao City", province: "Davao del Sur", region: "Davao Region", lat: 7.1907, lon: 125.4553 },
  { name: "Tagum City", province: "Davao del Norte", region: "Davao Region", lat: 7.4478, lon: 125.8078 },
  { name: "Digos City", province: "Davao del Sur", region: "Davao Region", lat: 6.7497, lon: 125.3572 },
  { name: "Panabo City", province: "Davao del Norte", region: "Davao Region", lat: 7.3081, lon: 125.6831 },
  { name: "Mati City", province: "Davao Oriental", region: "Davao Region", lat: 6.9533, lon: 126.2164 },
  { name: "Samal City", province: "Davao del Norte", region: "Davao Region", lat: 7.0744, lon: 125.7089 },
  { name: "General Santos City", province: "South Cotabato", region: "SOCCSKSARGEN", lat: 6.1164, lon: 125.1716 },
  { name: "Koronadal City", province: "South Cotabato", region: "SOCCSKSARGEN", lat: 6.5031, lon: 124.8469 },
  { name: "Kidapawan City", province: "Cotabato", region: "SOCCSKSARGEN", lat: 7.0083, lon: 125.0894 },
  { name: "Tacurong City", province: "Sultan Kudarat", region: "SOCCSKSARGEN", lat: 6.6925, lon: 124.6756 },
  { name: "Midsayap", province: "Cotabato", region: "SOCCSKSARGEN", lat: 7.19, lon: 124.53 },
  { name: "Polomolok", province: "South Cotabato", region: "SOCCSKSARGEN", lat: 6.22, lon: 125.064 },
  { name: "Cagayan de Oro", province: "Misamis Oriental", region: "Northern Mindanao", lat: 8.4542, lon: 124.6319 },
  { name: "Gitagum", province: "Misamis Oriental", region: "Northern Mindanao", lat: 8.5944, lon: 124.4057 },
  { name: "Iligan City", province: "Lanao del Norte", region: "Northern Mindanao", lat: 8.228, lon: 124.2452 },
  { name: "Malaybalay City", province: "Bukidnon", region: "Northern Mindanao", lat: 8.1575, lon: 125.1289 },
  { name: "Valencia City", province: "Bukidnon", region: "Northern Mindanao", lat: 7.9064, lon: 125.0945 },
  { name: "Gingoog City", province: "Misamis Oriental", region: "Northern Mindanao", lat: 8.8278, lon: 125.1 },
  { name: "Manolo Fortich", province: "Bukidnon", region: "Northern Mindanao", lat: 8.3736, lon: 124.8653 },
  { name: "Ozamiz City", province: "Misamis Occidental", region: "Northern Mindanao", lat: 8.1481, lon: 123.8413 },
  { name: "Zamboanga City", province: "Zamboanga del Sur", region: "Zamboanga Peninsula", lat: 6.9214, lon: 122.079 },
  { name: "Dipolog City", province: "Zamboanga del Norte", region: "Zamboanga Peninsula", lat: 8.5872, lon: 123.3408 },
  { name: "Pagadian City", province: "Zamboanga del Sur", region: "Zamboanga Peninsula", lat: 7.8257, lon: 123.437 },
  { name: "Isabela City", province: "Basilan", region: "Zamboanga Peninsula", lat: 6.7044, lon: 121.9711 },
  { name: "Cotabato City", province: "Maguindanao", region: "BARMM", lat: 7.2047, lon: 124.231 },
  { name: "Marawi City", province: "Lanao del Sur", region: "BARMM", lat: 8.0, lon: 124.29 },
  { name: "Lamitan City", province: "Basilan", region: "BARMM", lat: 6.6536, lon: 122.1294 },
  { name: "Jolo", province: "Sulu", region: "BARMM", lat: 6.0522, lon: 121.002 },
  { name: "Bongao", province: "Tawi-Tawi", region: "BARMM", lat: 5.0292, lon: 119.7731 },
  { name: "Butuan City", province: "Agusan del Norte", region: "Caraga", lat: 8.9475, lon: 125.5406 },
  { name: "Surigao City", province: "Surigao del Norte", region: "Caraga", lat: 9.789, lon: 125.4954 },
  { name: "Bislig City", province: "Surigao del Sur", region: "Caraga", lat: 8.21, lon: 126.32 },
  { name: "Tandag City", province: "Surigao del Sur", region: "Caraga", lat: 9.07, lon: 126.19 },
];

export const CROPS = [
  "Rice (palay)",
  "Corn",
  "Banana",
  "Coconut",
  "Coffee",
  "Cacao",
  "Sugarcane",
  "Cassava",
  "Rubber",
  "Abaca",
  "Pineapple",
  "Mango",
  "Durian",
  "Vegetables",
  "Peanut",
  "Sweet potato",
  "Soybean",
  "Oil palm",
];

export const PROBLEMS = [
  "Pest infestation",
  "Low crop yield",
  "Unpredictable weather",
  "Soil fertility",
  "Water / irrigation",
  "High input costs",
];

export const RECORD_KINDS = [
  { value: "harvest", label: "Harvest" },
  { value: "planting", label: "Planting" },
  { value: "seed_stock", label: "Seed stock" },
  { value: "expense", label: "Expense" },
  { value: "revenue", label: "Revenue" },
];

export const EXPENSE_CATEGORIES = [
  "Fertilizer",
  "Seeds",
  "Pesticide",
  "Labor",
  "Fuel",
  "Irrigation",
  "Transport",
  "Other",
];

export function findLocation(name) {
  return MINDANAO_LOCATIONS.find((l) => l.name === name) || MINDANAO_LOCATIONS[0];
}

export function formatPeso(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });
  return `${n < 0 ? "−" : ""}₱${abs}`;
}

export function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}