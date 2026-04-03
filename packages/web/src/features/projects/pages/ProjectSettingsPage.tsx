import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectSettingsApi } from "../api/projectSettingsApi";
import { PermissionsMatrixTab } from "../components/PermissionsMatrixTab";
import { PrivilegesTab } from "../components/PrivilegesTab";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";

type Tab = "general" | "permissions" | "privileges";

const TAB_LABELS: Record<Tab, string> = {
  general: "General",
  permissions: "Permissions",
  privileges: "Privileges",
};

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("general");

  const settingsQuery = useQuery({
    queryKey: ["project-settings", projectId],
    queryFn: () => projectSettingsApi.getSettings(projectId),
    enabled: Boolean(projectId),
  });

  const matrixQuery = useQuery({
    queryKey: ["project-settings-matrix", projectId],
    queryFn: () => projectSettingsApi.getPermissionMatrix(projectId),
    enabled: Boolean(projectId),
  });

  if (settingsQuery.isLoading || matrixQuery.isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (settingsQuery.isError || matrixQuery.isError || !settingsQuery.data || !matrixQuery.data) {
    return <ErrorState message="Khong tai duoc project settings." />;
  }

  const settings = settingsQuery.data;
  const matrix = matrixQuery.data;

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          ← Project detail
        </Link>
        <h2 className="mt-1">Project Settings</h2>
        <p className="page-subtitle">Quan ly permission matrix va special privileges cho du an.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "general" && (
        <div className="app-card space-y-3">
          <h3>General</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Ten du an</p>
              <p className="text-sm font-medium text-slate-900">{settings.name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Ma du an</p>
              <p className="text-sm font-medium text-slate-900">{settings.code}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Trang thai</p>
              <p className="text-sm font-medium text-slate-900">{settings.status}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Tien do</p>
              <p className="text-sm font-medium text-slate-900">{Number(settings.progress)}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Bat dau</p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(settings.startDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Ket thuc</p>
              <p className="text-sm font-medium text-slate-900">
                {settings.endDate ? new Date(settings.endDate).toLocaleDateString("vi-VN") : "Chua xac dinh"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Members</p>
              <p className="text-lg font-semibold text-slate-900">{settings.memberCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Permission overrides</p>
              <p className="text-lg font-semibold text-slate-900">{settings.overrideCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Special privileges</p>
              <p className="text-lg font-semibold text-slate-900">{settings.privilegeAssignmentCount}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "permissions" && (
        <PermissionsMatrixTab
          projectId={projectId}
          matrix={matrix}
          onRefresh={async () => {
            await matrixQuery.refetch();
            await settingsQuery.refetch();
          }}
        />
      )}

      {activeTab === "privileges" && (
        <PrivilegesTab
          projectId={projectId}
          matrix={matrix}
          onRefresh={async () => {
            await matrixQuery.refetch();
            await settingsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
