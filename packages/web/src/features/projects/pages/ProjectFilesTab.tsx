import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, File, FileSpreadsheet, FileText, Image, Trash2, Upload } from "lucide-react";
import { deleteProjectFile, getFileDownloadUrl, listProjectFiles, uploadProjectFile } from "../api/fileApi";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useUiStore } from "../../../store/uiStore";

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
  const currentProjectId = projectId ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { has: canUpload } = usePermission({
    projectId: currentProjectId,
    toolId: "FILE",
    minLevel: "STANDARD",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-files", currentProjectId],
    queryFn: () => listProjectFiles(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProjectFile(currentProjectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", currentProjectId] });
      showToast({ type: "success", title: "Tai file len thành công" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Không thể tai file",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteProjectFile(currentProjectId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-files", currentProjectId] });
      showToast({ type: "success", title: "Da xóa file" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Không thể xóa file",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => uploadMutation.mutate(file));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const files = data?.files ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Không tải được danh sach file." />;
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Files dự án</h2>
          <p className="page-subtitle">{files.length} file được lưu tru.</p>
        </div>
        <PermissionGate projectId={currentProjectId} toolId="FILE" minLevel="STANDARD">
          <div>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Tải lên
            </button>
          </div>
        </PermissionGate>
      </div>

      {files.length === 0 ? (
        <EmptyState
          title="Chưa có file nào"
          description={canUpload ? "Tải file lên để lưu trữ tài liệu dự án." : "Chưa có file nào được tai len."}
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
                  href={getFileDownloadUrl(currentProjectId, file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  title="Tai xuong"
                >
                  <Download className="h-4 w-4" />
                </a>
                <PermissionGate projectId={currentProjectId} toolId="FILE" minLevel="ADMIN">
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
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}




