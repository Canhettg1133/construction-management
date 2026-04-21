import api from '../../../config/api'
import type { SafetyReport } from '@construction/shared'

interface ApiSingleResponse<T> {
  success: true
  data: T
}

export interface SafetyDashboardResponse {
  projectId: string
  summary: {
    total: number
    violations: number
    pending: number
    approved: number
    rejected: number
  }
  reports: SafetyReport[]
}

export interface SafetyReportPayload {
  reportDate: string
  inspectorId?: string
  location: string
  description: string
  violations?: number
  photos?: string[]
}

export const safetyApi = {
  async list(projectId: string) {
    const response = await api.get<ApiSingleResponse<SafetyDashboardResponse>>(`/projects/${projectId}/safety`)
    return response.data.data
  },

  async getById(projectId: string, reportId: string) {
    const response = await api.get<ApiSingleResponse<SafetyReport>>(`/projects/${projectId}/safety/${reportId}`)
    return response.data.data
  },

  async create(projectId: string, payload: SafetyReportPayload) {
    const response = await api.post<ApiSingleResponse<SafetyReport>>(`/projects/${projectId}/safety`, payload)
    return response.data.data
  },

  async update(projectId: string, reportId: string, payload: Partial<SafetyReportPayload> & { inspectorId?: string }) {
    const response = await api.patch<ApiSingleResponse<SafetyReport>>(
      `/projects/${projectId}/safety/${reportId}`,
      payload,
    )
    return response.data.data
  },

  async sign(projectId: string, reportId: string) {
    const response = await api.post<ApiSingleResponse<SafetyReport>>(`/projects/${projectId}/safety/${reportId}/sign`)
    return response.data.data
  },

  async reopen(projectId: string, reportId: string, reason: string) {
    const response = await api.post<ApiSingleResponse<SafetyReport>>(
      `/projects/${projectId}/safety/${reportId}/reopen`,
      { reason },
    )
    return response.data.data
  },
}
