# PHASE 2: RBAC — Logic Permission & Middleware

**Thời gian ước tính:** 2–3 ngày

**Mục tiêu:** Thêm logic phân quyền vào tất cả project-scoped routes, giữ nguyên UI. Không có thay đổi về DB hay types (đã xong Phase 1).

**Nguyên tắc:** Phase 2 chỉ thêm logic phân quyền bên dưới. Tầng UI giữ nguyên. Không tạo bảng mới, không tạo enum mới.

---

## 0. Tổng quan kiến trúc

```
Client request
    │
    │  JWT cookie → authenticate (middleware auth.middleware.ts)
    ▼
┌─────────────────────────────┐
│ checkProjectMembership      │  ← user có trong project không?
└──────────┬──────────────────┘
           │
    ┌──────▼──────┐
    │ checkRole   │  ← user có project role nào?
    └──────┬──────┘
           │
    ┌──────▼──────────────┐
    │ checkToolPermission  │  ← user có quyền trên tool cụ thể không?
    └──────┬──────────────┘
           │
    ┌──────▼──────────────────┐
    │ checkSpecialPrivilege    │  ← user có quyền ký đặc biệt không?
    └──────┬───────────────────┘
           │
           ▼
      Controller → Service
```

---

## 1. Backend

### 1.1. Cấu trúc thư mục

```
packages/api/src/
├── shared/
│   ├── services/
│   │   ├── permission.service.ts    ← NEW: compute permissions
│   │   └── special-privilege.service.ts  ← NEW: check special privileges
│   └── middleware/
│       ├── permission.middleware.ts   ← NEW: check tool permission
│       ├── project-access.middleware.ts ← NEW: check membership + role
│       └── auth.middleware.ts          ← EXISTING: authenticate
└── modules/
    ├── tasks/task.routes.ts           ← MODIFY: thêm middleware
    ├── daily-reports/report.routes.ts ← MODIFY: thêm middleware
    ├── files/file.routes.ts           ← MODIFY: thêm middleware
    ├── project-members/member.routes.ts ← MODIFY: thêm middleware
    ├── documents/document.routes.ts   ← MODIFY: thêm middleware
    └── ...
```

### 1.2. Phase 2A — Permission Service (`permission.service.ts`)

**Tên file:** `packages/api/src/shared/services/permission.service.ts`

#### 1.2.1. Hàm `getProjectMembership(userId, projectId)`

```typescript
// Trả về ProjectMember + SystemRole hoặc null
async getProjectMembership(
  userId: string,
  projectId: string
): Promise<{
  isMember: boolean
  isSystemAdmin: boolean
  projectRole: ProjectRole | null   // null nếu không phải member
  systemRole: SystemRole             // từ User table
} | null>
```

**Logic:**
1. Query `prisma.user.findUnique({ where: { id: userId } })` → lấy `systemRole`
2. Nếu `systemRole === 'ADMIN'` → return `{ isMember: true, isSystemAdmin: true, ... }`
3. Query `prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })` → lấy `projectRole`
4. Nếu có member → return `{ isMember: true, isSystemAdmin: false, projectRole, systemRole }`
5. Nếu không → return `{ isMember: false, isSystemAdmin: false, projectRole: null, systemRole }`

#### 1.2.2. Hàm `getEffectiveToolPermissions(userId, projectId)`

```typescript
// Trả về ToolPermissionMap đã merge preset + override
async getEffectiveToolPermissions(
  userId: string,
  projectId: string
): Promise<ToolPermissionMap>
```

**Logic:**
1. Gọi `getProjectMembership` → lấy `projectRole` và `isSystemAdmin`
2. Nếu system admin → return map với tất cả tool = ADMIN
3. Nếu không member → return map với tất cả tool = NONE
4. Lấy preset: `const preset = ROLE_PERMISSION_PRESETS[projectRole]`
5. Query `prisma.projectToolPermission.findMany({ where: { projectId, userId } })` → override map
6. Merge: spread preset, rồi override bằng từng record trong DB
7. Return merged map

#### 1.2.3. Hàm `getSpecialPrivileges(userId, projectId)`

```typescript
async getSpecialPrivileges(
  userId: string,
  projectId: string
): Promise<SpecialPrivilege[]>
```

**Logic:**
1. Query `prisma.specialPrivilegeAssignment.findMany({ where: { projectId, userId } })` → lấy array `privilege`
2. Nếu system admin → return tất cả 3 privileges
3. Return array privileges

#### 1.2.4. Hàm `getUserProjectPermissions(userId, projectId)`

```typescript
// Hàm chính — trả về full permissions object
async getUserProjectPermissions(
  userId: string,
  projectId: string
): Promise<UserProjectPermissions>
```

**Logic:**
1. Gọi song song: `getProjectMembership`, `getEffectiveToolPermissions`, `getSpecialPrivileges`
2. Build `effectiveRole`:

```typescript
effectiveRole: {
  isAdmin: isSystemAdmin || toolPermissions.PROJECT === 'ADMIN',
  canManageMembers: hasMinPermission(toolPermissions.PROJECT, 'ADMIN'),
  canApproveSafety: specialPrivileges.includes('SAFETY_SIGNER'),
  canApproveQuality: specialPrivileges.includes('QUALITY_SIGNER'),
  canApproveBudget: specialPrivileges.includes('BUDGET_APPROVER'),
}
```

