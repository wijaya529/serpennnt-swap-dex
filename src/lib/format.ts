/** Premium DeFi-style number formatting. */
export function formatAmount(value: string | number | undefined | null, opts?: { max?: number }): string {
  if (value === undefined || value === null || value === "") return "0";
  const n = typeof value === "string" ? Number(value) : value;
  if (!isFinite(n)) return "0";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const max = opts?.max;
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: max ?? 4 });
  if (abs >= 0.0001) return n.toLocaleString("en-US", { maximumFractionDigits: max ?? 4 });
  if (abs < 0.000001) return "<0.000001";
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Trim a long decimal string to N decimals without rounding noise. */
export function trimDecimals(value: string, decimals = 6): string {
  if (!value) return "";
  const [i, d = ""] = value.split(".");
  if (!d) return i;
  const trimmed = d.slice(0, decimals).replace(/0+$/, "");
  return trimmed ? `${i}.${trimmed}` : i;
}
