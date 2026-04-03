# PHASE 1: Nền tảng DB & Types

**Mục tiêu:** Thêm bảng DB mới + types mới, **không thay đổi logic hiện tại**.

**Quan trọng:** Mô hình hiện tại giữ nguyên hoạt động. Phase 2 mới thay đổi logic.

---

## 1. Schema Prisma — Cập nhật `schema.prisma`

### 1.1. Sửa enum hiện có

```prisma
// Cũ
enum UserRole {
  ADMIN
  PROJECT_MANAGER
  SITE_ENGINEER
  VIEWER
}

// Mới
enum SystemRole {
  ADMIN
  STAFF
}
```

> Lưu ý: `PROJECT_MANAGER`, `SITE_ENGINEER`, `VIEWER` được chuyển xuống `ProjectRole`. Giữ lại `ADMIN` cho hệ thống, `STAFF` cho nhân viên thường (không phải admin).

### 1.2. Thêm enum mới `ProjectRole`

```prisma
enum ProjectRole {
  PROJECT_MANAGER   // Trưởng ban chỉ huy
  ENGINEER          // Kỹ sư công trường
  SAFETY_OFFICER    // Cán bộ an toàn lao động
  DESIGN_ENGINEER   // Kỹ sư thiết kế
  QUALITY_MANAGER   // Kỹ sư quản lý chất lượng
  WAREHOUSE_KEEPER  // Thủ kho vật tư
  CLIENT            // Chủ đầu tư / giám sát
  VIEWER            // Người xem thuần túy
}
```

### 1.3. Thêm enum `ToolId`

```prisma
enum ToolId {
  PROJECT
  TASK
  DAILY_REPORT
  FILE
  DOCUMENT
  SAFETY
  QUALITY
  WAREHOUSE
  BUDGET
}
```

### 1.4. Thêm enum `PermissionLevel`

```prisma
enum PermissionLevel {
  NONE
  READ
  STANDARD
  ADMIN
}
```

### 1.5. Thêm enum `SpecialPrivilege`

```prisma
enum SpecialPrivilege {
  SAFETY_SIGNER     // Ký duyệt báo cáo an toàn (QCVN 18:2014)
  QUALITY_SIGNER    // Ký nghiệm thu chất lượng (NĐ 06/2021)
  BUDGET_APPROVER   // Duyệt giải ngân
}
```

### 1.6. Sửa model `User`

```prisma
model User {
  // ... các field hiện có giữ nguyên ...
  
  // Cũ:
  // role          UserRole  @default(VIEWER) @map("role")
  
  // Mới:
  systemRole     SystemRole  @default(STAFF) @map("system_role")
  
  // Thêm field mới:
  specialty      String?     @map("specialty") @db.VarChar(100)  // Chuyên môn: SAFETY, DESIGN, SURVEY...
  
  // @@index cũ: @@index([role])
  // Mới:
  @@index([systemRole])
}
```

### 1.7. Sửa model `ProjectMember` — thêm `specialty`

```prisma
model ProjectMember {
  id        String            @id @default(uuid())
  projectId String            @map("project_id")
  userId    String            @map("user_id")
  role      ProjectRole       @default(ENGINEER)  // Đổi từ ProjectMemberRole → ProjectRole
  specialty String?           @map("specialty") @db.VarChar(100)  // Ghi đè chuyên môn cho dự án này
  joinedAt  DateTime          @default(now()) @map("joined_at")
  createdAt DateTime          @default(now()) @map("created_at")

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Xóa enum cũ ProjectMemberRole khỏi đây
}
```

### 1.8. Thêm model `ProjectToolPermission`

```prisma
model ProjectToolPermission {
  id         String          @id @default(uuid())
  projectId  String          @map("project_id")
  userId     String          @map("user_id")
  toolId     ToolId
  level      PermissionLevel @default(READ)
  createdAt  DateTime        @default(now()) @map("created_at")
  updatedAt  DateTime        @default(now()) @updatedAt @map("updated_at")

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId, toolId])
  @@index([projectId])
  @@index([userId])
  @@map("project_tool_permissions")
}
```

> Override permissions cho từng user × project × tool. Nếu không có record → dùng preset của ProjectRole.

### 1.9. Thêm model `SpecialPrivilegeAssignment`