3. Return full `UserProjectPermissions` object

#### 1.2.5. Hàm `hasPermission(userId, projectId, toolId, minLevel)`

```typescript
async hasPermission(
  userId: string,
  projectId: string,
  toolId: ToolId,
  minLevel: PermissionLevel
): Promise<boolean>
```

**Logic:**
1. Gọi `getEffectiveToolPermissions(userId, projectId)` → lấy `toolPermissions[toolId]`
2. Gọi `hasMinPermission(userLevel, minLevel)` (từ shared)

#### 1.2.6. Hàm `hasSpecialPrivilege(userId, projectId, privilege)`

```typescript
async hasSpecialPrivilege(
  userId: string,
  projectId: string,
  privilege: SpecialPrivilege
): Promise<boolean>
```

**Logic:**
1. Gọi `getSpecialPrivileges(userId, projectId)`
2. Return `privileges.includes(privilege)`

### 1.3. Phase 2B — Middleware (`permission.middleware.ts`)

**Tên file:** `packages/api/src/shared/middleware/permission.middleware.ts`

#### 1.3.1. `requireProjectMembership`

```typescript
export const requireProjectMembership = (
  options?: { optional?: boolean }
) => (req, res, next) => {
  // 1. Lấy projectId từ req.params.projectId
  // 2. Lấy userId từ req.user.id
  // 3. Gọi permissionService.getProjectMembership(userId, projectId)
  // 4. Attach vào req: req.projectMembership = { isMember, isSystemAdmin, projectRole, systemRole }
  // 5. Nếu optional=true → attach và continue
  // 6. Nếu optional=false (default) và !isMember → throw ForbiddenError("Bạn không có quyền truy cập dự án này")
}
```

**Attach vào `Request` (express.d.ts):**
```typescript
// packages/api/src/shared/types/express.d.ts
interface Request {
  user: JwtPayload & { systemRole: SystemRole }
  projectMembership?: {
    isMember: boolean
    isSystemAdmin: boolean
    projectRole: ProjectRole | null
    systemRole: SystemRole
  }
  userPermissions?: UserProjectPermissions  // full permissions object
}
```

#### 1.3.2. `requireToolPermission(toolId, minLevel)`

```typescript
export const requireToolPermission = (
  toolId: ToolId,
  minLevel: PermissionLevel = 'READ'
) => (req, res, next) => {
  // 1. Đọc req.userPermissions.toolPermissions[toolId] (đã attach bởi middleware trước)
  // 2. Gọi hasMinPermission(userLevel, minLevel)
  // 3. Nếu !has → throw ForbiddenError(`Cần quyền ${minLevel} trên ${toolId}`)
  // 4. Attach tool permission vào req
}
```

#### 1.3.3. `loadUserPermissions` (middleware gắn full permissions vào request)

```typescript
export const loadUserPermissions = async (req, res, next) => {
  // 1. Nếu không có projectId → next()
  // 2. Gọi permissionService.getUserProjectPermissions(userId, projectId)
  // 3. Attach: req.userPermissions = result
  // 4. Attach: req.projectMembership = membership info
}
```

### 1.4. Phase 2C — Special Privilege Middleware (`special-privilege.middleware.ts`)

```typescript
// Tên file: packages/api/src/shared/middleware/special-privilege.middleware.ts

export const requireSpecialPrivilege = (privilege: SpecialPrivilege) => async (req, res, next) => {
  // Chỉ dùng cho: SAFETY_SIGNER (ký báo cáo an toàn),
  //               QUALITY_SIGNER (ký nghiệm thu chất lượng),
  //               BUDGET_APPROVER (duyệt giải ngân)
  const { userId } = req.user
  const { projectId } = req.params
  
  const has = await permissionService.hasSpecialPrivilege(userId, projectId, privilege)
  if (!has) throw new ForbiddenError(`Cần quyền đặc biệt: ${privilege}`)
  next()
}
```

### 1.5. Phase 2D — Gắn middleware vào tất cả routes

**Nguyên tắc:**
- Route nào cần membership → gắn `requireProjectMembership`
- Route nào cần tool permission cụ thể → gắn `requireToolPermission(toolId, level)`
- Route ký duyệt an toàn/chất lượng → gắn `requireSpecialPrivilege`

#### 1.5.1. Task Routes (`task.routes.ts`)

```typescript
const router = Router({ mergeParams: true })

// Đọc task: READ trên TASK tool
router.get("/", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "READ"), taskController.list)

router.get("/:taskId", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "READ"), taskController.getById)

// Tạo task: STANDARD trên TASK tool
router.post("/", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), validate(createTaskSchema), taskController.create)

// Sửa task: STANDARD (assignee/creator) hoặc ADMIN (PM)
router.patch("/:taskId", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), validate(updateTaskSchema), taskController.update)

// Sửa trạng thái: STANDARD
router.patch("/:taskId/status", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), validate(updateTaskStatusSchema), taskController.updateStatus)

// Submit duyệt: STANDARD (chỉ assignee mới submit) — kiểm tra thêm trong service
router.post("/:taskId/submit", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), taskController.submitForApproval)

// Xóa task: ADMIN trên TASK
router.delete("/:taskId", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "ADMIN"), taskController.delete)

// Comments
router.get("/:taskId/comments", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "READ"), taskCommentController.list)

router.post("/:taskId/comments", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), validate(createCommentSchema), taskCommentController.create)

router.patch("/:taskId/comments/:commentId", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "STANDARD"), validate(updateCommentSchema), taskCommentController.update)

router.delete("/:taskId/comments/:commentId", authenticate, requireProjectMembership(),
  requireToolPermission("TASK", "ADMIN"), taskCommentController.delete)
```

