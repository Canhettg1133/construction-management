import { LIMITS } from "@construction/shared";

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    LIMITS.MAX_PAGE_SIZE,
    Math.max(1, Number(query.page_size) || LIMITS.DEFAULT_PAGE_SIZE)
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): { page: number; pageSize: number; total: number; totalPages: number } {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