```prisma
model SpecialPrivilegeAssignment {
  id         String           @id @default(uuid())
  projectId  String           @map("project_id")
  userId     String           @map("user_id")
  privilege  SpecialPrivilege
  grantedBy  String?          @map("granted_by")
  grantedAt  DateTime         @default(now()) @map("granted_at")

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  granter    User?   @relation("PrivilegeGranter", fields: [grantedBy], references: [id])

  @@unique([projectId, userId, privilege])
  @@index([projectId])
  @@index([userId])
  @@map("special_privilege_assignments")
}
```

### 1.10. Xóa enum cũ

- Xóa `UserRole` (đã thay bằng `SystemRole`)
- Xóa `ProjectMemberRole` (đã thay bằng `ProjectRole`)

---

## 2. Shared Types

### 2.1. Tạo `packages/shared/src/types/roles.ts` (file mới)

```typescript
// ============================================================
// System Role (cấp công ty)
// ============================================================
export type SystemRole = 'ADMIN' | 'STAFF'

export const SYSTEM_ROLES: SystemRole[] = ['ADMIN', 'STAFF']

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
}

// ============================================================
// Project Role (cấp dự án)
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
// Tool ID
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
// Permission Level
// ============================================================
export type PermissionLevel = 'NONE' | 'READ' | 'STANDARD' | 'ADMIN'

export const PERMISSION_LEVELS: PermissionLevel[] = ['NONE', 'READ', 'STANDARD', 'ADMIN']

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  NONE: 'Không có quyền',
  READ: 'Chỉ xem',
  STANDARD: 'Xem và tương tác',
  ADMIN: 'Toàn quyền quản lý',
}

// Permission level: NONE < READ < STANDARD < ADMIN
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  STANDARD: 2,
  ADMIN: 3,
}

export function hasMinPermission(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel,
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel]
}

// ============================================================
// Special Privilege (cấp dự án)
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
// Tool Permission Map (cho role presets)
// ============================================================
export type ToolPermissionMap = Partial<Record<ToolId, PermissionLevel>>

// ============================================================
// Role Preset — default permissions cho từng ProjectRole
// ============================================================
export const ROLE_PERMISSION_PRESETS: Record<ProjectRole, ToolPermissionMap> = {
  PROJECT_MANAGER: {
    PROJECT: 'ADMIN',
    TASK: 'ADMIN',
    DAILY_REPORT: 'ADMIN',
    FILE: 'ADMIN',
    DOCUMENT: 'ADMIN',
    SAFETY: 'ADMIN',
    QUALITY: 'ADMIN',
    WAREHOUSE: 'ADMIN',
    BUDGET: 'ADMIN',
  },
  ENGINEER: {
    PROJECT: 'READ',
    TASK: 'STANDARD',
    DAILY_REPORT: 'STANDARD',
    FILE: 'STANDARD',
    DOCUMENT: 'STANDARD',
    SAFETY: 'READ',
    QUALITY: 'STANDARD',
    WAREHOUSE: 'READ',
    BUDGET: 'NONE',
  },
  SAFETY_OFFICER: {
    PROJECT: 'READ',
    TASK: 'STANDARD',
    DAILY_REPORT: 'STANDARD',
    FILE: 'STANDARD',
    DOCUMENT: 'STANDARD',
    SAFETY: 'ADMIN',
    QUALITY: 'STANDARD',
    WAREHOUSE: 'READ',
    BUDGET: 'NONE',
  },
  DESIGN_ENGINEER: {
    PROJECT: 'READ',
    TASK: 'READ',
    DAILY_REPORT: 'READ',
    FILE: 'STANDARD',
    DOCUMENT: 'STANDARD',
    SAFETY: 'NONE',
    QUALITY: 'STANDARD',
    WAREHOUSE: 'NONE',
    BUDGET: 'NONE',
  },
  QUALITY_MANAGER: {
    PROJECT: 'READ',
    TASK: 'STANDARD',
    DAILY_REPORT: 'STANDARD',
    FILE: 'STANDARD',
    DOCUMENT: 'STANDARD',
    SAFETY: 'STANDARD',
    QUALITY: 'ADMIN',
    WAREHOUSE: 'STANDARD',
    BUDGET: 'NONE',
  },
  WAREHOUSE_KEEPER: {
    PROJECT: 'READ',
    TASK: 'NONE',
    DAILY_REPORT: 'NONE',
    FILE: 'STANDARD',
    DOCUMENT: 'STANDARD',
    SAFETY: 'NONE',
    QUALITY: 'STANDARD',
    WAREHOUSE: 'ADMIN',
    BUDGET: 'NONE',
  },
  CLIENT: {
    PROJECT: 'READ',
    TASK: 'READ',
    DAILY_REPORT: 'READ',
    FILE: 'READ',
    DOCUMENT: 'READ',
    SAFETY: 'NONE',
    QUALITY: 'READ',
    WAREHOUSE: 'NONE',
    BUDGET: 'READ',
  },
  VIEWER: {
    PROJECT: 'READ',
    TASK: 'READ',
    DAILY_REPORT: 'READ',
    FILE: 'READ',
    DOCUMENT: 'READ',
    SAFETY: 'NONE',
    QUALITY: 'READ',
    WAREHOUSE: 'NONE',
    BUDGET: 'NONE',
  },
}
```

