// ============================================================
// System Role — cấp công ty
// ============================================================
export type SystemRole = 'ADMIN' | 'STAFF'

export const SYSTEM_ROLES: SystemRole[] = ['ADMIN', 'STAFF']

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
}

// ============================================================
// Project Role — cấp dự án
// ============================================================
export type ProjectRole =
  | 'PROJECT_MANAGER'
  | 'ENGINEER'
  | 'SAFETY_OFFICER'
  | 'DESIGN_ENGINEER'
  | 'QUALITY_MANAGER'
  | 'WAREHOUSE_KEEPER'
  | 'CLIENT'
  | 'VIEWER'

export const PROJECT_ROLES: ProjectRole[] = [
  'PROJECT_MANAGER',
  'ENGINEER',
  'SAFETY_OFFICER',
  'DESIGN_ENGINEER',
  'QUALITY_MANAGER',
  'WAREHOUSE_KEEPER',
  'CLIENT',
  'VIEWER',
]

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  PROJECT_MANAGER: 'Trưởng ban chỉ huy (PM)',
  ENGINEER: 'Kỹ sư công trường',
  SAFETY_OFFICER: 'Cán bộ an toàn lao động',
  DESIGN_ENGINEER: 'Kỹ sư thiết kế',
  QUALITY_MANAGER: 'Kỹ sư quản lý chất lượng (QC)',
  WAREHOUSE_KEEPER: 'Thủ kho vật tư',
  CLIENT: 'Chủ đầu tư / Giám sát',
  VIEWER: 'Người xem',
}

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  PROJECT_MANAGER: 'Quản lý toàn bộ dự án, có quyền trên mọi công cụ',
  ENGINEER: 'Kỹ sư làm việc trực tiếp tại công trường',
  SAFETY_OFFICER: 'Chịu trách nhiệm an toàn lao động và vệ sinh môi trường',
  DESIGN_ENGINEER: 'Kỹ sư phụ trách thiết kế và bản vẽ kỹ thuật',
  QUALITY_MANAGER: 'Kỹ sư kiểm soát chất lượng công trình',
  WAREHOUSE_KEEPER: 'Nhân viên kho vật tư, quản lý nhập/xuất vật tư',
  CLIENT: 'Chủ đầu tư hoặc đại diện giám sát bên ngoài',
  VIEWER: 'Người được mời xem thông tin dự án, không có quyền tạo/sửa',
}

// ============================================================
// Tool ID — các công cụ trong dự án
// ============================================================
export type ToolId =
  | 'PROJECT'
  | 'TASK'
  | 'DAILY_REPORT'
  | 'FILE'
  | 'DOCUMENT'
  | 'SAFETY'
  | 'QUALITY'
  | 'WAREHOUSE'
  | 'BUDGET'

export const TOOL_IDS: ToolId[] = [
  'PROJECT',
  'TASK',
  'DAILY_REPORT',
  'FILE',
  'DOCUMENT',
  'SAFETY',
  'QUALITY',
  'WAREHOUSE',
  'BUDGET',
]

export const TOOL_LABELS: Record<ToolId, string> = {
  PROJECT: 'Dự án',
  TASK: 'Công việc',
  DAILY_REPORT: 'Báo cáo hàng ngày',
  FILE: 'Tệp tin',
  DOCUMENT: 'Tài liệu',
  SAFETY: 'An toàn lao động',
  QUALITY: 'Chất lượng',
  WAREHOUSE: 'Kho vật tư',
  BUDGET: 'Ngân sách',
}

// ============================================================
// Permission Level — mức quyền trên mỗi tool
// ============================================================
export type PermissionLevel = 'NONE' | 'READ' | 'STANDARD' | 'ADMIN'

export const PERMISSION_LEVELS: PermissionLevel[] = ['NONE', 'READ', 'STANDARD', 'ADMIN']

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  NONE: 'Không có quyền',
  READ: 'Chỉ xem',
  STANDARD: 'Xem và tương tác',
  ADMIN: 'Toàn quyền quản lý',
}

export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  STANDARD: 2,
  ADMIN: 3,
}

export function hasMinPermission(userLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel]
}

// ============================================================
// Special Privilege — quyền đặc biệt theo luật
// ============================================================
export type SpecialPrivilege = 'SAFETY_SIGNER' | 'QUALITY_SIGNER' | 'BUDGET_APPROVER'

export const SPECIAL_PRIVILEGES: SpecialPrivilege[] = [
  'SAFETY_SIGNER',
  'QUALITY_SIGNER',
  'BUDGET_APPROVER',
]

