import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Download, File, Image, FileText, FileSpreadsheet } from "lucide-react";
import { listProjectFiles, uploadProjectFile, deleteProjectFile, getFileDownloadUrl } from "../api/fileApi";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-violet-500" />;
  if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.toUpperCase?.();
  const canUpload = normalizedRole === "ADMIN" || normalizedRole === "PROJECT_MANAGER" || normalizedRole === "SITE_ENGINEER";
  const canDelete = normalizedRole === "ADMIN" || normalizedRole === "PROJECT_MANAGER";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => listProjectFiles(String(projectId)),
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProjectFile(String(projectId), file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      showToast({ type: "success", title: "Tải file lên thành công" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể tải file" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteProjectFile(String(projectId), fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      showToast({ type: "success", title: "Đã xóa file" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa file" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach((file) => uploadMutation.mutate(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const files = data?.files ?? [];

  if (isLoading) {
    return <div className="space-y-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>;
  }

  if (isError) {
    return <ErrorState message="Không tải được danh sách file." />;
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Files dự án</h2>
          <p className="page-subtitle">{files.length} file được lưu trữ.</p>
        </div>
        {canUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Tải lên
            </button>
          </div>
        )}
      </div>

      {files.length === 0 ? (
        <EmptyState
          title="Chưa có file nào"
          description={canUpload ? "Tải lên file để lưu trữ tài liệu dự án." : "Chưa có file nào được tải lên."}
        />
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="app-card flex items-center gap-3">
              <FileIcon mimeType={file.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.originalName}</p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString("vi-VN")}
                  {file.uploader && ` · ${file.uploader.name}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={getFileDownloadUrl(String(projectId), file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Xóa file "${file.originalName}"?`)) {
                        deleteMutation.mutate(file.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    title="Xóa file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
