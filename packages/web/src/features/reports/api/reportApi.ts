import api from '../../../config/api'
import type { DailyReport, ReportImage } from '@construction/shared'

interface ReportListResponse {
  success: true
  data: DailyReport[]
  meta?: { page: number; pageSize: number; total: number; totalPages: number }
}

interface SingleReportResponse {
  success: true
  data: DailyReport
}

interface ImageArrayResponse {
  success: true
  data: ReportImage[]
}

export async function listReports(
  projectId: string,
  params?: {
    page?: number
    pageSize?: number
    from?: string
    to?: string
    created_by?: string
  },
) {
  const res = await api.get<ReportListResponse>(`/projects/${projectId}/reports`, { params })
  return { reports: res.data.data, meta: res.data.meta }
}

export async function getReport(projectId: string, reportId: string): Promise<DailyReport> {
  const res = await api.get<SingleReportResponse>(`/projects/${projectId}/reports/${reportId}`)
  return res.data.data
}

export async function createReport(
  projectId: string,
  payload: {
    reportDate: string
    weather: 'SUNNY' | 'RAINY' | 'CLOUDY' | 'OTHER'
    workerCount: number
    progress: number
    workDescription: string
    issues?: string
    notes?: string
  },
): Promise<DailyReport> {
  const res = await api.post<SingleReportResponse>(`/projects/${projectId}/reports`, payload)
  return res.data.data
}

export async function updateReport(
  projectId: string,
  reportId: string,
  payload: Partial<Pick<DailyReport, 'weather' | 'workerCount' | 'workDescription' | 'issues' | 'progress' | 'notes'>>,
): Promise<DailyReport> {
  const res = await api.patch<SingleReportResponse>(`/projects/${projectId}/reports/${reportId}`, payload)
  return res.data.data
}

export async function updateReportStatus(
  projectId: string,
  reportId: string,
  status: 'DRAFT' | 'SENT',
): Promise<DailyReport> {
  const res = await api.patch<SingleReportResponse>(`/projects/${projectId}/reports/${reportId}/status`, { status })
  return res.data.data
}

export async function deleteReport(projectId: string, reportId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/reports/${reportId}`)
}

export async function uploadReportImages(projectId: string, reportId: string, files: File[]): Promise<ReportImage[]> {
  const formData = new FormData()
  files.forEach((file) => formData.append('images', file))
  const res = await api.post<ImageArrayResponse>(`/projects/${projectId}/reports/${reportId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export async function deleteReportImage(projectId: string, reportId: string, imageId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/reports/${reportId}/images/${imageId}`)
}

export async function submitReportForApproval(projectId: string, reportId: string): Promise<DailyReport> {
  const res = await api.post<SingleReportResponse>(`/projects/${projectId}/reports/${reportId}/submit`)
  return res.data.data
}

export async function reopenReport(projectId: string, reportId: string, reason: string): Promise<DailyReport> {
  const res = await api.post<SingleReportResponse>(`/projects/${projectId}/reports/${reportId}/reopen`, { reason })
  return res.data.data
}

export function getReportImageViewUrl(projectId: string, reportId: string, imageId: string) {
  return `/api/v1/projects/${projectId}/reports/${reportId}/images/${imageId}/view`
}