### 2.2. Cập nhật `packages/shared/src/types/entities.ts`

```typescript
// Sửa User interface — đổi role → systemRole, thêm specialty
export interface User {
  id: string
  name: string
  email: string
  systemRole: SystemRole       // Đổi từ 'role' → 'systemRole'
  specialty?: string | null    // Thêm: SAFETY, DESIGN, SURVEY, PROCUREMENT...
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

// Sửa ProjectMember — đổi role type
export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole            // Đổi từ ProjectMemberRole → ProjectRole
  specialty?: string | null    // Thêm: ghi đè chuyên môn cho dự án này
  joinedAt: string
  user?: User
  project?: Project
}

// Thêm interfaces mới
export interface ProjectToolPermission {
  id: string
  projectId: string
  userId: string
  toolId: ToolId
  level: PermissionLevel
  createdAt: string
  updatedAt: string
}

export interface SpecialPrivilegeAssignment {
  id: string
  projectId: string
  userId: string
  privilege: SpecialPrivilege
  grantedBy?: string | null
  grantedAt: string
  granter?: User | null
}
```

### 2.3. Tạo `packages/shared/src/types/permissions.ts` (file mới)

```typescript
// Re-export tất cả từ roles.ts
export * from './roles'

// ============================================================
// Computed permissions per project (dùng ở cả FE và BE)
// ============================================================

export interface UserProjectPermissions {
  projectId: string
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole
  toolPermissions: ToolPermissionMap    // Kết hợp preset + override
  specialPrivileges: SpecialPrivilege[]
  effectiveRole: {
    isAdmin: boolean            // Project: ADMIN hoặc System: ADMIN
    canManageMembers: boolean
    canApproveSafety: boolean
    canApproveQuality: boolean
    canApproveBudget: boolean
  }
}

// ============================================================
// API Response Types
// ============================================================

export interface ProjectMemberWithPermissions extends ProjectMember {
  toolPermissions?: ProjectToolPermission[]
  specialPrivileges?: SpecialPrivilegeAssignment[]
  computedPermissions?: UserProjectPermissions['effectiveRole']
}
```

### 2.4. Cập nhật `packages/shared/src/types/index.ts`

```typescript
export * from './api'
export * from './entities'
export * from './permissions'  // Thêm dòng này
```

---

## 3. Database Migration

### 3.1. Chạy lệnh tạo migration

```bash
cd packages/api
npx prisma migrate dev --name rbac_project_scoped
```

Prisma sẽ tự động tạo file migration SQL dựa trên thay đổi schema.

### 3.2. Seed data cho ProjectRole mới

Tạo file `packages/api/prisma/seed-role-presets.ts` (chạy 1 lần):

```typescript
import { PrismaClient, ProjectRole } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Cập nhật tất cả ProjectMember hiện tại có role cũ
  // PROJECT_MANAGER → giữ nguyên
  // SITE_ENGINEER → ENGINEER
  // VIEWER → giữ nguyên
  
  await prisma.$executeRaw`
    UPDATE project_members 
    SET role = 'ENGINEER' 
    WHERE role = 'SITE_ENGINEER'
  `
  
  console.log('Seed completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 3.3. Seed SystemRole cho User hiện tại

```typescript
async function seedSystemRole() {
  // Admin mặc định: user nào có quyền admin cũ → ADMIN
  // Những user khác → STAFF
  
  await prisma.$executeRaw`
    UPDATE users 
    SET system_role = 'ADMIN' 
    WHERE role = 'ADMIN'
  `
  
  await prisma.$executeRaw`
    UPDATE users 
    SET system_role = 'STAFF' 
    WHERE role != 'ADMIN'
  `
}
```

---

## 4. Tổng kết file cần tạo / sửa

| # | File | Hành động |
|---|---|---|
| 1 | `packages/api/prisma/schema.prisma` | Sửa — đổi enum, sửa model, thêm model mới |
| 2 | `packages/api/prisma/seed-role-presets.ts` | Tạo mới — seed data cho migration |
| 3 | `packages/shared/src/types/roles.ts` | Tạo mới — toàn bộ type/const RBAC |
| 4 | `packages/shared/src/types/entities.ts` | Sửa — cập nhật User, ProjectMember, thêm interfaces |
| 5 | `packages/shared/src/types/permissions.ts` | Tạo mới — computed types + API types |
| 6 | `packages/shared/src/types/index.ts` | Sửa — thêm export permissions |

---

## 5. Thứ tự thực hiện

```
Bước 1: Sửa schema.prisma
  ├── Thêm 4 enum mới (SystemRole, ProjectRole, ToolId, PermissionLevel, SpecialPrivilege)
  ├── Đổi enum UserRole → SystemRole
  ├── Xóa enum ProjectMemberRole
  ├── Sửa User: role → systemRole, thêm specialty
  ├── Sửa ProjectMember: role type → ProjectRole, thêm specialty
  ├── Thêm model ProjectToolPermission
  └── Thêm model SpecialPrivilegeAssignment

