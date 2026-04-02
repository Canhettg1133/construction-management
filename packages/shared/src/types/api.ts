export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type AnyResponse<T> = ApiResponse<T> | ApiError;

export interface PaginationQuery {
  page?: number;
  page_size?: number;
}

export interface SortQuery {
  sort_by?: string;
  sort_order?: "asc" | "desc";
}