#### 1.5.2. Daily Report Routes (`report.routes.ts`)

```typescript
// Đọc báo cáo: READ trên DAILY_REPORT
router.get("/", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "READ"), reportController.list)

router.get("/:reportId", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "READ"), reportController.getById)

// Tạo báo cáo: STANDARD trên DAILY_REPORT
router.post("/", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "STANDARD"), validate(createReportSchema), reportController.create)

// Sửa báo cáo: STANDARD trên DAILY_REPORT
router.patch("/:reportId", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "STANDARD"), validate(updateReportSchema), reportController.update)

// Submit: STANDARD — kiểm tra ownership trong service
router.patch("/:reportId/status", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "STANDARD"), validate(updateReportStatusSchema), reportController.updateStatus)

router.post("/:reportId/submit", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "STANDARD"), reportController.submitForApproval)

// Xóa: ADMIN trên DAILY_REPORT
router.delete("/:reportId", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "ADMIN"), reportController.delete)

// Images
router.post("/:reportId/images", authenticate, requireProjectMembership(),
  requireToolPermission("DAILY_REPORT", "STANDARD"), reportImageController.upload)
```

#### 1.5.3. File Routes (`file.routes.ts`)

```typescript
// Đọc file: READ trên FILE
router.get("/", authenticate, requireProjectMembership(),
  requireToolPermission("FILE", "READ"), fileController.list)

router.get("/:fileId/view", authenticate, requireProjectMembership(),
  requireToolPermission("FILE", "READ"), fileController.view)

router.get("/:fileId/download", authenticate, requireProjectMembership(),
  requireToolPermission("FILE", "READ"), fileController.download)

// Upload file: STANDARD trên FILE
router.post("/", authenticate, requireProjectMembership(),
  requireToolPermission("FILE", "STANDARD"), uploadMiddleware, fileController.upload)

// Xóa file: ADMIN trên FILE
router.delete("/:fileId", authenticate, requireProjectMembership(),
  requireToolPermission("FILE", "ADMIN"), fileController.delete)
```

#### 1.5.4. Member Routes (`member.routes.ts`)

```typescript
// Quan trọng: quản lý thành viên = quyền ADMIN trên PROJECT tool
// (vì đây là quản lý người trong dự án, không phải tool cụ thể)

router.get("/", authenticate, requireProjectMembership(),
  requireToolPermission("PROJECT", "READ"), memberController.list)

// Thêm member: ADMIN trên PROJECT
router.post("/", authenticate, requireProjectMembership(),
  requireToolPermission("PROJECT", "ADMIN"), validate(addMemberSchema), memberController.add)

// Sửa role member: ADMIN trên PROJECT
router.patch("/:memberId", authenticate, requireProjectMembership(),
  requireToolPermission("PROJECT", "ADMIN"), validate(updateMemberRoleSchema), memberController.update)

// Xóa member: ADMIN trên PROJECT
router.delete("/:memberId", authenticate, requireProjectMembership(),
  requireToolPermission("PROJECT", "ADMIN"), memberController.remove)
```

#### 1.5.5. Document Routes (project-scoped)

```typescript
// Document có 2 tầng: project-level và global
// Project-scoped routes cần check membership + FILE/ DOCUMENT permission

router.get("/", authenticate, requireProjectMembership(),
  requireToolPermission("DOCUMENT", "READ"), documentController.listProjectDocuments)

router.get("/:folderId", authenticate, requireProjectMembership(),
  requireToolPermission("DOCUMENT", "READ"), documentController.getFolder)

router.post("/", authenticate, requireProjectMembership(),
  requireToolPermission("DOCUMENT", "STANDARD"), documentController.createFolder)

router.patch("/:folderId", authenticate, requireProjectMembership(),
  requireToolPermission("DOCUMENT", "STANDARD"), documentController.updateFolder)

router.delete("/:folderId", authenticate, requireProjectMembership(),
  requireToolPermission("DOCUMENT", "ADMIN"), documentController.deleteFolder)
```

### 1.6. Phase 2E — Cập nhật các service hiện có

Sau khi middleware đã check, một số service vẫn cần cập nhật logic:

#### 1.6.1. Task Service — `task.service.ts`

**Thay đổi cần thiết:**

```typescript
// Cũ: kiểm tra string role thủ công
if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") { ... }

// Mới: dùng req.userPermissions
// Middleware đã check quyền rồi → service chỉ cần kiểm tra ownership nếu cần

// Với submitForApproval: kiểm tra assignee đúng là user hiện tại
async submitForApproval(taskId: string, userId: string) {
  const task = await prisma.task.findUnique(...)
  if (task.assignedTo !== userId) {
    throw new ForbiddenError("Chỉ người được giao mới được nộp duyệt")
  }
  // ...
}

// Với approveTask (admin duyệt): kiểm tra SPECIAL privilege
// Nếu task liên quan an toàn → SAFETY_SIGNER
// Nếu task liên quan chất lượng → QUALITY_SIGNER
// → Kiểm tra trong service, không cần middleware riêng
```

