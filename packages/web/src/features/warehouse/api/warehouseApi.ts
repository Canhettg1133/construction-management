import api from "../../../config/api";
import type { WarehouseInventory, WarehouseTransaction } from "@construction/shared";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export interface WarehouseInventoryResponse {
  projectId: string;
  summary: {
    totalItems: number;
    lowStockItems: number;
    totalQuantity: number;
  };
  inventory: Array<WarehouseInventory & { _count?: { transactions: number } }>;
  restricted?: boolean;
  message?: string;
}

export interface WarehouseTransactionResponse {
  projectId: string;
  summary: {
    total: number;
    pending: number;
    requests: number;
  };
  transactions: WarehouseTransaction[];
}

export interface WarehouseTransactionPayload {
  inventoryId: string;
  type: "IN" | "OUT";
  quantity: number;
  note?: string;
}

export interface WarehouseRequestPayload {
  inventoryId: string;
  quantity: number;
  note?: string;
}

export const warehouseApi = {
  async listInventory(projectId: string) {
    const response = await api.get<ApiSingleResponse<WarehouseInventoryResponse>>(
      `/projects/${projectId}/warehouse/inventory`
    );
    return response.data.data;
  },

  async getInventoryItem(projectId: string, id: string) {
    const response = await api.get<ApiSingleResponse<WarehouseInventory>>(
      `/projects/${projectId}/warehouse/inventory/${id}`
    );
    return response.data.data;
  },

  async listTransactions(projectId: string) {
    const response = await api.get<ApiSingleResponse<WarehouseTransactionResponse>>(
      `/projects/${projectId}/warehouse/transactions`
    );
    return response.data.data;
  },

  async createTransaction(projectId: string, payload: WarehouseTransactionPayload) {
    const response = await api.post<ApiSingleResponse<WarehouseTransaction>>(
      `/projects/${projectId}/warehouse/transactions`,
      payload
    );
    return response.data.data;
  },

  async createRequest(projectId: string, payload: WarehouseRequestPayload) {
    const response = await api.post<ApiSingleResponse<WarehouseTransaction>>(
      `/projects/${projectId}/warehouse/requests`,
      payload
    );
    return response.data.data;
  },

  async updateRequest(
    projectId: string,
    id: string,
    payload: { status: "APPROVED" | "REJECTED"; note?: string }
  ) {
    const response = await api.patch<ApiSingleResponse<WarehouseTransaction>>(
      `/projects/${projectId}/warehouse/requests/${id}`,
      payload
    );
    return response.data.data;
  },
};
