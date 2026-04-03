import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save } from "lucide-react";
import { safetyApi } from "../api/safetyApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useProjectPermissions } from "../../../shared/hooks/useProjectPermissions";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";

function formatDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function parsePhotoLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function SafetyReportPage() {
  const { id, reportId } = useParams<{ id: string; reportId?: string }>();
  const projectId = id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { user } = useAuthStore();
  const { data: permissionData } = useProjectPermissions(projectId);
  const isEditing = Boolean(reportId);
  const isPmOrAdmin =
    user?.systemRole === "ADMIN" || permissionData?.projectRole === "PROJECT_MANAGER";
  const { has: canUseSafetyStandard } = usePermission({
    projectId,
    toolId: "SAFETY",
    minLevel: "STANDARD",
  });

  const [reportDate, setReportDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [violations, setViolations] = useState<number>(0);
  const [photosText, setPhotosText] = useState("");

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["safety-report", projectId, reportId],
    queryFn: () => safetyApi.getById(projectId, String(reportId)),
    enabled: Boolean(projectId) && Boolean(reportId),
  });

  useEffect(() => {
    if (!report) return;
    setReportDate(formatDateInput(report.reportDate));
    setLocation(report.location);
    setDescription(report.description);
    setViolations(report.violations ?? 0);
    setPhotosText((report.photos ?? []).join("\n"));
  }, [report]);

  useEffect(() => {
    if (!isEditing) {
      const today = new Date().toISOString().slice(0, 10);
      setReportDate(today);
    }
  }, [isEditing]);

  const canEditReport = useMemo(() => {
    if (!canUseSafetyStandard) return false;
    if (!isEditing) return true;
    if (!report) return false;
    if (report.status !== "PENDING") return false;
    return isPmOrAdmin || report.inspectorId === user?.id;
  }, [canUseSafetyStandard, isEditing, report, isPmOrAdmin, user?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        reportDate,
        location,
        description,
        violations,
        photos: parsePhotoLines(photosText),
      };

      if (!isEditing) {
        return safetyApi.create(projectId, payload);
      }

      return safetyApi.update(projectId, String(reportId), payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["safety-reports", projectId] });
      queryClient.invalidateQueries({ queryKey: ["safety-report", projectId, reportId] });
      showToast({
        type: "success",
        title: isEditing ? "Da cap nhat bao cao an toan" : "Da tao bao cao an toan",
      });

      if (!isEditing) {
        navigate(`/projects/${projectId}/safety/${saved.id}`);
      }
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the luu bao cao",
      });
    },
  });

  const signMutation = useMutation({
    mutationFn: () => safetyApi.sign(projectId, String(reportId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-reports", projectId] });
      queryClient.invalidateQueries({ queryKey: ["safety-report", projectId, reportId] });
      showToast({ type: "success", title: "Da ky duyet bao cao an toan" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the ky duyet",
      });
    },
  });

  if (!projectId) {
    return <ErrorState message="Khong tim thay thong tin du an." />;
  }

  if (isEditing && isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isEditing && (isError || !report)) {
    return <ErrorState message="Khong tai duoc chi tiet bao cao an toan." />;
  }

  if (!canUseSafetyStandard && !isEditing) {
    return <ErrorState message="Ban khong co quyen tao bao cao an toan." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/projects/${projectId}/safety`}
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            ← Safety dashboard
          </Link>
          <h2 className="mt-1">{isEditing ? "Chi tiet bao cao an toan" : "Tao bao cao an toan"}</h2>
          {report && (
            <p className="page-subtitle">
              Nguoi lap: {report.inspector?.name ?? report.inspectorId} · Trang thai: {report.status}
            </p>
          )}
        </div>

        {isEditing && report?.status === "PENDING" && (
          <SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
            <button
              onClick={() => signMutation.mutate()}
              disabled={signMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ky duyet
            </button>
          </SpecialPrivilegeGate>
        )}
      </div>

      <div className="app-card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Ngay bao cao</label>
            <input
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              className="form-input"
              disabled={!canEditReport}
            />
          </div>
          <div>
            <label className="form-label">So vi pham</label>
            <input
              type="number"
              min={0}
              value={violations}
              onChange={(event) => setViolations(Number(event.target.value))}
              className="form-input"
              disabled={!canEditReport}
            />
          </div>
        </div>

        <div>
          <label className="form-label">Vi tri</label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="form-input"
            placeholder="Khu vuc cong truong..."
            disabled={!canEditReport}
          />
        </div>

        <div>
          <label className="form-label">Noi dung bao cao</label>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-input"
            placeholder="Mo ta tinh trang an toan..."
            disabled={!canEditReport}
          />
        </div>

        <div>
          <label className="form-label">Anh hien truong (moi dong 1 URL)</label>
          <textarea
            rows={4}
            value={photosText}
            onChange={(event) => setPhotosText(event.target.value)}
            className="form-input"
            placeholder="https://.../anh-1.jpg"
            disabled={!canEditReport}
          />
        </div>

        {canEditReport ? (
          <div className="flex justify-end gap-2">
            <Link
              to={`/projects/${projectId}/safety`}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Huy
            </Link>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Luu thay doi" : "Tao bao cao"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Ban khong co quyen sua bao cao nay.
          </div>
        )}
      </div>
    </div>
  );
}