#### 1.6.2. Report Service — `report.service.ts`

```typescript
// submitForApproval: kiểm tra creator đúng user
// approveReport: kiểm tra SPECIAL privilege nếu cần
```

#### 1.6.3. Member Service — `member.service.ts`

```typescript
// addMember: middleware đã check ADMIN trên PROJECT
// → Service chỉ kiểm tra user chưa là member
// updateMemberRole: middleware đã check ADMIN
// → Service chỉ kiểm tra không tự hạ role chính mình
```

### 1.7. Phase 2F — Permission utility exports

**Tên file:** `packages/api/src/shared/services/permission.service.ts`

Export các hàm để controller/service có thể dùng:

```typescript
export const permissionService = {
  getProjectMembership,
  getEffectiveToolPermissions,
  getSpecialPrivileges,
  getUserProjectPermissions,
  hasPermission,
  hasSpecialPrivilege,
}
```

### 1.8. Hàm tiện ích cho controller

Thêm vào `permission.service.ts` hoặc tạo `packages/api/src/shared/utils/permission.utils.ts`:

```typescript
// Kiểm tra nhanh trong controller mà không cần query DB lại
export function canEditTask(membership: ProjectMembership, task: Task): boolean {
  if (membership.isSystemAdmin) return true
  if (membership.projectRole === 'PROJECT_MANAGER') return true
  if (task.createdBy === membership.userId) return true
  if (task.assignedTo === membership.userId) return true
  return false
}

export function canApproveSafety(membership: ProjectMembership): boolean {
  return membership.isSystemAdmin || 
    membership.projectRole === 'PROJECT_MANAGER' ||
    membership.projectRole === 'SAFETY_OFFICER'
}
```

---

## 2. Frontend

### 2.1. Cấu trúc thư mục

```
packages/web/src/
├── shared/
│   ├── hooks/
│   │   ├── usePermission.ts       ← NEW: check permissions
│   │   └── useProjectPermissions.ts ← NEW: fetch/cache permissions
│   ├── components/
│   │   ├── PermissionGate.tsx    ← NEW: conditional render
│   │   └── SpecialPrivilegeGate.tsx ← NEW: special privilege gate
│   └── utils/
│       └── permission.utils.ts    ← NEW: client-side permission utils
├── router/
│   ├── RoleGuard.tsx              ← MODIFY: extend thành PermissionGuard
│   └── index.tsx                  ← MODIFY: gắn guards
└── features/
    ├── projects/pages/ProjectDetailPage.tsx ← MODIFY: check permission
    ├── tasks/pages/TaskDetailPage.tsx      ← MODIFY: check permission
    ├── reports/pages/ReportDetailPage.tsx  ← MODIFY: check permission
    └── ... (các page cần ẩn/hiện action theo quyền)
```

### 2.2. Phase 2G — API endpoint để lấy permissions

**Backend:** Thêm endpoint trong `dashboard` hoặc tạo module `permissions`:

```typescript
// packages/api/src/modules/permissions/permission.controller.ts
GET /permissions/:projectId
Response: UserProjectPermissions

// Middleware: authenticate + requireProjectMembership
// Auth: chỉ thành viên project mới xem được permissions của mình
```

**Frontend API layer:**

```typescript
// packages/web/src/features/projects/api/permissionApi.ts
export const permissionApi = {
  getProjectPermissions: (projectId: string) =>
    apiClient.get<UserProjectPermissions>(`/permissions/${projectId}`),
}
```

### 2.3. Phase 2H — Hook `useProjectPermissions`

```typescript
// packages/web/src/shared/hooks/useProjectPermissions.ts
import { useQuery } from "@tanstack/react-query"
import { permissionApi } from "@/features/projects/api/permissionApi"

export function useProjectPermissions(projectId: string) {
  return useQuery({
    queryKey: ["permissions", projectId],
    queryFn: () => permissionApi.getProjectPermissions(projectId),
    staleTime: 5 * 60 * 1000,     // 5 phút — permissions ít thay đổi
    refetchOnWindowFocus: false,
    enabled: !!projectId,
  })
}
```

### 2.4. Phase 2I — Hook `usePermission`

```typescript
// packages/web/src/shared/hooks/usePermission.ts
// FILE ĐÃ TỒN TẠI — cần mở rộng

import { useProjectPermissions } from "./useProjectPermissions"
import { hasMinPermission, TOOL_IDS } from "@xay-dung/shared"

interface UsePermissionOptions {
  projectId: string
  toolId: ToolId
  minLevel?: PermissionLevel  // default: 'READ'
}

export function usePermission({ projectId, toolId, minLevel = 'READ' }: UsePermissionOptions) {
  const { data: permissions, isLoading } = useProjectPermissions(projectId)
  
  const userLevel = permissions?.toolPermissions?.[toolId] ?? 'NONE'
  const has = hasMinPermission(userLevel, minLevel)
  
  return {
    has,
    isLoading,
    permissions,          // expose full permissions object
    isAdmin: permissions?.effectiveRole?.isAdmin,
    canManageMembers: permissions?.effectiveRole?.canManageMembers,
  }
}
```

### 2.5. Phase 2J — Component `PermissionGate`

