import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Save } from 'lucide-react'
import { qualityApi } from '../api/qualityApi'
import { ErrorState } from '../../../shared/components/feedback/ErrorState'
import { SkeletonCard } from '../../../shared/components/feedback/SkeletonCard'
import { SpecialPrivilegeGate } from '../../../shared/components/SpecialPrivilegeGate'
import { usePermission } from '../../../shared/hooks/usePermission'
import { useProjectPermissions } from '../../../shared/hooks/useProjectPermissions'
import { useAuthStore } from '../../../store/authStore'
import { useUiStore } from '../../../store/uiStore'

function formatDateInput(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 10)
}

export function QualityReportPage() {
  const { id, reportId } = useParams<{ id: string; reportId?: string }>()
  const projectId = id ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)
  const { user } = useAuthStore()
  const { data: permissionData } = useProjectPermissions(projectId)
  const isEditing = Boolean(reportId)
  const isPmOrAdmin = user?.systemRole === 'ADMIN' || permissionData?.projectRole === 'PROJECT_MANAGER'
  const { has: canUseQualityStandard } = usePermission({
    projectId,
    toolId: 'QUALITY',
    minLevel: 'STANDARD',
  })

  const [reportDate, setReportDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const {
    data: report,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['quality-report', projectId, reportId],
    queryFn: () => qualityApi.getById(projectId, String(reportId)),
    enabled: Boolean(projectId) && Boolean(reportId),
  })

  useEffect(() => {
    if (!report) return
    setReportDate(formatDateInput(report.reportDate))
    setLocation(report.location)
    setDescription(report.description)
  }, [report])

  useEffect(() => {
    if (!isEditing) {
      const today = new Date().toISOString().slice(0, 10)
      setReportDate(today)
    }
  }, [isEditing])

  const canEditReport = useMemo(() => {
    if (!canUseQualityStandard) return false
    if (!isEditing) return true
    if (!report) return false
    if (report.status === 'APPROVED') return false
    return isPmOrAdmin || report.inspectorId === user?.id
  }, [canUseQualityStandard, isEditing, report, isPmOrAdmin, user?.id])
  const canReopenReport = Boolean(isEditing && report?.status === 'APPROVED' && isPmOrAdmin)
  const editBlockedMessage = useMemo(() => {
    if (!canUseQualityStandard) return 'Bạn chưa có quyền sửa báo cáo chất lượng trong dự án này.'
    if (report?.status === 'APPROVED') {
      return 'Báo cáo đã được duyệt, không thể chỉnh sửa trực tiếp. Admin hoặc PM có thể mở lại báo cáo nếu cần điều chỉnh.'
    }
    if (report && !isPmOrAdmin && report.inspectorId !== user?.id) {
      return 'Chỉ người lập báo cáo, PM hoặc Admin được sửa báo cáo này.'
    }
    return 'Bạn không thể sửa báo cáo này ở trạng thái hiện tại.'
  }, [canUseQualityStandard, report, isPmOrAdmin, user?.id])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        reportDate,
        location,
        description,
      }

      if (!isEditing) {
        return qualityApi.create(projectId, payload)
      }

      return qualityApi.update(projectId, String(reportId), payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['quality-reports', projectId] })
      queryClient.invalidateQueries({ queryKey: ['quality-report', projectId, reportId] })
      showToast({
        type: 'success',
        title: isEditing ? 'Đã cập nhật báo cáo QC' : 'Đã tạo báo cáo QC',
      })

      if (!isEditing) {
        navigate(`/projects/${projectId}/quality/${saved.id}`)
      }
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể lưu báo cáo',
      })
    },
  })

  const signMutation = useMutation({
    mutationFn: () => qualityApi.sign(projectId, String(reportId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-reports', projectId] })
      queryClient.invalidateQueries({ queryKey: ['quality-report', projectId, reportId] })
      showToast({ type: 'success', title: 'Đã ký nghiệm thu báo cáo QC' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể ký nghiệm thu',
      })
    },
  })

  const reopenMutation = useMutation({
    mutationFn: (reason: string) => qualityApi.reopen(projectId, String(reportId), reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['quality-report', projectId, reportId], updated)
      queryClient.invalidateQueries({ queryKey: ['quality-reports', projectId] })
      queryClient.invalidateQueries({ queryKey: ['quality-report', projectId, reportId] })
      showToast({ type: 'success', title: 'Đã mở lại báo cáo QC' })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể mở lại báo cáo',
      })
    },
  })

  const handleReopen = () => {
    const reason = window.prompt('Nhập lý do mở lại báo cáo đã duyệt:')
    if (!reason?.trim()) return
    reopenMutation.mutate(reason.trim())
  }

  if (!projectId) {
    return <ErrorState message="Không tìm thấy thông tin dự án." />
  }

  if (isEditing && isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    )
  }

  if (isEditing && (isError || !report)) {
    return <ErrorState message="Không tải được chi tiết báo cáo QC." />
  }

  if (!canUseQualityStandard && !isEditing) {
    return <ErrorState message="Bạn không có quyền tạo báo cáo QC." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/projects/${projectId}/quality`}
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            ← Quality dashboard
          </Link>
          <h2 className="mt-1">{isEditing ? 'Chi tiết báo cáo QC' : 'Tạo báo cáo QC'}</h2>
          {report && (
            <p className="page-subtitle">
              Người lập: {report.inspector?.name ?? report.inspectorId} · Trạng thái: {report.status}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canReopenReport && (
            <button
              onClick={handleReopen}
              disabled={reopenMutation.isPending}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mở lại báo cáo
            </button>
          )}
          {isEditing && report?.status === 'PENDING' && (
            <SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
              <button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Ký nghiệm thu
              </button>
            </SpecialPrivilegeGate>
          )}
        </div>
      </div>

      <div className="app-card space-y-4">
        <div>
          <label className="form-label">Ngay báo cáo</label>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="form-input"
            disabled={!canEditReport}
          />
        </div>

        <div>
          <label className="form-label">Vị trí</label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="form-input"
            placeholder="Khu vuc kiem tra..."
            disabled={!canEditReport}
          />
        </div>

        <div>
          <label className="form-label">Nội dung QC</label>
          <textarea
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-input"
            placeholder="Mô tả kết quả kiểm tra chất lượng..."
            disabled={!canEditReport}
          />
        </div>

        {canEditReport ? (
          <div className="flex justify-end gap-2">
            <Link
              to={`/projects/${projectId}/quality`}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Link>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Lưu thay đổi' : 'Tạo báo cáo'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {editBlockedMessage}
          </div>
        )}
      </div>
    </div>
  )
}
