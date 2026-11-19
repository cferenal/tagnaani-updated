import { moneyTotals } from "@/lib/advice";

function cleanLabel(value) {
  const label = String(value || "").trim();
  return label || "Other";
}

/**
 * Groups expense entries by input (fertilizer, seeds, labour...).
 * `value` is the peso amount, `pct` is the share of all expenses — two separate
 * facts, so the bar never has to be derived from the amount at render time.
 */
export function expenseByCategory(transactions = []) {
  const expenses = transactions.filter((t) => t.kind === "expense");
  const expenseTotal = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const groups = new Map();

  expenses.forEach((t) => {
    const label = cleanLabel(t.category);
    const group = groups.get(label) || { label, value: 0, count: 0, crops: new Map() };
    group.value += Number(t.amount) || 0;
    group.count += 1;
    if (t.crop) group.crops.set(t.crop, (group.crops.get(t.crop) || 0) + 1);
    groups.set(label, group);
  });

  const rows = [...groups.values()]
    .map((g) => ({
      label: g.label,
      value: g.value,
      count: g.count,
      crop: [...g.crops.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "All crops",
      pct: expenseTotal > 0 ? (g.value / expenseTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const inputs = rows
    .filter((row) => row.label === "Fertilizer" || row.label === "Seeds")
    .reduce((s, row) => s + row.value, 0);

  return { rows, expenseTotal, inputs };
}

export function moneyStatistics(transactions = []) {
  const totals = moneyTotals(transactions);
  const { rows, expenseTotal, inputs } = expenseByCategory(transactions);
  return { ...totals, rows, expenseTotal, inputs, entries: transactions.length };
}