```typescript
// packages/web/src/shared/components/PermissionGate.tsx
import type { ToolId, PermissionLevel } from "@xay-dung/shared"

interface PermissionGateProps {
  projectId: string
  toolId: ToolId
  minLevel?: PermissionLevel
  children: React.ReactNode
  fallback?: React.ReactNode   // render khi không có quyền (default: null)
}

export function PermissionGate({ projectId, toolId, minLevel, children, fallback = null }) {
  const { has } = usePermission({ projectId, toolId, minLevel })
  return has ? <>{children}</> : <>{fallback}</>
}
```

### 2.6. Phase 2K — Component `SpecialPrivilegeGate`

```typescript
// packages/web/src/shared/components/SpecialPrivilegeGate.tsx
import type { SpecialPrivilege } from "@xay-dung/shared"

interface SpecialPrivilegeGateProps {
  projectId: string
  privilege: SpecialPrivilege
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SpecialPrivilegeGate({ projectId, privilege, children, fallback = null }) {
  const { data: permissions } = useProjectPermissions(projectId)
  const has = permissions?.specialPrivileges?.includes(privilege) ?? false
  return has ? <>{children}</> : <>{fallback}</>
}
```

### 2.7. Phase 2L — Client-side permission utils

```typescript
// packages/web/src/shared/utils/permission.utils.ts
// Không gọi API — dùng data đã có từ useProjectPermissions

import type { ProjectRole, ToolId, PermissionLevel } from "@xay-dung/shared"
import { ROLE_PERMISSION_PRESETS, PERMISSION_LEVELS, hasMinPermission } from "@xay-dung/shared"

export function canEditTask(
  projectRole: ProjectRole | null,
  isSystemAdmin: boolean,
  taskCreatorId: string,
  taskAssigneeId: string | null,
  currentUserId: string
): boolean {
  if (isSystemAdmin || projectRole === 'PROJECT_MANAGER') return true
  if (taskCreatorId === currentUserId || taskAssigneeId === currentUserId) return true
  return false
}

export function canSubmitReport(
  projectRole: ProjectRole | null,
  isSystemAdmin: boolean,
  reportCreatorId: string,
  currentUserId: string
): boolean {
  const toolLevel = ROLE_PERMISSION_PRESETS[projectRole]?.DAILY_REPORT ?? 'NONE'
  if (!hasMinPermission(toolLevel, 'STANDARD')) return false
  return reportCreatorId === currentUserId
}

export function getRoleLabel(projectRole: ProjectRole | null): string {
  if (!projectRole) return "Không xác định"
  return PROJECT_ROLE_LABELS[projectRole] ?? projectRole
}
```

### 2.8. Phase 2M — Gắn PermissionGate vào UI (giữ nguyên layout)

**Nguyên tắc:** Phase 2 chỉ thêm `PermissionGate` vào các chỗ cần. Không thay đổi structure, chỉ ẩn/hiện action buttons.

#### 2.8.1. TaskDetailPage — Ẩn action buttons

```tsx
// TaskDetailPage.tsx
import { PermissionGate } from "@/shared/components/PermissionGate"

// Nút sửa task: chỉ khi có STANDARD trên TASK tool
<PermissionGate projectId={projectId} toolId="TASK" minLevel="STANDARD">
  <Button onClick={handleEditTask}>Sửa</Button>
</PermissionGate>

// Nút xóa task: chỉ ADMIN trên TASK
<PermissionGate projectId={projectId} toolId="TASK" minLevel="ADMIN">
  <Button onClick={handleDeleteTask} danger>Xóa</Button>
</PermissionGate>

// Nút submit duyệt: chỉ assignee
{isAssignee && (
  <PermissionGate projectId={projectId} toolId="TASK" minLevel="STANDARD">
    <Button onClick={handleSubmit}>Nộp duyệt</Button>
  </PermissionGate>
)}

// Nút ký duyệt: chỉ SPECIAL privilege
<SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
  <Button onClick={handleApproveTask}>Ký nghiệm thu</Button>
</SpecialPrivilegeGate>
```

#### 2.8.2. TaskListPage — Ẩn button tạo task

```tsx
// TaskListPage.tsx
// Nút tạo task: chỉ STANDARD trên TASK
<PermissionGate projectId={projectId} toolId="TASK" minLevel="STANDARD">
  <Button type="primary" onClick={openCreateModal}>+ Tạo công việc</Button>
</PermissionGate>

// Ẩn checkbox chọn nhiều (bulk actions) nếu không có quyền
```

#### 2.8.3. ReportListPage — Ẩn action buttons

```tsx
// ReportListPage.tsx
<PermissionGate projectId={projectId} toolId="DAILY_REPORT" minLevel="STANDARD">
  <Button>+ Tạo báo cáo</Button>
</PermissionGate>

<PermissionGate projectId={projectId} toolId="DAILY_REPORT" minLevel="ADMIN">
  <Button danger>Xóa</Button>
</PermissionGate>
```

#### 2.8.4. ProjectMembersTab — Ẩn action buttons

```tsx
// ProjectMembersTab.tsx
<PermissionGate projectId={projectId} toolId="PROJECT" minLevel="ADMIN">
  <Button>+ Thêm thành viên</Button>
  <Button>Sửa role</Button>
  <Button>Xóa</Button>
</PermissionGate>
```

