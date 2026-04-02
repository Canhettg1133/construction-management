import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import {
  createReport,
  uploadReportImages,
} from "../api/reportApi";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import { LIMITS } from "@construction/shared";
import type { DailyReport } from "@construction/shared";

const reportSchema = z.object({
  reportDate: z.string().min(1, "Vui lòng chọn ngày báo cáo"),
  weather: z.enum(["SUNNY", "RAINY", "CLOUDY", "OTHER"]),
  workerCount: z.coerce.number().min(0, "Số công nhân không hợp lệ"),
  progress: z.coerce.number().min(0).max(100),
  workDescription: z.string().min(1, "Vui lòng nhập mô tả công việc").max(5000),
  issues: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

type ReportForm = z.infer<typeof reportSchema>;

export function ReportCreatePage() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState("");
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: new Date().toISOString().slice(0, 10),
      weather: "SUNNY",
      workerCount: 0,
      progress: 0,
      workDescription: "",
      issues: "",
      notes: "",
    },
  });

  const onPickImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > LIMITS.MAX_IMAGE_SIZE) {
        newErrors.push(`"${file.name}" vượt quá 5MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) setImageErrors(newErrors);
    else setImageErrors([]);

    const next = [...selectedImages, ...validFiles].slice(0, LIMITS.MAX_REPORT_IMAGES);
    setSelectedImages(next);
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ReportForm) => {
      const created = await createReport(String(projectId), payload);
      return created;
    },
    onMutate: async (payload) => {
      const queryKey = ["reports", projectId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousReports = queryClient.getQueryData(queryKey);

      const optimisticReport: DailyReport = {
        id: `temp-${crypto.randomUUID()}`,
        projectId: String(projectId),
        createdBy: "me",
        reportDate: payload.reportDate,
        weather: payload.weather,
        workerCount: payload.workerCount,
        workDescription: payload.workDescription,
        issues: payload.issues || null,
        progress: payload.progress,
        notes: payload.notes || null,
        status: "SENT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<DailyReport[]>(queryKey, [optimisticReport, ...(previousReports as DailyReport[] ?? [])]);
      return { previousReports, queryKey };
    },
    onSuccess: async (createdReport, _payload, context) => {
      if (context) {
        queryClient.setQueryData<DailyReport[]>(context.queryKey, (current = []) => {
          const withoutTemp = current.filter((report) => !report.id.startsWith("temp-"));
          return [createdReport, ...withoutTemp];
        });
      }

      // Upload images after report creation
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        try {
          await uploadReportImages(String(projectId), createdReport.id, selectedImages);
          showToast({ type: "success", title: "Đã tải ảnh lên thành công" });
        } catch (e) {
          showToast({ type: "error", title: "Lỗi tải ảnh", description: "Báo cáo đã lưu nhưng ảnh chưa tải được." });
        } finally {
          setUploadingImages(false);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["reports", projectId] });
      showToast({ type: "success", title: "Lưu báo cáo thành công" });
      reset();
      setSelectedImages([]);
      navigate(`/projects/${projectId}/reports`);
    },
    onError: (e, _payload, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousReports);
      }
      const msg = e instanceof Error ? e.message : "Tạo báo cáo thất bại";
      setGlobalError(msg);
      showToast({ type: "error", title: "Không thể gửi báo cáo", description: msg });
    },
  });

  const onSubmit = async (data: ReportForm) => {
    setGlobalError("");
    await createMutation.mutateAsync(data);
  };

  const WEATHER_OPTIONS = [
    { value: "SUNNY", label: "Nắng" },
    { value: "RAINY", label: "Mưa" },
    { value: "CLOUDY", label: "Nhiều mây" },
    { value: "OTHER", label: "Khác" },
  ];

  return (
    <div className="app-card mx-auto w-full max-w-3xl">
      <div className="mb-5 sm:mb-6">
        <h1>Tạo báo cáo ngày</h1>
        <p className="page-subtitle">Mobile-first để nhập liệu nhanh tại công trường.</p>
      </div>

      {globalError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Ngày báo cáo</label>
            <input {...register("reportDate")} type="date" className="form-input" />
            {errors.reportDate && <p className="form-error">{errors.reportDate.message}</p>}
          </div>
          <div>
            <label className="form-label">Thời tiết</label>
            <select {...register("weather")} className="form-input">
              {WEATHER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Số công nhân</label>
            <input {...register("workerCount")} type="number" min={0} className="form-input" />
            {errors.workerCount && <p className="form-error">{errors.workerCount.message}</p>}
          </div>
          <div>
            <label className="form-label">Tiến độ (%)</label>
            <input {...register("progress")} type="number" min={0} max={100} className="form-input" />
            {errors.progress && <p className="form-error">{errors.progress.message}</p>}
          </div>
        </div>

        <div>
          <label className="form-label">Công việc đã làm</label>
          <textarea
            {...register("workDescription")}
            rows={4}
            className="form-input"
            placeholder="Nhập mô tả công việc hôm nay"
          />
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

        <div>
          <label className="form-label">Ảnh hiện trường (tối đa {LIMITS.MAX_REPORT_IMAGES})</label>
          <div className="mt-1.5 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Chọn ảnh
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                capture="environment"
                onChange={onPickImages}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500">
              {selectedImages.length} / {LIMITS.MAX_REPORT_IMAGES} ảnh
            </span>
          </div>
          <p className="form-help">Ưu tiên ảnh rõ bối cảnh thi công. JPG/PNG, tối đa 5MB.</p>

          {imageErrors.length > 0 && (
            <div className="mt-2 space-y-1">
              {imageErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedImages.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="aspect-square flex items-center justify-center bg-slate-100">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="truncate px-2 py-1 text-xs text-slate-600">{file.name}</p>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => navigate(`/projects/${projectId}/reports`)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || uploadingImages}
              className="w-full sm:w-auto"
            >
              {uploadingImages ? "Đang tải ảnh..." : "Gửi báo cáo"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
