import api from "../../../config/api";
import type { BudgetDisbursement, BudgetItem } from "@construction/shared";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export interface BudgetOverviewResponse {
  projectId: string;
  summary: {
    estimated: number | string;
    approved: number | string;
    spent: number | string;
    remaining: number | string;
    pendingDisbursement: number | string;
  };
  byCategory: Array<{
    category: string;
    estimated: number | string;
    approved: number | string;
    spent: number | string;
    remaining: number | string;
  }>;
  stats: {
    totalItems: number;
    pendingItems: number;
    approvedItems: number;
    paidItems: number;
  };
}

export interface BudgetItemsResponse {
  projectId: string;
  items: BudgetItem[];
}

export interface BudgetItemPayload {
  category: string;
  description: string;
  estimatedCost: number;
  approvedCost?: number | null;
  status?: "PENDING" | "APPROVED" | "PAID";
}

export interface BudgetDisbursementPayload {
  budgetItemId: string;
  amount: number;
  note?: string;
}

export const budgetApi = {
  async getOverview(projectId: string) {
    const response = await api.get<ApiSingleResponse<BudgetOverviewResponse>>(
      `/projects/${projectId}/budget`
    );
    return response.data.data;
  },

  async listItems(projectId: string) {
    const response = await api.get<ApiSingleResponse<BudgetItemsResponse>>(
      `/projects/${projectId}/budget/items`
    );
    return response.data.data;
  },

  async createItem(projectId: string, payload: BudgetItemPayload) {
    const response = await api.post<ApiSingleResponse<BudgetItem>>(
      `/projects/${projectId}/budget/items`,
      payload
    );
    return response.data.data;
  },

  async updateItem(projectId: string, id: string, payload: Partial<BudgetItemPayload>) {
    const response = await api.patch<ApiSingleResponse<BudgetItem>>(
      `/projects/${projectId}/budget/items/${id}`,
      payload
    );
    return response.data.data;
  },

  async createDisbursement(projectId: string, payload: BudgetDisbursementPayload) {
    const response = await api.post<ApiSingleResponse<BudgetDisbursement>>(
      `/projects/${projectId}/budget/disbursements`,
      payload
    );
    return response.data.data;
  },

  async approveDisbursement(
    projectId: string,
    id: string,
    payload: { status?: "APPROVED" | "PAID"; note?: string }
  ) {
    const response = await api.patch<ApiSingleResponse<BudgetDisbursement>>(
      `/projects/${projectId}/budget/disbursements/${id}`,
      payload
    );
    return response.data.data;
  },
};
