export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return (Number.isFinite(num) ? num : 0).toLocaleString("vi-VN");
}

export function calculateTrend(current?: number, previous?: number): string {
  const now = current ?? 0;
  const prev = previous ?? 0;
  if (prev === 0) {
    if (now === 0) return "0%";
    return "+100%";
  }

  const pct = ((now - prev) / prev) * 100;
  const rounded = Math.abs(pct).toFixed(1);
  return `${pct >= 0 ? "+" : "-"}${rounded}%`;
}

