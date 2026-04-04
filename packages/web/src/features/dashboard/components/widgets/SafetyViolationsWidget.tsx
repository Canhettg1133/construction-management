import { ShieldAlert } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

function severityTone(level: "LOW" | "MEDIUM" | "HIGH"): string {
  if (level === "HIGH") return "text-red-700 bg-red-50";
  if (level === "MEDIUM") return "text-amber-700 bg-amber-50";
  return "text-sky-700 bg-sky-50";
}

export function SafetyViolationsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isSafety) {
    return null;
  }

  const violations = data?.safetyViolations ?? [];

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-semibold text-slate-700">Vi pham an toan gan day</h3>
      </div>

      {violations.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Khong co vi pham nao trong ky hien tai.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {violations.slice(0, 8).map((violation) => (
            <div key={violation.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{violation.location}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{violation.description}</p>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${severityTone(
                    violation.severity
                  )}`}
                >
                  {violation.severity}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(violation.date).toLocaleDateString("vi-VN")}</span>
                <span className={violation.resolved ? "text-emerald-600" : "text-red-600"}>
                  {violation.resolved ? "Da xu ly" : "Chua xu ly"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

