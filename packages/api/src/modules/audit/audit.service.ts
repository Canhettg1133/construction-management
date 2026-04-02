import { auditRepository } from "./audit.repository";

export const auditService = {
  async list(page: number, pageSize: number, filters: Record<string, unknown>) {
    const [logs, total] = await Promise.all([
      auditRepository.findAll(page, pageSize, filters),
      auditRepository.count(filters),
    ]);
    return { logs, total };
  },

  log(data: { userId?: string; action: string; entityType: string; entityId?: string; description: string; ipAddress?: string; userAgent?: string }) {
    return auditRepository.create(data).catch(() => {
      // Best-effort: không để audit log fail làm fail action chính
    });
  },
};
