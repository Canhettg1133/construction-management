import { CheckSquare, FileText, FolderKanban, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";

type StatCardTone = "brand" | "warning" | "danger" | "success";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  tone?: StatCardTone;
}

function toneClasses(tone: StatCardTone) {
  if (tone === "danger") {
    return { iconWrap: "bg-red-100", icon: "text-red-600" };
  }
  if (tone === "warning") {
    return { iconWrap: "bg-amber-100", icon: "text-amber-600" };
  }
  if (tone === "success") {
    return { iconWrap: "bg-emerald-100", icon: "text-emerald-600" };
  }
  return { iconWrap: "bg-brand-100", icon: "text-brand-600" };
}

function StatCard({ title, value, icon: Icon, tone = "brand" }: StatCardProps) {
  const classes = toneClasses(tone);

  return (
    <div className="app-card transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-3 flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${classes.iconWrap}`}>
          <Icon className={`h-4 w-4 ${classes.icon}`} />
        </div>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}

export function StatsCardGrid() {
  const { data } = useDashboard();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Tong du an" value={data?.projectCount ?? 0} icon={FolderKanban} tone="brand" />
      <StatCard title="Task dang mo" value={data?.openTaskCount ?? 0} icon={CheckSquare} tone="warning" />
      <StatCard title="Task qua han" value={data?.overdueTaskCount ?? 0} icon={AlertTriangle} tone="danger" />
      <StatCard title="Bao cao hom nay" value={data?.todayReportCount ?? 0} icon={FileText} tone="success" />
    </div>
  );
}