#### 2.8.5. ProjectFilesTab — Ẩn action buttons

```tsx
// ProjectFilesTab.tsx
<PermissionGate projectId={projectId} toolId="FILE" minLevel="STANDARD">
  <Button>Upload file</Button>
</PermissionGate>

<PermissionGate projectId={projectId} toolId="FILE" minLevel="ADMIN">
  <Button danger>Xóa</Button>
</PermissionGate>
```

### 2.9. Phase 2N — Cache permissions trong Auth Store

```typescript
// packages/web/src/store/authStore.ts — THAY ĐỔI

interface AuthState {
  // ... existing fields ...
  
  // Thêm: cache permissions theo projectId
  projectPermissions: Record<string, UserProjectPermissions>
  
  setProjectPermissions(projectId: string, permissions: UserProjectPermissions): void
  clearProjectPermissions(projectId: string): void
}
```

```typescript
// authStore.ts implementation
setProjectPermissions: (projectId, permissions) => {
  set((state) => ({
    projectPermissions: {
      ...state.projectPermissions,
      [projectId]: permissions,
    },
  }))
},
```

**Ưu điểm:** Khi user chuyển project (trong ProjectDetailPage), permissions được cache → không cần gọi API lại. Khi logout → clear all.

### 2.10. Phase 2O — `PermissionGuard` mở rộng từ `RoleGuard`

```tsx
// packages/web/src/router/PermissionGuard.tsx

interface PermissionGuardProps {
  projectId?: string           // từ URL params
  toolId: ToolId
  minLevel?: PermissionLevel
  children?: React.ReactNode
  fallback?: React.ReactNode  // render thay vì redirect (mặc định: null)
  redirectTo?: string          // path để redirect (mặc định: /projects)
}

// Logic:
// 1. Nếu chưa login → redirect /login
// 2. Nếu có projectId:
//    - Đọc permissions từ authStore.projectPermissions[projectId]
//    - Nếu chưa có → gọi API getPermissions → cache vào store
// 3. Kiểm tra hasMinPermission(toolLevel, minLevel)
// 4. Nếu không có quyền → render fallback (hoặc redirect)
```

---

## 3. Kiểm thử Phase 2

### 3.1. Unit test

```typescript
// packages/api/src/shared/services/__tests__/permission.service.test.ts

describe("permissionService", () => {
  describe("getProjectMembership", () => {
    it("trả về systemAdmin=true khi user có systemRole=ADMIN", async () => {
      // setup mock user với systemRole=ADMIN
      // không cần là member
      const result = await permissionService.getProjectMembership(adminId, projectId)
      expect(result.isSystemAdmin).toBe(true)
      expect(result.isMember).toBe(true)
    })
    
    it("trả về isMember=true khi user là ProjectMember", async () => {
      // setup ProjectMember
    })
    
    it("trả về isMember=false khi user không phải member và không phải admin", async () => {
      // setup user thường, không có trong project
      const result = await permissionService.getProjectMembership(userId, projectId)
      expect(result.isMember).toBe(false)
    })
  })
  
  describe("getEffectiveToolPermissions", () => {
    it("trả về tất cả ADMIN khi systemAdmin", async () => {
      const result = await permissionService.getEffectiveToolPermissions(adminId, projectId)
      expect(result.PROJECT).toBe("ADMIN")
      expect(result.TASK).toBe("ADMIN")
    })
    
    it("merge override lên preset", async () => {
      // ENGINEER có preset TASK=STANDARD
      // DB override: TASK=NONE
      // → Kết quả: TASK=NONE
    })
    
    it("trả về tất cả NONE khi không phải member", async () => {
      const result = await permissionService.getEffectiveToolPermissions(guestId, projectId)
      expect(Object.values(result).every(v => v === "NONE")).toBe(true)
    })
  })
  
  describe("hasPermission", () => {
    it("ADMIN có mọi quyền", async () => {
      const has = await permissionService.hasPermission(adminId, projectId, "BUDGET", "ADMIN")
      expect(has).toBe(true)
    })
    
    it("ENGINEER không có quyền ADMIN trên BUDGET", async () => {
      const has = await permissionService.hasPermission(engineerId, projectId, "BUDGET", "ADMIN")
      expect(has).toBe(false)
    })
    
    it("ENGINEER có quyền STANDARD trên TASK", async () => {
      const has = await permissionService.hasPermission(engineerId, projectId, "TASK", "STANDARD")
      expect(has).toBe(true)
    })
  })
  
  describe("hasSpecialPrivilege", () => {
    it("SAFETY_OFFICER không có SAFETY_SIGNER mặc định", async () => {
      // SAFETY_SIGNER phải được grant tường minh
      const has = await permissionService.hasSpecialPrivilege(safetyOfficerId, projectId, "SAFETY_SIGNER")
      expect(has).toBe(false)
    })
    
    it("trả về true khi có SpecialPrivilegeAssignment", async () => {
      // setup SpecialPrivilegeAssignment record
    })
  })
})
```

### 3.2. Integration test — route-level