Bước 2: Chạy migration
  └── npx prisma migrate dev --name rbac_project_scoped

Bước 3: Tạo seed script
  ├── Map role cũ → role mới
  └── Run seed script

Bước 4: Tạo types ở shared package
  ├── Tạo roles.ts
  ├── Tạo permissions.ts
  ├── Cập nhật entities.ts
  └── Cập nhật index.ts

Bước 5: Verify
  ├── Build shared package: npm run build (packages/shared)
  ├── Build API: npm run build (packages/api)
  ├── Build Web: npm run build (packages/web)
  └── Test đăng nhập đơn giản
```

---

## 6. Lưu ý quan trọng

### 6.1. Không break gì?

- **Giữ nguyên** tất cả API endpoints hiện tại
- **Giữ nguyên** tất cả service/repository hiện tại
- **Giữ nguyên** frontend routes và components
- Chỉ **thêm** type mới, **không sửa** logic hiện có

### 6.2. Mapping role cũ → mới

| Role cũ (`User.role`) | SystemRole mới | Ghi chú |
|---|---|---|
| `ADMIN` | `ADMIN` | Giữ nguyên |
| `PROJECT_MANAGER` | `STAFF` | Chuyển xuống project role |
| `SITE_ENGINEER` | `STAFF` | Chuyển xuống project role |
| `VIEWER` | `STAFF` | Chuyển xuống project role |

| Role cũ (`ProjectMember.role`) | ProjectRole mới |
|---|---|
| `PROJECT_MANAGER` | `PROJECT_MANAGER` |
| `SITE_ENGINEER` | `ENGINEER` |
| `VIEWER` | `VIEWER` |

### 6.3. Sau Phase 1

- User đăng nhập → `user.systemRole` thay vì `user.role`
- `ProjectMember.role` là `ProjectRole` mới
- Chưa có logic check permission (Phase 2)
- Frontend vẫn hoạt động bình thường vì `ProjectMember.role` mapping sang giá trị tương đương

### 6.4. Phase 2 sẽ cần làm gì

- Tạo `permission.service.ts` — compute permissions từ preset + override
- Tạo middleware check permission ở routes
- Cập nhật RoleGuard frontend để dùng systemRole
- Bắt đầu kiểm tra quyền ở từng endpoint

---

## 7. Checklist Phase 1

### Backend
- [ ] Sửa `schema.prisma` — 4 enum mới, 2 model mới, sửa User + ProjectMember
- [ ] Chạy `prisma migrate dev --name rbac_project_scoped`
- [ ] Tạo seed script, chạy seed để map dữ liệu cũ
- [ ] Build API: `npm run build` — không lỗi

### Shared Types
- [ ] Tạo `packages/shared/src/types/roles.ts`
- [ ] Tạo `packages/shared/src/types/permissions.ts`
- [ ] Sửa `packages/shared/src/types/entities.ts`
- [ ] Cập nhật `packages/shared/src/types/index.ts`
- [ ] Build shared: `npm run build` — không lỗi

### Frontend
- [ ] Cập nhật `RoleGuard.tsx` — dùng `systemRole` thay vì `role`
- [ ] Build web: `npm run build` — không lỗi

### Test
- [ ] Test đăng nhập user cũ → `systemRole` được set đúng
- [ ] Test ProjectMember hiện tại → `role` là ProjectRole mới
- [ ] Test API endpoints cũ → vẫn hoạt động
