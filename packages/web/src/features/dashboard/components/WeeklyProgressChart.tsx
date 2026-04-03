import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { DashboardWeeklyProgress } from "@construction/shared";

interface WeeklyProgressChartProps {
  data: DashboardWeeklyProgress[];
}

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.totalTasks, d.completedTasks, d.newTasks)),
    1
  );

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Tiến độ tuần</h3>
        <span className="ml-auto text-xs text-slate-400">7 ngày gần nhất</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={formatted}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            domain={[0, maxValue]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            labelStyle={{ fontWeight: 600, color: "#334155" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="newTasks"
            name="Task mới"
            fill="#f59e0b"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="completedTasks"
            name="Đã hoàn thành"
            fill="#10b981"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