```typescript
describe("Permission Middleware Integration", () => {
  it("trả về 403 khi non-member gọi project-scoped route", async () => {
    const res = await request(app)
      .get(`/projects/${projectId}/tasks`)
      .set("Cookie", [`access_token=${guestToken}`])
    
    expect(res.status).toBe(403)
    expect(res.body.message).toContain("không có quyền truy cập")
  })
  
  it("trả về 403 khi ENGINEER gọi DELETE task (cần ADMIN)", async () => {
    const res = await request(app)
      .delete(`/projects/${projectId}/tasks/${taskId}`)
      .set("Cookie", [`access_token=${engineerToken}`])
    
    expect(res.status).toBe(403)
    expect(res.body.message).toContain("Cần quyền ADMIN")
  })
  
  it("trả về 200 khi ENGINEER gọi GET tasks (cần READ)", async () => {
    const res = await request(app)
      .get(`/projects/${projectId}/tasks`)
      .set("Cookie", [`access_token=${engineerToken}`])
    
    expect(res.status).toBe(200)
  })
  
  it("trả về 200 khi VIEWER gọi GET tasks (READ)", async () => {
    const res = await request(app)
      .get(`/projects/${projectId}/tasks`)
      .set("Cookie", [`access_token=${viewerToken}`])
    
    expect(res.status).toBe(200)
  })
  
  it("trả về 403 khi VIEWER gọi POST task (cần STANDARD)", async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .set("Cookie", [`access_token=${viewerToken}`])
    
    expect(res.status).toBe(403)
  })
  
  it("trả về 403 khi CLIENT gọi GET tasks (không có quyền TASK)", async () => {
    // CLIENT preset: TASK=READ → được phép
    // Nhưng USER (không phải member) → 403
  })
})
```

### 3.3. Frontend test

```typescript
describe("PermissionGate", () => {
  it("hiển thị children khi có quyền", () => {
    render(
      <PermissionGate projectId="p1" toolId="TASK" minLevel="STANDARD">
        <button>Tạo task</button>
      </PermissionGate>
    )
    expect(screen.getByRole("button")).toBeInTheDocument()
  })
  
  it("ẩn children khi không có quyền", () => {
    render(
      <PermissionGate projectId="p1" toolId="TASK" minLevel="ADMIN">
        <button>Xóa task</button>
      </PermissionGate>
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
  
  it("hiển thị fallback khi không có quyền", () => {
    render(
      <PermissionGate projectId="p1" toolId="TASK" minLevel="ADMIN" fallback={<span>Không có quyền</span>}>
        <button>Xóa</button>
      </PermissionGate>
    )
    expect(screen.getByText("Không có quyền")).toBeInTheDocument()
  })
})
```

---

## 4. Checklist triển khai Phase 2

### Backend

- [ ] Tạo `packages/api/src/shared/services/permission.service.ts`
- [ ] Tạo `packages/api/src/shared/middleware/permission.middleware.ts`
- [ ] Tạo `packages/api/src/shared/middleware/special-privilege.middleware.ts`
- [ ] Thêm GET `/permissions/:projectId` endpoint (hoặc trong dashboard module)
- [ ] Cập nhật `packages/api/src/shared/types/express.d.ts` — thêm `projectMembership`, `userPermissions` vào Request
- [ ] Gắn middleware vào `task.routes.ts` — tất cả 11 routes
- [ ] Gắn middleware vào `report.routes.ts` — tất cả routes
- [ ] Gắn middleware vào `file.routes.ts` — tất cả routes
- [ ] Gắn middleware vào `member.routes.ts` — tất cả routes
- [ ] Gắn middleware vào `document.routes.ts` — project-scoped routes
- [ ] Cập nhật `task.service.ts` — xóa logic role check cũ, giữ ownership check
- [ ] Cập nhật `report.service.ts` — xóa logic role check cũ
- [ ] Cập nhật `member.service.ts` — xóa logic role check cũ
- [ ] Chạy `npx prisma generate` sau khi schema không đổi
- [ ] Chạy migration/seed nếu cần
- [ ] Viết unit tests cho `permission.service.ts`
- [ ] Viết integration tests cho các routes đã cập nhật
- [ ] Verify tất cả 9 project-scoped endpoints có middleware đúng

### Frontend

- [ ] Tạo `packages/web/src/shared/hooks/useProjectPermissions.ts`
- [ ] Mở rộng `packages/web/src/shared/hooks/usePermission.ts`
- [ ] Tạo `packages/web/src/shared/components/PermissionGate.tsx`
- [ ] Tạo `packages/web/src/shared/components/SpecialPrivilegeGate.tsx`
- [ ] Tạo `packages/web/src/shared/utils/permission.utils.ts`
- [ ] Thêm `GET /permissions/:projectId` vào API layer
- [ ] Cập nhật `authStore.ts` — thêm `projectPermissions` cache
- [ ] Mở rộng `RoleGuard.tsx` → `PermissionGuard.tsx`
- [ ] Gắn `PermissionGate` vào `TaskDetailPage` (sửa, xóa, nộp duyệt)
- [ ] Gắn `PermissionGate` vào `TaskListPage` (tạo task button)
- [ ] Gắn `PermissionGate` vào `ReportListPage` (tạo, xóa báo cáo)
- [ ] Gắn `PermissionGate` vào `ReportDetailPage`
- [ ] Gắn `PermissionGate` vào `ProjectMembersTab`
- [ ] Gắn `PermissionGate` vào `ProjectFilesTab`
- [ ] Gắn `SpecialPrivilegeGate` vào các nút ký duyệt
- [ ] Viết tests cho `usePermission` hook
- [ ] Viết tests cho `PermissionGate` component
- [ ] Verify không có button/action nào bị ẩn sai (test với mỗi role)

