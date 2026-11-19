// Rothfusz regression — the heat index formula used by weather bureaus.
export function heatIndex(tempC, humidity) {
  if (tempC == null || humidity == null) return null;
  const t = (tempC * 9) / 5 + 32;
  const r = humidity;
  if (t < 80) return Math.round(tempC);
  let hi =
    -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    0.00683783 * t * t -
    0.05481717 * r * r +
    0.00122874 * t * t * r +
    0.00085282 * t * r * r -
    0.00000199 * t * t * r * r;
  if (r < 13 && t >= 80 && t <= 112) hi -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  if (r > 85 && t >= 80 && t <= 87) hi += ((r - 85) / 10) * ((87 - t) / 5);
  return Math.round(((hi - 32) * 5) / 9);
}