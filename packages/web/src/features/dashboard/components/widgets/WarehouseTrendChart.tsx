import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WarehouseTrendDataPoint } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

interface ItemMeta {
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  latestQuantity: number;
}

type ChartPoint = Record<string, number | string>;

const BASE_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#0891b2", "#475569"];

function toChartData(points: WarehouseTrendDataPoint[]) {
  const byDate = new Map<string, ChartPoint>();
  const itemMeta = new Map<string, ItemMeta>();

  for (const point of points) {
    const date = new Date(point.date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });

    const current = byDate.get(date) ?? { date };
    current[point.itemName] = point.quantity;
    byDate.set(date, current);

    itemMeta.set(point.itemName, {
      minQuantity: point.minQuantity,
      maxQuantity: point.maxQuantity,
      unit: point.unit,
      latestQuantity: point.quantity,
    });
  }

  const data = Array.from(byDate.entries())
    .sort((a, b) => {
      const [d1, m1] = String(a[0]).split("/").map(Number);
      const [d2, m2] = String(b[0]).split("/").map(Number);
      return m1 === m2 ? d1 - d2 : m1 - m2;
    })
    .map(([, value]) => value);

  return { data, itemMeta };
}

function strokeForItem(meta: ItemMeta): string {
  if (meta.latestQuantity <= meta.minQuantity) return "#dc2626";
  if (meta.latestQuantity <= meta.minQuantity * 1.2) return "#d97706";
  if (meta.latestQuantity >= meta.maxQuantity * 0.95) return "#ca8a04";
  return "";
}

export function WarehouseTrendChart() {
  const role = useDashboardRole();
  const { data } = useDashboard();
  const trendPoints = data?.warehouseTrendData ?? [];

  if (!(role.isAdmin || role.isPM || role.isQuality || role.isWarehouse)) {
    return null;
  }

  if (trendPoints.length === 0) {
    return (
      <div className="app-card">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Xu huong ton kho</h3>
          <span className="text-xs text-slate-400">7 ngay gan nhat</span>
        </div>
        <p className="py-6 text-center text-sm text-slate-500">Chua co du lieu ton kho gan day.</p>
      </div>
    );
  }

  const topPoints = trendPoints.slice(0, 35);
  const { data: chartData, itemMeta } = toChartData(topPoints);
  const itemNames = Array.from(itemMeta.keys()).slice(0, 5);

  const minThreshold = itemNames.reduce((acc, itemName) => {
    const value = itemMeta.get(itemName)?.minQuantity ?? acc;
    return Math.min(acc, value);
  }, Number.POSITIVE_INFINITY);

  const maxThreshold = itemNames.reduce((acc, itemName) => {
    const value = itemMeta.get(itemName)?.maxQuantity ?? acc;
    return Math.max(acc, value);
  }, 0);

  return (
    <div className="app-card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Xu huong ton kho</h3>
        <span className="text-xs text-slate-400">Top 5 vat tu</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", background: "#ffffff" }}
            formatter={(value: number | string, name: string) => {
              const meta = itemMeta.get(name);
              const unit = meta?.unit ?? "";
              const min = meta?.minQuantity ?? 0;
              const max = meta?.maxQuantity ?? 0;
              return [`${value} ${unit} (min ${min} / max ${max})`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {Number.isFinite(minThreshold) ? (
            <ReferenceArea y1={0} y2={minThreshold} fill="#dc2626" fillOpacity={0.08} />
          ) : null}
          {maxThreshold > 0 ? (
            <ReferenceArea y1={maxThreshold * 0.95} y2={maxThreshold} fill="#f59e0b" fillOpacity={0.08} />
          ) : null}

          {itemNames.map((itemName, index) => {
            const meta = itemMeta.get(itemName);
            const dynamicStroke = meta ? strokeForItem(meta) : "";
            return (
              <Line
                key={itemName}
                type="monotone"
                dataKey={itemName}
                stroke={dynamicStroke || BASE_COLORS[index % BASE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

