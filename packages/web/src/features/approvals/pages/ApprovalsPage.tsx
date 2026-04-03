import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, FileText, CheckSquare,
  ShieldAlert, Loader2,
} from "lucide-react";
import {
  listPendingApprovals,
  approveReport, rejectReport,
  approveTask, rejectTask,
} from "../api/approvalApi";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import type { DailyReport, Task } from "@construction/shared";

type Tab = "reports" | "tasks";

function ReportRow({
  report,
  onApprove,
  onReject,
}: {
  report: DailyReport & { project: { id: string; name: string } };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            onClick={() => navigate(`/projects/${report.projectId}/reports/${report.id}`)}
            className="cursor-pointer text-sm font-medium text-slate-900 hover:text-brand-600"
          >
            Báo cáo ngày {new Date(report.reportDate).toLocaleDateString("vi-VN")}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">Chờ duyệt</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{report.project.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Progress: <span className="font-medium">{report.progress}%</span> · {report.workerCount} công nhân
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onApprove(report.id)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Duyệt
          </button>
          <button
            onClick={() => onReject(report.id)}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Từ chối
          </button>
          <button
            onClick={() => navigate(`/projects/${report.projectId}/reports/${report.id}`)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onApprove,
  onReject,
}: {
  task: Task & { project: { id: string; name: string } };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
        <CheckSquare className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            onClick={() => navigate(`/projects/${task.projectId}/tasks/${task.id}`)}
            className="cursor-pointer text-sm font-medium text-slate-900 hover:text-brand-600"
          >
            {task.title}
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">Chờ duyệt</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{task.project.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Deadline:{" "}
          <span className="font-medium">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "—"}
          </span>
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onApprove(task.id)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Duyệt
          </button>
          <button
            onClick={() => onReject(task.id)}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Từ chối
          </button>
          <button
            onClick={() => navigate(`/projects/${task.projectId}/tasks/${task.id}`)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("reports");
  const [pendingRejectId, setPendingRejectId] = useState<{ type: Tab; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);

  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => listPendingApprovals(),
  });

  const approveReportMutation = useMutation({
    mutationFn: (id: string) => approveReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      showToast({ type: "success", title: "Đã duyệt thành công" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Thao tác thất bại" });
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: (id: string) => approveTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      showToast({ type: "success", title: "Đã duyệt thành công" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Thao tác thất bại" });
    },
  });

  const rejectReportMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectReport(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setPendingRejectId(null);
      setRejectReason("");
      showToast({ type: "success", title: "Đã từ chối" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Thao tác thất bại" });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectTask(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setPendingRejectId(null);
      setRejectReason("");
      showToast({ type: "success", title: "Đã từ chối" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Thao tác thất bại" });
    },
  });

  const reports = data?.data?.reports ?? [];
  const tasks = data?.data?.tasks ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Duyệt công việc</h1>
          <p className="mt-0.5 text-sm text-slate-500">Danh sách báo cáo và task chờ duyệt</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("reports")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "reports"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          Báo cáo ngày
          {reports.length > 0 && (
            <span className="ml-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {reports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("tasks")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "tasks"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Tasks
          {tasks.length > 0 && (
            <span className="ml-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {tasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-200" />
              <p className="mt-3 font-medium text-slate-500">Không có báo cáo nào chờ duyệt</p>
            </div>
          ) : (
            reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onApprove={(id) => approveReportMutation.mutate(id)}
                onReject={(id) => setPendingRejectId({ type: "reports", id })}
              />
            ))
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-200" />
              <p className="mt-3 font-medium text-slate-500">Không có task nào chờ duyệt</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onApprove={(id) => approveTaskMutation.mutate(id)}
                onReject={(id) => setPendingRejectId({ type: "tasks", id })}
              />
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      {pendingRejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Từ chối</h2>
              <button onClick={() => setPendingRejectId(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <XCircle className="h-5 w-5" />
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
                  placeholder="Nhập lý do..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPendingRejectId(null)}>Hủy</Button>
                <Button
                  onClick={() => {
                    if (pendingRejectId.type === "reports") {
                      rejectReportMutation.mutate({ id: pendingRejectId.id, reason: rejectReason });
                    } else {
                      rejectTaskMutation.mutate({ id: pendingRejectId.id, reason: rejectReason });
                    }
                  }}
                  isLoading={rejectReportMutation.isPending || rejectTaskMutation.isPending}
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
