import api from '../../../config/api'
import type { QualityReport } from '@construction/shared'

interface ApiSingleResponse<T> {
  success: true
  data: T
}

export interface QualityDashboardResponse {
  projectId: string
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
    passRate: number
  }
  reports: QualityReport[]
}

export interface QualityReportPayload {
  reportDate: string
  inspectorId?: string
  location: string
  description: string
}

export const qualityApi = {
  async list(projectId: string) {
    const response = await api.get<ApiSingleResponse<QualityDashboardResponse>>(`/projects/${projectId}/quality`)
    return response.data.data
  },

  async getById(projectId: string, reportId: string) {
    const response = await api.get<ApiSingleResponse<QualityReport>>(`/projects/${projectId}/quality/${reportId}`)
    return response.data.data
  },

  async create(projectId: string, payload: QualityReportPayload) {
    const response = await api.post<ApiSingleResponse<QualityReport>>(`/projects/${projectId}/quality`, payload)
    return response.data.data
  },

  async update(projectId: string, reportId: string, payload: Partial<QualityReportPayload> & { inspectorId?: string }) {
    const response = await api.patch<ApiSingleResponse<QualityReport>>(
      `/projects/${projectId}/quality/${reportId}`,
      payload,
    )
    return response.data.data
  },

  async sign(projectId: string, reportId: string) {
    const response = await api.post<ApiSingleResponse<QualityReport>>(`/projects/${projectId}/quality/${reportId}/sign`)
    return response.data.data
  },

  async reopen(projectId: string, reportId: string, reason: string) {
    const response = await api.post<ApiSingleResponse<QualityReport>>(
      `/projects/${projectId}/quality/${reportId}/reopen`,
      { reason },
    )
    return response.data.data
  },
}