export const SPECIAL_PRIVILEGE_LABELS: Record<SpecialPrivilege, string> = {
  SAFETY_SIGNER: 'Ký duyệt báo cáo an toàn',
  QUALITY_SIGNER: 'Ký nghiệm thu chất lượng',
  BUDGET_APPROVER: 'Duyệt giải ngân',
}

export const SPECIAL_PRIVILEGE_DESCRIPTIONS: Record<SpecialPrivilege, string> = {
  SAFETY_SIGNER: 'Được phép ký duyệt báo cáo an toàn lao động (theo QCVN 18:2014)',
  QUALITY_SIGNER: 'Được phép ký nghiệm thu chất lượng công trình (theo NĐ 06/2021)',
  BUDGET_APPROVER: 'Được phép duyệt và xác nhận giải ngân ngân sách dự án',
}

// ============================================================
// Tool Permission Map & Role Presets
// ============================================================
export type ToolPermissionMap = Partial<Record<ToolId, PermissionLevel>>

export const ROLE_PERMISSION_PRESETS: Record<ProjectRole, ToolPermissionMap> = {
  PROJECT_MANAGER: {
    PROJECT: 'ADMIN', TASK: 'ADMIN', DAILY_REPORT: 'ADMIN', FILE: 'ADMIN',
    DOCUMENT: 'ADMIN', SAFETY: 'ADMIN', QUALITY: 'ADMIN', WAREHOUSE: 'ADMIN', BUDGET: 'ADMIN',
  },
  ENGINEER: {
    PROJECT: 'READ', TASK: 'STANDARD', DAILY_REPORT: 'STANDARD', FILE: 'STANDARD',
    DOCUMENT: 'STANDARD', SAFETY: 'READ', QUALITY: 'STANDARD', WAREHOUSE: 'READ', BUDGET: 'NONE',
  },
  SAFETY_OFFICER: {
    PROJECT: 'READ', TASK: 'STANDARD', DAILY_REPORT: 'STANDARD', FILE: 'STANDARD',
    DOCUMENT: 'STANDARD', SAFETY: 'ADMIN', QUALITY: 'STANDARD', WAREHOUSE: 'READ', BUDGET: 'NONE',
  },
  DESIGN_ENGINEER: {
    PROJECT: 'READ', TASK: 'READ', DAILY_REPORT: 'READ', FILE: 'STANDARD',
    DOCUMENT: 'STANDARD', SAFETY: 'NONE', QUALITY: 'STANDARD', WAREHOUSE: 'NONE', BUDGET: 'NONE',
  },
  QUALITY_MANAGER: {
    PROJECT: 'READ', TASK: 'STANDARD', DAILY_REPORT: 'STANDARD', FILE: 'STANDARD',
    DOCUMENT: 'STANDARD', SAFETY: 'STANDARD', QUALITY: 'ADMIN', WAREHOUSE: 'STANDARD', BUDGET: 'NONE',
  },
  WAREHOUSE_KEEPER: {
    PROJECT: 'READ', TASK: 'NONE', DAILY_REPORT: 'NONE', FILE: 'STANDARD',
    DOCUMENT: 'STANDARD', SAFETY: 'NONE', QUALITY: 'STANDARD', WAREHOUSE: 'ADMIN', BUDGET: 'NONE',
  },
  CLIENT: {
    PROJECT: 'READ', TASK: 'READ', DAILY_REPORT: 'READ', FILE: 'READ',
    DOCUMENT: 'READ', SAFETY: 'NONE', QUALITY: 'READ', WAREHOUSE: 'NONE', BUDGET: 'READ',
  },
  VIEWER: {
    PROJECT: 'READ', TASK: 'READ', DAILY_REPORT: 'READ', FILE: 'READ',
    DOCUMENT: 'READ', SAFETY: 'NONE', QUALITY: 'READ', WAREHOUSE: 'NONE', BUDGET: 'NONE',
  },
}

// ============================================================
// Legacy aliases
// ============================================================

/** @deprecated Dùng SystemRole thay vì UserRole */
export type UserRole = 'ADMIN' | 'STAFF'

/** @deprecated Dùng ProjectRole */
export type ProjectMemberRole = ProjectRole

/** @deprecated */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  PROJECT_MANAGER: 'Trưởng ban chỉ huy (PM)',
  ENGINEER: 'Kỹ sư công trường',
  SAFETY_OFFICER: 'Cán bộ an toàn lao động',
  DESIGN_ENGINEER: 'Kỹ sư thiết kế',
  QUALITY_MANAGER: 'Kỹ sư quản lý chất lượng (QC)',
  WAREHOUSE_KEEPER: 'Thủ kho vật tư',
  CLIENT: 'Chủ đầu tư / Giám sát',
  VIEWER: 'Người xem',
}