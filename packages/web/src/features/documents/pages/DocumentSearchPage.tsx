import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, X } from "lucide-react";
import { searchDocuments, getDocumentDownloadUrl } from "../api/documentApi";
import { listProjects } from "../../projects/api/projectApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { DOCUMENT_TAG_SUGGESTIONS, hasTag, toggleTag } from "../constants/tagSuggestions";

function sanitizeMangledVietnamese(str: string) {
  try {
    if (/[\u00C0-\u00FF][\u0080-\u00BF]/.test(str)) {
      return decodeURIComponent(escape(str));
    }
  } catch {
    return str;
  }
  return str;
}

export function DocumentSearchPage() {
  const [keyword, setKeyword] = useState("");
  const [projectId, setProjectId] = useState("");
  const [tags, setTags] = useState("");
  const [submitted, setSubmitted] = useState({
    keyword: "",
    projectId: "",
    tags: "",
  });

  const projectQuery = useQuery({
    queryKey: ["projects", "document-search"],
    queryFn: () => listProjects({ page: 1, pageSize: 200 }),
  });

  const searchQuery = useQuery({
    queryKey: ["document-search", submitted.keyword, submitted.projectId, submitted.tags],
    queryFn: () =>
      searchDocuments({
        q: submitted.keyword.trim() || undefined,
        projectId: submitted.projectId.trim() || undefined,
        tags: submitted.tags.trim() || undefined,
      }),
  });

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projectQuery.data?.projects ?? []) {
      map.set(project.id, project.name);
    }
    return map;
  }, [projectQuery.data?.projects]);

  const hasActiveFilters = Boolean(
    submitted.keyword.trim() || submitted.projectId.trim() || submitted.tags.trim()
  );

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2>Tìm tài liệu</h2>
          <p className="page-subtitle">
            Tìm theo tên tệp, nhãn hoặc lọc theo dự án. Mặc định hiển thị tài liệu mới nhất toàn hệ thống.
          </p>
        </div>
      </div>

      <div className="app-card">
        <form
          className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted({ keyword, projectId, tags });
          }}
        >
          <div>
            <label className="form-label">Tên tệp</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="form-input"
              placeholder="Nhập tên tệp hoặc từ khóa..."
            />
          </div>
          <div>
            <label className="form-label">Dự án</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="form-input">
              <option value="">Tất cả dự án</option>
              {(projectQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Nhãn</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="form-input"
              list="document-tag-suggestions"
              placeholder="hợp đồng, biên bản"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DOCUMENT_TAG_SUGGESTIONS.map((tag) => {
                const active = hasTag(tags, tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags(toggleTag(tags, tag))}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      active
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 md:self-end">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setKeyword("");
                setProjectId("");
                setTags("");
                setSubmitted({ keyword: "", projectId: "", tags: "" });
              }}
              title="Xóa bộ lọc"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {hasActiveFilters ? "Kết quả theo bộ lọc hiện tại" : "Tài liệu mới nhất"}
        </span>
        {!searchQuery.isLoading && !searchQuery.isError ? (
          <span>{(searchQuery.data ?? []).length} tài liệu</span>
        ) : null}
      </div>

      {searchQuery.isLoading && (
        <div className="space-y-2">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      )}

      {searchQuery.isError && <ErrorState message="Không tìm kiếm được tài liệu." />}

      {!searchQuery.isLoading && !searchQuery.isError && (searchQuery.data ?? []).length === 0 && (
        <EmptyState
          title={hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có tài liệu nào"}
          description={
            hasActiveFilters
              ? "Thử đổi từ khóa, nhãn hoặc bớt điều kiện lọc."
              : "Tài liệu vừa tải lên sẽ xuất hiện tại đây."
          }
        />
      )}

      {!searchQuery.isLoading && !searchQuery.isError && (searchQuery.data ?? []).length > 0 && (
        <div className="space-y-2">
          {(searchQuery.data ?? []).map((file) => (
            <div
              key={file.id}
              className="app-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {sanitizeMangledVietnamese(file.originalName)}
                </p>
                <p className="text-xs text-slate-500">
                  {projectNameById.get(file.projectId) ?? file.project?.name ?? file.projectId}
                  {" - "}v{file.version}
                  {file.tags ? ` - ${file.tags}` : " - Chưa gắn nhãn"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/projects/${file.projectId}/documents`}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mở thư mục
                </Link>
                <a
                  href={getDocumentDownloadUrl(file.projectId, file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <datalist id="document-tag-suggestions">
        {DOCUMENT_TAG_SUGGESTIONS.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}
