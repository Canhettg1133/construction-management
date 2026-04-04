import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Edit2, Trash2, Upload, X,
  Save, AlertCircle, CheckCircle, XCircle,
} from "lucide-react";
import {
  getReport,
  updateReport,
  deleteReport,
  uploadReportImages,
  deleteReportImage,
  updateReportStatus,
  submitReportForApproval,
  getReportImageViewUrl,
} from "../api/reportApi";
import { approveReport, rejectReport } from "../../approvals/api/approvalApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { Button } from "../../../shared/components/Button";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";
import { LIMITS, WEATHER_LABELS } from "@construction/shared";
import type { ReportImage } from "@construction/shared";

const updateReportSchema = z.object({
  weather: z.enum(["SUNNY", "RAINY", "CLOUDY", "OTHER"]).optional(),
  workerCount: z.coerce.number().min(0).optional(),
  workDescription: z.string().min(1).max(5000).optional(),
  issues: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
});

type UpdateReportForm = z.infer<typeof updateReportSchema>;

const WEATHER_OPTIONS = [
  { value: "SUNNY", label: "Nắng" },
  { value: "RAINY", label: "Mưa" },
  { value: "CLOUDY", label: "Nhiều mây" },
  { value: "OTHER", label: "Khác" },
];

export function ReportDetailPage() {
  const { id: projectId, reportId } = useParams();
  const currentProjectId = projectId ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const { user } = useAuthStore();
  const { has: canUseReportStandard } = usePermission({
    projectId: currentProjectId,
    toolId: "DAILY_REPORT",
    minLevel: "STANDARD",
  });
  const { has: canUseReportAdmin } = usePermission({
    projectId: currentProjectId,
    toolId: "DAILY_REPORT",
    minLevel: "ADMIN",
  });
  const { has: canProjectAdmin } = usePermission({
    projectId: currentProjectId,
    toolId: "PROJECT",
    minLevel: "ADMIN",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [saveError, setSaveError] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["report", currentProjectId, reportId],
    queryFn: () => getReport(currentProjectId, String(reportId)),
    enabled: Boolean(currentProjectId) && Boolean(reportId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateReportForm>({
    resolver: zodResolver(updateReportSchema),
  });

  const startEdit = () => {
    if (report) {
      reset({
        weather: report.weather,
        workerCount: report.workerCount,
        workDescription: report.workDescription,
        issues: report.issues ?? "",
        notes: report.notes ?? "",
        progress: report.progress,
      });
      setIsEditing(true);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPendingImages([]);
    reset();
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateReportForm) =>
      updateReport(currentProjectId, String(reportId), data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["report", currentProjectId, reportId], updated);
      queryClient.invalidateQueries({ queryKey: ["reports", currentProjectId] });
      showToast({ type: "success", title: "Đã lưu thay đổi" });
      setIsEditing(false);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Lưu thất bại";
      setSaveError(msg);
      showToast({ type: "error", title: "Lỗi", description: msg });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(currentProjectId, String(reportId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports", currentProjectId] });
      showToast({ type: "success", title: "Đã xóa báo cáo" });
      navigate(`/projects/${currentProjectId}/reports`);
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "DRAFT" | "SENT") =>
      updateReportStatus(currentProjectId, String(reportId), status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["report", currentProjectId, reportId], updated);
      showToast({ type: "success", title: "Đã cập nhật trạng thái" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "" });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (files: File[]) => uploadReportImages(currentProjectId, String(reportId), files),
    onSuccess: (newImages) => {
      queryClient.invalidateQueries({ queryKey: ["report", currentProjectId, reportId] });
      setPendingImages([]);
      showToast({ type: "success", title: `Đã tải lên ${newImages.length} ảnh` });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Tải ảnh thất bại" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => deleteReportImage(currentProjectId, String(reportId), imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report", currentProjectId, reportId] });
      showToast({ type: "success", title: "Đã xóa ảnh" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Xóa ảnh thất bại" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitReportForApproval(currentProjectId, String(reportId)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["report", currentProjectId, reportId], updated);
      queryClient.invalidateQueries({ queryKey: ["reports", currentProjectId] });
      showToast({ type: "success", title: "Đã gửi duyệt báo cáo" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Gửi duyệt thất bại" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveReport(String(reportId)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["report", currentProjectId, reportId], updated);
      queryClient.invalidateQueries({ queryKey: ["reports", currentProjectId] });
      showToast({ type: "success", title: "Đã duyệt báo cáo" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Duyệt thất bại" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectReport(String(reportId), reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(["report", currentProjectId, reportId], updated);
      queryClient.invalidateQueries({ queryKey: ["reports", currentProjectId] });
      setShowRejectModal(false);
      setRejectReason("");
      showToast({ type: "success", title: "Đã từ chối báo cáo" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Từ chối thất bại" });
    },
  });

  const isPmOrAdmin = canProjectAdmin;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const next = [...pendingImages, ...files].slice(0, LIMITS.MAX_REPORT_IMAGES);
    setPendingImages(next);
  };

  const canEdit = canUseReportStandard && report?.createdBy === user?.id;

  if (isLoading) {
    return <div className="space-y-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>;
  }

  if (isError || !report) {
    return <ErrorState message="Không tải được chi tiết báo cáo." />;
  }

  const allImages: ReportImage[] = report.images ?? [];
  const displayImages = allImages;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${currentProjectId}/reports`)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            ← Báo cáo
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {new Date(report.reportDate).toLocaleDateString("vi-VN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </h2>
            <p className="text-xs text-slate-500">
              Tạo bởi {report.creator?.name ?? "—"} · {new Date(report.createdAt).toLocaleTimeString("vi-VN")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            report.status === "SENT" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            {report.status === "SENT" ? "Đã gửi" : "Nháp"}
          </span>
          {report.approvalStatus === "APPROVED" && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Đã duyệt</span>
          )}
          {report.approvalStatus === "REJECTED" && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Từ chối</span>
          )}
          {report.approvalStatus === "REJECTED" && report.rejectedReason && (
            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-600">
              <span className="font-semibold">Lý do từ chối:</span> {report.rejectedReason}
            </div>
          )}
          {/* SE/PM actions */}
          <PermissionGate projectId={currentProjectId} toolId="DAILY_REPORT" minLevel="STANDARD">
            {!isEditing && canEdit && report.approvalStatus === "PENDING" && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-100"
              >
                Gửi duyệt
              </button>
            )}
          </PermissionGate>
          {canEdit && isEditing && (
            <Button variant="secondary" size="sm" onClick={cancelEdit}>Hủy</Button>
          )}
          {canEdit && !isEditing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Sửa
            </button>
          )}
          {canUseReportAdmin && (
            <button
              onClick={() => { if (confirm("Xóa báo cáo này?")) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {/* PM/Admin approval actions */}
          {isPmOrAdmin && report.approvalStatus === "PENDING" && (
            <SpecialPrivilegeGate projectId={currentProjectId} privilege="QUALITY_SIGNER">
              <>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Duyệt
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Từ chối
                </button>
              </>
            </SpecialPrivilegeGate>
          )}
        </div>
      </div>

      {/* Edit form */}
      {isEditing ? (
        <form onSubmit={handleSubmit((data) => updateMutation.mutateAsync(data))} className="app-card space-y-4">
          <div className="mb-3 flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold text-slate-900">Chỉnh sửa báo cáo</h3>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="form-label">Thời tiết</label>
              <select {...register("weather")} className="form-input">
                {WEATHER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Số công nhân</label>
              <input {...register("workerCount")} type="number" min={0} className="form-input" />
            </div>
            <div>
              <label className="form-label">Tiến độ (%)</label>
              <input {...register("progress")} type="number" min={0} max={100} className="form-input" />
              <p className="form-help">Tiến độ lũy kế, không giảm so với các báo cáo trước.</p>
            </div>
          </div>

          <div>
            <label className="form-label">Công việc đã làm</label>
            <textarea {...register("workDescription")} rows={4} className="form-input" />
            {errors.workDescription && <p className="form-error">{errors.workDescription.message}</p>}
          </div>

          <div>
            <label className="form-label">Vấn đề / vướng mắc</label>
            <textarea {...register("issues")} rows={3} className="form-input" />
          </div>

          <div>
            <label className="form-label">Ghi chú</label>
            <textarea {...register("notes")} rows={3} className="form-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={cancelEdit}>Hủy</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              <Save className="h-4 w-4" />
              Lưu thay đổi
            </Button>
          </div>
        </form>
      ) : (
        /* View mode */
        <div className="app-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-brand-600">{report.progress}%</span>
            <div className="flex items-center gap-2">
              {canEdit && report.status === "DRAFT" && (
                <button
                  onClick={() => statusMutation.mutate("SENT")}
                  disabled={statusMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Gửi báo cáo
                </button>
              )}
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${report.progress}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">Thời tiết:</span>{" "}
              <span className="font-medium text-slate-800">{WEATHER_LABELS[report.weather] ?? report.weather}</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">Số công nhân:</span>{" "}
              <span className="font-medium text-slate-800">{report.workerCount}</span>
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-slate-700">Công việc đã làm</h3>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">{report.workDescription}</div>
          </div>

          {report.issues && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-700">Vấn đề</h3>
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{report.issues}</div>
            </div>
          )}

          {report.notes && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-slate-700">Ghi chú</h3>
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">{report.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Images section */}
      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Ảnh hiện trường ({displayImages.length})
          </h3>
          {canEdit && (
            <div>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Thêm ảnh
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {pendingImages.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Ảnh chờ tải lên:</p>
            <div className="grid grid-cols-3 gap-2">
              {pendingImages.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="aspect-square">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                      onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)}
                    />
                  </div>
                  <p className="truncate px-1 py-0.5 text-xs text-slate-600">{file.name}</p>
                  <button
                    type="button"
                    onClick={() => setPendingImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              isLoading={uploadImageMutation.isPending}
              onClick={() => uploadImageMutation.mutate(pendingImages)}
            >
              Tải {pendingImages.length} ảnh lên
            </Button>
          </div>
        )}

        {displayImages.length === 0 && pendingImages.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có ảnh nào cho báo cáo này.</p>
        )}

        {displayImages.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {displayImages.map((img) => (
              <div key={img.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                <div className="aspect-square">
                  <img
                    src={getReportImageViewUrl(currentProjectId, String(reportId), img.id)}
                    alt={img.originalName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="truncate px-2 py-1 text-xs text-slate-600">{img.originalName}</p>
                {canUseReportAdmin && (
                  <button
                    onClick={() => {
                      if (confirm("Xóa ảnh này?")) deleteImageMutation.mutate(img.id);
                    }}
                    disabled={deleteImageMutation.isPending}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Từ chối báo cáo</h2>
              <button onClick={() => setShowRejectModal(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="form-label">Lý do từ chối</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="form-input"
                  placeholder="Nhập lý do từ chối..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Hủy</Button>
                <Button
                  onClick={() => rejectMutation.mutate(rejectReason)}
                  isLoading={rejectMutation.isPending}
                  disabled={!rejectReason.trim()}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