### Documentation

- [ ] Cập nhật README hoặc API docs với permission middleware
- [ ] Ghi chú: frontend gọi `GET /permissions/:projectId` khi vào project detail

---

## 5. Ma trận quyền tham chiếu nhanh

### Tool Permissions (preset từ `ROLE_PERMISSION_PRESETS`)

| Role | PROJECT | TASK | DAILY_REPORT | FILE | DOCUMENT | SAFETY | QUALITY | WAREHOUSE | BUDGET |
|------|---------|------|--------------|------|----------|--------|---------|-----------|--------|
| **PROJECT_MANAGER** | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN | ADMIN |
| **ENGINEER** | READ | STANDARD | STANDARD | STANDARD | STANDARD | READ | STANDARD | READ | NONE |
| **SAFETY_OFFICER** | READ | STANDARD | STANDARD | STANDARD | STANDARD | ADMIN | STANDARD | READ | NONE |
| **DESIGN_ENGINEER** | READ | READ | READ | STANDARD | STANDARD | NONE | STANDARD | NONE | NONE |
| **QUALITY_MANAGER** | READ | STANDARD | STANDARD | STANDARD | STANDARD | STANDARD | ADMIN | STANDARD | NONE |
| **WAREHOUSE_KEEPER** | READ | NONE | NONE | STANDARD | STANDARD | NONE | STANDARD | ADMIN | NONE |
| **CLIENT** | READ | READ | READ | READ | READ | NONE | READ | NONE | READ |
| **VIEWER** | READ | READ | READ | READ | READ | NONE | READ | NONE | NONE |

### Route-level permission requirements

| Route | Method | Tool | Min Level | Special Check |
|-------|--------|------|-----------|---------------|
| `/:projectId/tasks` | GET | TASK | READ | — |
| `/:projectId/tasks` | POST | TASK | STANDARD | — |
| `/:projectId/tasks/:id` | PATCH | TASK | STANDARD | ownership (creator/assignee) |
| `/:projectId/tasks/:id` | DELETE | TASK | ADMIN | — |
| `/:projectId/tasks/:id/submit` | POST | TASK | STANDARD | assignee only |
| `/:projectId/reports` | GET | DAILY_REPORT | READ | — |
| `/:projectId/reports` | POST | DAILY_REPORT | STANDARD | — |
| `/:projectId/reports/:id/submit` | POST | DAILY_REPORT | STANDARD | creator only |
| `/:projectId/files` | GET | FILE | READ | — |
| `/:projectId/files` | POST | FILE | STANDARD | — |
| `/:projectId/files/:id` | DELETE | FILE | ADMIN | — |
| `/:projectId/members` | GET | PROJECT | READ | — |
| `/:projectId/members` | POST | PROJECT | ADMIN | — |
| `/:projectId/members/:id` | PATCH | PROJECT | ADMIN | — |
| `/:projectId/members/:id` | DELETE | PROJECT | ADMIN | — |
| `/:projectId/documents` | GET | DOCUMENT | READ | — |
| `/:projectId/documents` | POST | DOCUMENT | STANDARD | — |
| `/:projectId/documents/:id` | DELETE | DOCUMENT | ADMIN | — |

### Special Privileges (grant tường minh, không preset)

| Privilege | Ai được grant | Dùng cho |
|-----------|---------------|----------|
| `SAFETY_SIGNER` | SAFETY_OFFICER, QUALITY_MANAGER, PROJECT_MANAGER | Ký duyệt báo cáo an toàn (QCVN 18:2014) |
| `QUALITY_SIGNER` | QUALITY_MANAGER, PROJECT_MANAGER | Ký nghiệm thu chất lượng (NĐ 06/2021) |
| `BUDGET_APPROVER` | PROJECT_MANAGER | Duyệt giải ngân ngân sách |

> **Lưu ý quan trọng:** Special privilege **không có preset** — phải được grant tường minh qua bảng `special_privilege_assignments`. Ngay cả `PROJECT_MANAGER` cũng cần có record trong bảng để có quyền ký. Điều này đảm bảo audit trail rõ ràng (biết ai grant cho ai, khi nào).

---

## 6. Câu hỏi/thảo luận cần resolve trước khi bắt đầu

1. **Admin có cần làm thành viên project không?** — Hiện tại: ADMIN toàn hệ thống có mọi quyền mà không cần làm member. Chấp nhận hay cần làm member?

2. **CLIENT/VIEWER có được xem dashboard không?** — Cần tạo endpoint `GET /permissions/:projectId` để frontend cache permissions.

3. **Permission override có cần expire/cache không?** — Hiện tại: query DB mỗi request. Có thể cache 1-5 phút nếu cần performance.

4. **Special privilege grant được thực hiện bởi ai?** — Ai có thể grant `SAFETY_SIGNER`, `QUALITY_SIGNER`, `BUDGET_APPROVER`? (Đề xuất: chỉ `PROJECT_MANAGER` hoặc `ADMIN` toàn hệ thống)

5. **Frontend API: permissions có nên gửi kèm trong auth response không?** — Thay vì gọi riêng `GET /permissions/:projectId`, có thể trả về khi login (nhưng login không có project context).
