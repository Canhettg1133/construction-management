# PHASE 3: RBAC — UI Pages gắn Role

**Thời gian ước tính:** 2–3 ngày

**Tiền đề:** Phase 2 đã hoàn thành (middleware + permission service + usePermission hook + PermissionGate)

---

## 0. Tổng quan tình trạng hiện tại

### 0.1. Bảng "Đã có" vs "Chưa có"

| Feature / Page | Đã có | Route định nghĩa | Trong Sidebar | Ghi chú |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | |
| Projects (List) | ✅ | ✅ | ✅ | |
| Project Detail + tabs | ✅ | ✅ | ✅ | Overview, Reports, Tasks, Members, Files, Documents |
| Document Search | ✅ | ✅ | ✅ | |
| User Management | ✅ | ✅ | ✅ (ADMIN) | |
| Approvals | ✅ | ✅ | ✅ (ADMIN/STAFF) | |
| Audit Logs | ✅ | ✅ | ✅ (ADMIN/STAFF) | |
| Profile / Settings | ✅ | ✅ | ✅ | |
| **SAFETY (An toàn lao động)** | ❌ | ❌ | ❌ | ToolId: `SAFETY` |
| **QUALITY (Chất lượng)** | ❌ | ❌ | ❌ | ToolId: `QUALITY` |
| **WAREHOUSE (Kho vật tư)** | ❌ | ❌ | ❌ | ToolId: `WAREHOUSE` |
| **BUDGET (Ngân sách)** | ❌ | ❌ | ❌ | ToolId: `BUDGET` |
| **Project Settings** | ❌ | ❌ | ❌ | Quản lý permissions matrix |

### 0.2. Sidebar hiện tại (9 items)

```
Dashboard | Dự án | Người dùng (ADMIN) | Duyệt (ADMIN/STAFF)
Audit Logs (ADMIN/STAFF) | Tìm tài liệu | Cài đặt
```

### 0.3. RoleGuard hiện tại

- Chỉ hỗ trợ `SystemRole` (ADMIN / STAFF)
- **Chưa hỗ trợ** `ProjectRole` (PROJECT_MANAGER, ENGINEER, ...)

---

## 1. Ý KIẾN CÁ NHÂN VÀ ĐỀ XUẤT THAY ĐỔI

### 1.1. Về phạm vi — nên chia Phase 3 thành 2 bước

**Bước 3a: Infrastructure + Tích hợp UI** (ngày 1)
- Mở rộng RoleGuard → hỗ trợ Project Permissions
- Cập nhật Sidebar navigation (thêm menu items mới)
- Gắn PermissionGate vào toàn bộ sidebar và pages hiện có
- Tạo `AccessDeniedPage`
- Cập nhật routes — sửa `/approvals` cho phép STAFF

**Bước 3b: Xây dựng 5 trang mới** (ngày 2–3)
- Safety, Quality, Warehouse, Budget, Project Settings
- Mỗi trang đều có RBAC từ đầu

Lý do: Nếu chỉ ẩn/hiện UI mà không xây infrastructure trước, code sẽ rời rạc. Infrastructure làm xong thì gắn UI vào các trang mới nhanh hơn.

### 1.2. Về Safety, Quality, Warehouse, Budget

**Nhận xét quan trọng:** 4 trang này hoàn toàn mới — đây không phải "thêm RBAC vào UI cũ" mà là xây từ đầu. Khối lượng tương đương 1 feature page hoàn chỉnh mỗi trang. Vì vậy:

> ⚠️ **Khuyến nghị:** Nếu đội 2–3 người, có thể chia task: 1 người làm infrastructure, 1–2 người xây trang mới song song.

### 1.3. Về ma trận quyền trong sidebar (bảng ban đầu)

Bảng trong yêu cầu gốc có một số điểm cần điều chỉnh:

| Điểm cần bàn | Ý kiến đề xuất |
|---|---|
| ⚠️ DESIGN_ENGINEER thấy SAFETY? | Có thể ẩn luôn — chuyên môn khác, không liên quan. Trong Role Presets hiện tại: `SAFETY = NONE` cho DESIGN_ENGINEER. |
| ⚠️ Warehouse permission của ENGINEER | Hiện tại: `WAREHOUSE = READ` → chỉ xem. Nên bổ sung button "Yêu cầu vật tư" cho ENGINEER. |
| ⚠️ Warehouse permission của SAFETY | Hiện tại: `WAREHOUSE = READ` → ⚠️ bảng gốc đánh dấu ⚠️ (chỉ đọc). Đề xuất: giữ READ, không cần thêm action. |
| ❌ Quality page — CLIENT thấy? | Hiện tại: `QUALITY = READ` cho CLIENT → CLIENT nên thấy trang Quality nhưng chỉ đọc. Cần kiểm tra lại table. |
| ❌ Warehouse page — CLIENT/VIEWER? | `WAREHOUSE = NONE` → ẩn hoàn toàn. Đúng. |
| ❌ Budget page — CLIENT? | `BUDGET = READ` → CLIENT thấy page nhưng chỉ đọc. |

**Quy tắc đề xuất:**
- Tool level = `NONE` → **ẩn hoàn toàn** khỏi sidebar
- Tool level = `READ` → **thấy page** nhưng tất cả buttons/actions ẩn đi
- Tool level = `STANDARD/ADMIN` → **thấy page + thấy actions** tùy level

### 1.4. Về Project Settings page

Trang này cần thiết vì Phase 2 chỉ xây backend `permission.service`, nhưng **frontend cần 1 page để:**
- PM xem/dashboard quyền của thành viên
- ADMIN/PM assign special privileges
- Override tool permissions cho từng user

> ⚠️ **Đề xuất:** Không cần xây full matrix editor trong Phase 3. Chỉ cần:
> - Tab "Thành viên" có thêm cột hiển thị Permissions hiện tại
> - Modal/Slide-over để PM gán special privilege cho thành viên
> - API: cần `POST /projects/:id/permissions/override` và `POST /projects/:id/privileges/assign`

### 1.5. Về các trang hiện có cần gắn RBAC

Những pages đã có UI nhưng **chưa có RBAC integration**:

| Page | Cần ẩn/hiện gì theo role |
|---|---|
| `ProjectMembersTab` | ❌ ADMIN: thấy hết. PM: thấy, chỉ đổi role. ENGINEER: thấy danh sách, không thấy buttons. CLIENT/VIEWER: không thấy tab. |
| `TaskListPage` | Nút "Tạo công việc": chỉ STANDARD trở lên. |
| `ReportListPage` | Nút "Tạo báo cáo": chỉ STANDARD trở lên. |
| `ProjectFilesTab` | Upload button: chỉ STANDARD. Delete: ADMIN. |
| `ApprovalsPage` | Cần phân biệt: APPROVE button chỉ hiện nếu có `QUALITY_SIGNER` hoặc `SAFETY_SIGNER`. |

---

## 2. Cấu trúc thư mục

### 2.1. Backend — modules cần tạo mới

```
packages/api/src/modules/
├── safety/              ← NEW: safety pages module
│   ├── safety.controller.ts
│   ├── safety.service.ts
│   ├── safety.routes.ts
│   └── __tests__/
├── quality/             ← NEW: quality pages module
│   ├── quality.controller.ts
│   ├── quality.service.ts
│   ├── quality.routes.ts
│   └── __tests__/
├── warehouse/           ← NEW: warehouse pages module
│   ├── warehouse.controller.ts
│   ├── warehouse.service.ts
│   ├── warehouse.routes.ts
│   └── __tests__/
├── budget/              ← NEW: budget pages module
│   ├── budget.controller.ts
│   ├── budget.service.ts
│   ├── budget.routes.ts
│   └── __tests__/
└── permissions/         ← NEW: project permissions management
    ├── permission.controller.ts
    ├── permission.service.ts
    ├── permission.routes.ts
    └── __tests__/
```

### 2.2. Frontend — features cần tạo mới

```
packages/web/src/features/
├── safety/              ← NEW
│   ├── pages/
│   │   ├── SafetyDashboardPage.tsx     ← Trang chủ an toàn
│   │   └── SafetyReportPage.tsx        ← Chi tiết báo cáo AT
│   ├── components/
│   │   ├── SafetyChecklist.tsx          ← Checklist kiểm tra
│   │   ├── SafetyViolationForm.tsx      ← Form báo cáo vi phạm
│   │   └── SafetyApprovalBadge.tsx      ← Badge ký duyệt
│   ├── api/
│   │   └── safetyApi.ts
│   └── constants/
│       └── safety-constants.ts
├── quality/             ← NEW
│   ├── pages/
│   │   ├── QualityDashboardPage.tsx    ← Trang chủ chất lượng
│   │   └── QualityReportPage.tsx        ← Chi tiết QC
│   ├── components/
│   │   ├── QualityChecklist.tsx
│   │   ├── QCReportForm.tsx
│   │   └── QualityApprovalBadge.tsx
│   ├── api/
│   │   └── qualityApi.ts
│   └── constants/
│       └── quality-constants.ts
├── warehouse/           ← NEW
│   ├── pages/
│   │   ├── WarehouseDashboardPage.tsx   ← Trang chủ kho
│   │   ├── WarehouseInventoryPage.tsx   ← Tồn kho
│   │   └── WarehouseTransactionPage.tsx ← Nhập/Xuất
│   ├── components/
│   │   ├── InventoryTable.tsx
│   │   ├── MaterialRequestForm.tsx      ← Yêu cầu vật tư (ENGINEER)
│   │   └── TransactionForm.tsx          ← Nhập/Xuất (WAREHOUSE)
│   ├── api/
│   │   └── warehouseApi.ts
│   └── constants/
│       └── warehouse-constants.ts
├── budget/               ← NEW
│   ├── pages/
│   │   ├── BudgetOverviewPage.tsx       ← Tổng quan ngân sách
│   │   └── BudgetApprovalPage.tsx       ← Duyệt giải ngân
│   ├── components/
│   │   ├── BudgetTable.tsx
│   │   ├── DisbursementForm.tsx
│   │   └── BudgetApprovalBadge.tsx
│   ├── api/
│   │   └── budgetApi.ts
│   └── constants/
│       └── budget-constants.ts
└── project-settings/     ← NEW
    ├── pages/
    │   ├── ProjectSettingsPage.tsx      ← Page tổng hợp
    │   ├── PermissionsMatrixTab.tsx      ← Matrix permissions
    │   └── PrivilegesTab.tsx            ← Gán special privileges
    ├── components/
    │   ├── PermissionRow.tsx
    │   └── PrivilegeGrantModal.tsx
    ├── api/
    │   └── projectSettingsApi.ts
    └── constants/
```

### 2.3. Shared components mới

```
packages/web/src/shared/components/
├── RoleSelector.tsx          ← NEW: dropdown chọn system role (UserManagement)
├── ProjectRoleTag.tsx        ← NEW: badge hiển thị project role
├── PermissionBadge.tsx       ← NEW: badge hiển thị permission level
├── AccessDeniedPage.tsx     ← NEW: trang "Bạn không có quyền truy cập"
└── index.ts                  ← UPDATE: export thêm components mới
```

---

## 3. Bước 3a: Infrastructure & Tích hợp UI (Ngày 1)

### 3.1. Mở rộng RoleGuard → `PermissionGuard`

**File:** `packages/web/src/router/PermissionGuard.tsx`

```typescript
interface PermissionGuardProps {
  // Check system role (cũ)
  systemRoles?: SystemRole[]
  // Check project role (mới)
  projectRoles?: ProjectRole[]
  // Check tool permission (mới)
  projectId?: string
  toolId?: ToolId
  minLevel?: PermissionLevel
  // Check special privilege (mới)
  privilege?: SpecialPrivilege
  // Actions
  children?: React.ReactNode
  fallback?: React.ReactNode    // null = ẩn, ReactNode = hiển thị fallback
  redirectTo?: string
}

Logic check order:
1. Chưa login → redirect /login
2. Có systemRoles → check systemRole
3. Có projectRoles → check projectRole (cần projectMembership)
4. Có toolId → check toolPermission (cần usePermission hook)
5. Có privilege → check specialPrivilege (cần useProjectPermissions)
6. Pass all → render children
7. Fail any → render fallback hoặc redirect
```

**Usage trong router:**

```tsx
// Chỉ ADMIN toàn hệ thống
<PermissionGuard systemRoles={["ADMIN"]}>
  <UserManagementPage />
</PermissionGuard>

// ADMIN hoặc PM (project role)
<PermissionGuard projectRoles={["ADMIN", "PROJECT_MANAGER"]} projectId={id}>
  <ProjectMembersTab />
</PermissionGuard>

// ADMIN trên PROJECT tool
<PermissionGuard projectId={id} toolId="PROJECT" minLevel="ADMIN">
  <AddMemberButton />
</PermissionGuard>
```

### 3.2. Mở rộng Sidebar — Dynamic Navigation

**File:** `packages/web/src/shared/components/Layout/AppLayout.tsx`

#### 3.2.1. Sidebar với RBAC

```typescript
// Tách navItems thành 3 loại:

// 1. Global nav (luôn thấy)
const globalNavItems = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.PROJECTS, label: "Dự án", icon: FolderKanban },
]

// 2. System-level nav (kiểm tra systemRole)
const systemNavItems = [
  {
    to: ROUTES.USERS,
    label: "Người dùng",
    icon: Users,
    systemRoles: ["ADMIN"] as SystemRole[]
  },
  {
    to: ROUTES.APPROVALS,
    label: "Duyệt",
    icon: ClipboardCheck,
    systemRoles: ["ADMIN", "STAFF"] as SystemRole[]
  },
  {
    to: ROUTES.AUDIT_LOGS,
    label: "Audit Logs",
    icon: FileText,
    systemRoles: ["ADMIN"] as SystemRole[]
  },
]

// 3. Project-level nav (kiểm tra project membership + tool permission)
const projectNavItems = [
  {
    label: "An toàn lao động",
    icon: ShieldCheck,
    toolId: "SAFETY",
    minLevel: "READ",
    projectId: currentProjectId,  // from context/URL
  },
  {
    label: "Chất lượng",
    icon: CheckCircle,
    toolId: "QUALITY",
    minLevel: "READ",
    projectId: currentProjectId,
  },
  {
    label: "Kho vật tư",
    icon: Warehouse,
    toolId: "WAREHOUSE",
    minLevel: "READ",
    projectId: currentProjectId,
  },
  {
    label: "Ngân sách",
    icon: Wallet,
    toolId: "BUDGET",
    minLevel: "READ",
    projectId: currentProjectId,
  },
]

// 4. Project management nav (ADMIN trên PROJECT tool)
const projectMgmtNavItems = [
  {
    to: `/${ROUTES.PROJECTS}/${currentProjectId}/members`,
    label: "Thành viên",
    icon: Users2,
    toolId: "PROJECT",
    minLevel: "READ",
    projectId: currentProjectId,
  },
  {
    to: `/${ROUTES.PROJECTS}/${currentProjectId}/settings`,
    label: "Cài đặt dự án",
    icon: Settings2,
    toolId: "PROJECT",
    minLevel: "ADMIN",
    projectId: currentProjectId,
  },
]
```

**Quy tắc hiển thị sidebar item:**
- `NONE` permission → ẩn hoàn toàn (không render)
- `READ`+ → hiển thị item
- Mặc định: tất cả users đã login thấy Dashboard, Dự án

#### 3.2.2. Sidebar Sections cho Project Detail

Khi đang ở trong Project Detail (`/projects/:id`), sidebar cần 2 sections:

```tsx
{/* Project context header */}
<div className="project-header">
  <ProjectAvatar project={project} />
  <span>{project.name}</span>
</div>

{/* Tools section */}
<div className="nav-section">
  <span className="nav-section-label">Công cụ</span>
  {projectToolNavItems.map(item => (
    <PermissionGate key={item.to} toolId={item.toolId} minLevel="READ">
      <NavItem {...item} />
    </PermissionGate>
  ))}
</div>

{/* Management section — chỉ PM/ADMIN */}
<div className="nav-section">
  <span className="nav-section-label">Quản lý</span>
  {projectMgmtNavItems.map(item => (
    <PermissionGate toolId={item.toolId} minLevel="ADMIN">
      <NavItem {...item} />
    </PermissionGate>
  ))}
</div>
```

### 3.3. Tạo `AccessDeniedPage`

**File:** `packages/web/src/shared/components/AccessDeniedPage.tsx`

```tsx
interface AccessDeniedPageProps {
  title?: string          // "Bạn không có quyền truy cập trang này"
  description?: string    // "Liên hệ quản trị viên để được cấp quyền"
  backTo?: string         // URL quay về (default: /dashboard)
  requiredRole?: string   // "ADMIN" | "PROJECT_MANAGER" | ...
  requiredTool?: ToolId
  requiredPrivilege?: SpecialPrivilege
}

// Hiển thị:
// - Icon shield/X
// - Title
// - Mô tả chi tiết: "Cần quyền: [quyền cụ thể]"
// - Nút quay về
```

**Usage:**
```tsx
// Trong PermissionGuard
if (!hasPermission) {
  return <AccessDeniedPage requiredTool="BUDGET" />;
}

// Làm page riêng cho route không được phép
<Route path="/access-denied" element={<AccessDeniedPage />} />
```

### 3.4. Cập nhật Routes — Sửa Approvals

**File:** `packages/web/src/router/index.tsx`

```tsx
// HIỆN TẠI: RoleGuard chỉ cho ADMIN
<Route
  path={ROUTES.APPROVALS}
  element={
    <RoleGuard roles={["ADMIN"]}>
      <ApprovalsPage />
    </RoleGuard>
  }
/>

// MỚI: Cho cả ADMIN + STAFF
<Route
  path={ROUTES.APPROVALS}
  element={
    <PermissionGuard systemRoles={["ADMIN", "STAFF"]}>
      <ApprovalsPage />
    </PermissionGuard>
  }
/>
```

### 3.5. Gắn PermissionGate vào Pages hiện có

#### 3.5.1. `ProjectMembersTab` — Ẩn/hiện actions

```tsx
// Trong ProjectMembersTab

// ADMIN: thấy hết
<PermissionGate projectId={projectId} toolId="PROJECT" minLevel="ADMIN">
  <Button>+ Thêm thành viên</Button>
  <Button>Sửa role</Button>
  <Button>Xóa</Button>
</PermissionGate>

// PM: thấy sửa role, không thấy thêm/xóa
<PermissionGate projectId={projectId} toolId="PROJECT" minLevel="STANDARD">
  {/* chỉ xem */}
  <span>Chỉ PM: có thể đổi role</span>
</PermissionGate>

// Đổi role: nút "Đổi role" → dùng Standard, còn "Thêm/Xóa" → ADMIN
```

**Chi tiết actions:**

| Action | Who can do | Check |
|--------|-----------|-------|
| Xem danh sách | Tất cả members (READ) | `toolId="PROJECT", minLevel="READ"` |
| Xem thông tin member | Tất cả | Always visible |
| Thêm thành viên | ADMIN toàn hệ thống hoặc ADMIN trên PROJECT | `toolId="PROJECT", minLevel="ADMIN"` |
| Đổi role | ADMIN trên PROJECT | `toolId="PROJECT", minLevel="ADMIN"` |
| Xóa thành viên | ADMIN trên PROJECT | `toolId="PROJECT", minLevel="ADMIN"` |

#### 3.5.2. `TaskListPage` — Ẩn nút tạo task

```tsx
// HIỆN TẠI: Button luôn hiển thị
<Button type="primary">+ Tạo công việc</Button>

// MỚI: Chỉ STANDARD trở lên
<PermissionGate projectId={projectId} toolId="TASK" minLevel="STANDARD">
  <Button type="primary">+ Tạo công việc</Button>
</PermissionGate>

// VIEWER/CLIENT: KHÔNG thấy nút tạo
// ENGINEER/SAFETY/QUALITY: THẤY nút tạo
```

#### 3.5.3. `ReportListPage` — Tương tự TaskList

```tsx
<PermissionGate projectId={projectId} toolId="DAILY_REPORT" minLevel="STANDARD">
  <Button>+ Tạo báo cáo</Button>
</PermissionGate>
```

#### 3.5.4. `ApprovalsPage` — Ẩn nút duyệt nếu không có privilege

```tsx
// Chỉ hiện nút "Duyệt" nếu có SPECIAL privilege
<SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
  <Button onClick={handleApprove}>Ký nghiệm thu chất lượng</Button>
</SpecialPrivilegeGate>

<SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
  <Button onClick={handleApproveSafety}>Ký duyệt an toàn</Button>
</SpecialPrivilegeGate>

<SpecialPrivilegeGate projectId={projectId} privilege="BUDGET_APPROVER">
  <Button onClick={handleApproveBudget}>Duyệt giải ngân</Button>
</SpecialPrivilegeGate>
```

### 3.6. RBAC cho Project Overview

**File:** `ProjectOverviewTab.tsx`

```tsx
// Admin/PM thấy: team section + permissions overview
<PermissionGate projectId={projectId} toolId="PROJECT" minLevel="STANDARD">
  <TeamSection members={members} />
</PermissionGate>

// Mọi người đều thấy: project info + progress + recent activities
<ProjectInfoSection project={project} />
<RecentActivitySection />
```

---

## 4. Bước 3b: Xây dựng 5 trang mới (Ngày 2–3)

### 4.1. Database Schema cần cho 4 trang mới

**Prisma models cần thêm:**

```prisma
// Safety Reports
model SafetyReport {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  reportDate    DateTime @map("report_date") @db.Date
  inspectorId   String   @map("inspector_id")   // SAFETY_OFFICER hoặc ENGINEER
  location      String   @db.VarChar(500)
  description   String   @db.Text
  violations    Int      @default(0) @map("violations")
  photos        Json?    // array of photo URLs
  status        ApprovalStatus @default(PENDING) @map("status")
  signedBy      String?  @map("signed_by")
  signedAt      DateTime? @map("signed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  inspector User @relation(fields: [inspectorId], references: [id])

  @@index([projectId])
  @@index([reportDate])
  @@map("safety_reports")
}

// Quality Reports
model QualityReport {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  reportDate    DateTime @map("report_date") @db.Date
  inspectorId   String   @map("inspector_id")
  location      String   @db.VarChar(500)
  description   String   @db.Text
  status        ApprovalStatus @default(PENDING) @map("status")
  signedBy      String?  @map("signed_by")
  signedAt      DateTime? @map("signed_at")
  createdAt     DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  inspector User @relation(fields: [inspectorId], references: [id])

  @@index([projectId])
  @@index([reportDate])
  @@map("quality_reports")
}

// Warehouse Inventory
model WarehouseInventory {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  materialName  String   @map("material_name") @db.VarChar(200)
  unit          String   @db.VarChar(20)    // "m3", "kg", "tấn", "viên"
  quantity      Decimal  @default(0) @db.Decimal(15, 3) @map("quantity")
  minQuantity   Decimal  @default(0) @db.Decimal(15, 3) @map("min_quantity")
  maxQuantity   Decimal  @default(0) @db.Decimal(15, 3) @map("max_quantity")
  location      String?  @db.VarChar(200)  @map("location") // vị trí trong kho
  updatedAt     DateTime @updatedAt @map("updated_at")
  createdAt     DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  transactions WarehouseTransaction[]

  @@index([projectId])
  @@map("warehouse_inventory")
}

// Warehouse Transactions (nhập/xuất)
model WarehouseTransaction {
  id            String   @id @default(uuid())
  inventoryId   String   @map("inventory_id")
  type          String   @db.VarChar(20)  // "IN" | "OUT" | "REQUEST"
  quantity      Decimal  @db.Decimal(15, 3) @map("quantity")
  note          String?  @db.Text
  requestedBy   String?  @map("requested_by")  // ENGINEER yêu cầu
  approvedBy    String?  @map("approved_by")
  status        String   @default("PENDING") @db.VarChar(20)  // "PENDING" | "APPROVED" | "REJECTED"
  createdAt     DateTime @default(now()) @map("created_at")

  inventory WarehouseInventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  requester User? @relation(fields: [requestedBy], references: [id])

  @@index([inventoryId])
  @@index([status])
  @@map("warehouse_transactions")
}

// Budget items
model BudgetItem {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  category      String   @db.VarChar(100)  // "Vật tư", "Nhân công", "Thiết bị", "Khác"
  description   String   @db.VarChar(500)
  estimatedCost Decimal  @db.Decimal(15, 0) @map("estimated_cost")
  approvedCost Decimal? @db.Decimal(15, 0) @map("approved_cost")
  spentCost    Decimal  @default(0) @db.Decimal(15, 0) @map("spent_cost")
  status       String   @default("PENDING") @db.VarChar(20)  // "PENDING" | "APPROVED" | "PAID"
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  disbursements BudgetDisbursement[]

  @@index([projectId])
  @@map("budget_items")
}

// Budget disbursements
model BudgetDisbursement {
  id            String   @id @default(uuid())
  budgetItemId  String   @map("budget_item_id")
  amount        Decimal  @db.Decimal(15, 0) @map("amount")
  approvedBy    String?  @map("approved_by")
  approvedAt    DateTime? @map("approved_at")
  status        String   @default("PENDING") @db.VarChar(20)  // "PENDING" | "APPROVED" | "PAID"
  note          String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  budgetItem BudgetItem @relation(fields: [budgetItemId], references: [id], onDelete: Cascade)

  @@index([budgetItemId])
  @@map("budget_disbursements")
}
```

### 4.2. Safety Page (An toàn lao động)

#### 4.2.1. Route

```tsx
// packages/web/src/router/index.tsx
<Route
  path="/projects/:id/safety"
  element={
    <PermissionGate projectId={params.id} toolId="SAFETY" minLevel="READ">
      <SafetyDashboardPage />
    </PermissionGate>
  }
/>
```

#### 4.2.2. Backend API endpoints

| Method | Path | Check | Mô tả |
|--------|------|--------|-------|
| GET | `/projects/:projectId/safety` | `SAFETY=READ` | Danh sách báo cáo AT |
| GET | `/projects/:projectId/safety/:reportId` | `SAFETY=READ` | Chi tiết báo cáo |
| POST | `/projects/:projectId/safety` | `SAFETY=STANDARD` | Tạo báo cáo |
| PATCH | `/projects/:projectId/safety/:reportId` | `SAFETY=STANDARD` + ownership | Sửa báo cáo |
| POST | `/projects/:projectId/safety/:reportId/sign` | `SAFETY_SIGNER` privilege | Ký duyệt |

#### 4.2.3. UI Components

```
SafetyDashboardPage
├── SummaryCards (tổng số báo cáo, vi phạm, chờ duyệt)
├── SafetyReportsTable (danh sách báo cáo gần đây)
│   ├── StatusBadge (PENDING/APPROVED/REJECTED)
│   ├── InspectorName
│   └── Violations count
└── QuickActions
    ├── Button "Tạo báo cáo" (STANDARD+)
    └── Button "Ký duyệt" (SAFETY_SIGNER privilege + PENDING reports)
```

**Ma trận RBAC Safety:**

| Action | ADMIN | PM | SAFETY | ENGINEER | QUALITY | DESIGNER | WAREHOUSE | CLIENT | VIEWER |
|--------|-------|-----|--------|---------|---------|---------|-----------|--------|--------|
| Xem dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tạo báo cáo | ✅ | ✅ | ✅ | ✅ (của mình) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sửa báo cáo | ✅ | ✅ | ✅ (của mình) | ✅ (của mình) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ký duyệt | ✅ | ❌ | ✅ (SAFETY_SIGNER) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Lưu ý:** PM không tự động có quyền ký. Phải được grant `SAFETY_SIGNER`.

### 4.3. Quality Page (Chất lượng)

#### 4.3.1. Route

```tsx
<Route
  path="/projects/:id/quality"
  element={
    <PermissionGate projectId={params.id} toolId="QUALITY" minLevel="READ">
      <QualityDashboardPage />
    </PermissionGate>
  }
/>
```

#### 4.3.2. Backend API endpoints

| Method | Path | Check | Mô tả |
|--------|------|--------|-------|
| GET | `/projects/:projectId/quality` | `QUALITY=READ` | Danh sách báo cáo QC |
| GET | `/projects/:projectId/quality/:reportId` | `QUALITY=READ` | Chi tiết |
| POST | `/projects/:projectId/quality` | `QUALITY=STANDARD` | Tạo báo cáo |
| PATCH | `/projects/:projectId/quality/:reportId` | `QUALITY=STANDARD` + ownership | Sửa |
| POST | `/projects/:projectId/quality/:reportId/sign` | `QUALITY_SIGNER` privilege | Ký nghiệm thu |

#### 4.3.3. UI Components

```
QualityDashboardPage
├── SummaryCards (báo cáo, QC pass rate, chờ nghiệm thu)
├── QualityReportsTable
├── QC Checklists (checklist mẫu)
└── QuickActions
    ├── Button "Tạo báo cáo QC" (STANDARD+)
    └── Button "Ký nghiệm thu" (QUALITY_SIGNER privilege)
```

**Ma trận RBAC Quality:**

| Action | ADMIN | PM | SAFETY | ENGINEER | QUALITY | DESIGNER | WAREHOUSE | CLIENT | VIEWER |
|--------|-------|-----|--------|---------|---------|---------|-----------|--------|--------|
| Xem dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Tạo báo cáo | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ký nghiệm thu | ✅ | ❌ | ❌ | ❌ | ✅ (QUALITY_SIGNER) | ❌ | ❌ | ❌ | ❌ |

### 4.4. Warehouse Page (Kho vật tư)

#### 4.4.1. Route

```tsx
<Route
  path="/projects/:id/warehouse"
  element={
    <PermissionGate projectId={params.id} toolId="WAREHOUSE" minLevel="READ">
      <WarehouseDashboardPage />
    </PermissionGate>
  }
/>
```

#### 4.4.2. Backend API endpoints

| Method | Path | Check | Mô tả |
|--------|------|--------|-------|
| GET | `/projects/:projectId/warehouse/inventory` | `WAREHOUSE=READ` | Danh sách tồn kho |
| GET | `/projects/:projectId/warehouse/inventory/:id` | `WAREHOUSE=READ` | Chi tiết vật tư |
| POST | `/projects/:projectId/warehouse/transactions` | `WAREHOUSE=STANDARD` | Nhập vật tư |
| POST | `/projects/:projectId/warehouse/requests` | `WAREHOUSE=READ` | Tạo yêu cầu (mọi người) |
| PATCH | `/projects/:projectId/warehouse/requests/:id` | `WAREHOUSE=STANDARD` | Duyệt/từ chối yêu cầu |
| GET | `/projects/:projectId/warehouse/transactions` | `WAREHOUSE=READ` | Lịch sử nhập/xuất |

#### 4.4.3. UI Components

```
WarehouseDashboardPage
├── InventoryOverview (tổng số vật tư, giá trị, cảnh báo tồn kho thấp)
├── InventoryTable (vật tư + số lượng + vị trí)
├── RecentTransactionsTable
└── QuickActions
    ├── Button "Nhập vật tư" (WAREHOUSE=STANDARD, WAREHOUSE_KEEPER)
    ├── Button "Xuất vật tư" (WAREHOUSE=STANDARD, WAREHOUSE_KEEPER)
    └── Button "Yêu cầu vật tư" (WAREHOUSE=READ — mọi thành viên)
```

**Ma trận RBAC Warehouse:**

| Action | ADMIN | PM | SAFETY | ENGINEER | QUALITY | DESIGNER | WAREHOUSE | CLIENT | VIEWER |
|--------|-------|-----|--------|---------|---------|---------|-----------|--------|--------|
| Xem tồn kho | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Nhập vật tư | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Xuất vật tư | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Tạo yêu cầu | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Duyệt yêu cầu | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |

### 4.5. Budget Page (Ngân sách)

#### 4.5.1. Route

```tsx
<Route
  path="/projects/:id/budget"
  element={
    <PermissionGate projectId={params.id} toolId="BUDGET" minLevel="READ">
      <BudgetOverviewPage />
    </PermissionGate>
  }
/>
```

#### 4.5.2. Backend API endpoints

| Method | Path | Check | Mô tả |
|--------|------|--------|-------|
| GET | `/projects/:projectId/budget` | `BUDGET=READ` | Tổng quan ngân sách |
| GET | `/projects/:projectId/budget/items` | `BUDGET=READ` | Danh sách hạng mục |
| POST | `/projects/:projectId/budget/items` | `BUDGET=ADMIN` | Tạo hạng mục |
| PATCH | `/projects/:projectId/budget/items/:id` | `BUDGET=ADMIN` | Sửa hạng mục |
| POST | `/projects/:projectId/budget/disbursements` | `BUDGET=ADMIN` | Tạo giải ngân |
| PATCH | `/projects/:projectId/budget/disbursements/:id` | `BUDGET_APPROVER` privilege | Duyệt giải ngân |

#### 4.5.3. UI Components

```
BudgetOverviewPage
├── BudgetSummary (tổng dự toán, đã chi, còn lại)
├── BudgetByCategory (pie chart hoặc table)
├── BudgetItemsTable
└── QuickActions
    ├── Button "Thêm hạng mục" (BUDGET=ADMIN, PROJECT_MANAGER)
    └── Button "Duyệt giải ngân" (BUDGET_APPROVER privilege)
```

**Ma trận RBAC Budget:**

| Action | ADMIN | PM | SAFETY | ENGINEER | QUALITY | DESIGNER | WAREHOUSE | CLIENT | VIEWER |
|--------|-------|-----|--------|---------|---------|---------|-----------|--------|--------|
| Xem ngân sách | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Thêm/sửa hạng mục | ✅ | ✅ (PM) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Duyệt giải ngân | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Duyệt (BUDGET_APPROVER) | ✅ | ✅ (nếu được grant) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 4.6. Project Settings Page (Cài đặt dự án)

#### 4.6.1. Route

```tsx
<Route
  path="/projects/:id/settings"
  element={
    <PermissionGuard projectId={params.id} toolId="PROJECT" minLevel="ADMIN">
      <ProjectSettingsPage />
    </PermissionGuard>
  }
/>
```

#### 4.6.2. Backend API endpoints

| Method | Path | Check | Mô tả |
|--------|------|--------|-------|
| GET | `/projects/:id/settings` | `PROJECT=ADMIN` | Lấy settings |
| GET | `/projects/:id/settings/permissions` | `PROJECT=ADMIN` | Full permissions matrix |
| POST | `/projects/:id/settings/permissions/override` | `PROJECT=ADMIN` | Override tool permission |
| DELETE | `/projects/:id/settings/permissions/override/:userId/:toolId` | `PROJECT=ADMIN` | Xóa override |
| POST | `/projects/:id/settings/privileges/assign` | `PROJECT=ADMIN` | Gán special privilege |
| DELETE | `/projects/:id/settings/privileges/:assignmentId` | `PROJECT=ADMIN` | Xóa special privilege |

#### 4.6.3. UI Components

```
ProjectSettingsPage
├── Tabs: [General | Permissions | Privileges]
│
├── GeneralTab
│   ├── Tên dự án
│   ├── Mã dự án
│   ├── Mô tả
│   ├── Ngày bắt đầu / kết thúc
│   └── Nút "Cập nhật" (PROJECT=ADMIN)
│
├── PermissionsMatrixTab
│   ├── Table: User | Tool1 | Tool2 | ... | Tool9
│   ├── Mỗi cell = dropdown (NONE/READ/STANDARD/ADMIN)
│   ├── Current value = preset (xám) / override (xanh)
│   ├── Có nút "Reset to default" mỗi row
│   └── Có nút "Apply changes"
│
└── PrivilegesTab
    ├── Table: User | SAFETY_SIGNER | QUALITY_SIGNER | BUDGET_APPROVER
    ├── Toggle switches để gán/revoke privilege
    ├── Audit trail: "Granted by PM [name] at [date]"
    └── Special privilege assignments list
```

---

## 5. Checklist triển khai Phase 3

### Ngày 1: Infrastructure & Tích hợp UI

#### Backend
- [ ] Cập nhật `packages/api/src/routes/index.ts` — thêm routes cho safety, quality, warehouse, budget, permissions
- [ ] Thêm models vào `schema.prisma` (SafetyReport, QualityReport, WarehouseInventory, WarehouseTransaction, BudgetItem, BudgetDisbursement)
- [ ] Tạo `safety.controller.ts`, `safety.service.ts`, `safety.routes.ts`
- [ ] Tạo `quality.controller.ts`, `quality.service.ts`, `quality.routes.ts`
- [ ] Tạo `warehouse.controller.ts`, `warehouse.service.ts`, `warehouse.routes.ts`
- [ ] Tạo `budget.controller.ts`, `budget.service.ts`, `budget.routes.ts`
- [ ] Tạo `permission.controller.ts`, `permission.routes.ts` (project settings)
- [ ] Gắn middleware `requireProjectMembership` + `requireToolPermission` vào 4 modules mới
- [ ] Chạy `prisma migrate dev` để tạo migration mới
- [ ] Chạy `prisma generate`
- [ ] Seed dữ liệu mẫu cho 4 modules mới

#### Frontend — Infrastructure
- [ ] Tạo `packages/web/src/shared/components/AccessDeniedPage.tsx`
- [ ] Tạo `packages/web/src/router/PermissionGuard.tsx` (mở rộng từ RoleGuard)
- [ ] Cập nhật `packages/web/src/router/index.tsx` — sửa Approvals route (ADMIN+STAFF)
- [ ] Thêm routes cho 4 modules mới + Project Settings
- [ ] Thêm API functions cho 4 modules mới
- [ ] Tạo `useProjectPermissions` — fetch permissions từ backend

#### Frontend — Sidebar & Pages
- [ ] Mở rộng `AppLayout.tsx` — dynamic sidebar với project context
- [ ] Gắn PermissionGate vào `ProjectMembersTab` — actions
- [ ] Gắn PermissionGate vào `TaskListPage` — nút tạo task
- [ ] Gắn PermissionGate vào `ReportListPage` — nút tạo báo cáo
- [ ] Gắn PermissionGate vào `ProjectFilesTab` — upload/delete buttons
- [ ] Gắn SpecialPrivilegeGate vào `ApprovalsPage` — nút ký duyệt
- [ ] Gắn PermissionGate vào `ProjectOverviewTab` — team section
- [ ] Cập nhật sidebar nav — thêm Safety, Quality, Warehouse, Budget items
- [ ] Cập nhật sidebar nav — thêm Project Settings (ADMIN only)

### Ngày 2: Safety + Quality Pages

#### Safety Page
- [ ] Tạo `SafetyDashboardPage.tsx` — summary cards + table
- [ ] Tạo `SafetyReportPage.tsx` — chi tiết + form
- [ ] Tạo `SafetyChecklist.tsx`, `SafetyViolationForm.tsx`
- [ ] Tạo `safetyApi.ts`
- [ ] Gắn RBAC: ENGINEER chỉ tạo/sửa báo cáo của mình
- [ ] Gắn RBAC: SAFETY_SIGNER privilege cho nút ký

#### Quality Page
- [ ] Tạo `QualityDashboardPage.tsx` — summary + table
- [ ] Tạo `QualityReportPage.tsx` — chi tiết + form
- [ ] Tạo `QualityChecklist.tsx`, `QCReportForm.tsx`
- [ ] Tạo `qualityApi.ts`
- [ ] Gắn RBAC: QUALITY_SIGNER privilege cho nút ký nghiệm thu

### Ngày 3: Warehouse + Budget + Project Settings

#### Warehouse Page
- [ ] Tạo `WarehouseDashboardPage.tsx` — tổng quan + table
- [ ] Tạo `WarehouseInventoryPage.tsx` — chi tiết tồn kho
- [ ] Tạo `WarehouseTransactionPage.tsx` — form nhập/xuất
- [ ] Tạo `MaterialRequestForm.tsx` — yêu cầu vật tư cho ENGINEER
- [ ] Tạo `warehouseApi.ts`
- [ ] Gắn RBAC: WAREHOUSE_KEEPER full quyền; ENGINEER chỉ tạo request

#### Budget Page
- [ ] Tạo `BudgetOverviewPage.tsx` — tổng quan ngân sách
- [ ] Tạo `BudgetApprovalPage.tsx` — duyệt giải ngân
- [ ] Tạo `BudgetTable.tsx`, `DisbursementForm.tsx`
- [ ] Tạo `budgetApi.ts`
- [ ] Gắn RBAC: BUDGET_APPROVER privilege cho nút duyệt

#### Project Settings Page
- [ ] Tạo `ProjectSettingsPage.tsx` — tabs layout
- [ ] Tạo `PermissionsMatrixTab.tsx` — matrix editor
- [ ] Tạo `PrivilegesTab.tsx` — grant/revoke special privileges
- [ ] Tạo `projectSettingsApi.ts`
- [ ] Gắn RBAC: chỉ ADMIN trên PROJECT tool mới thấy

---

## 6. Ma trận RBAC tổng hợp — Phase 3

### Sidebar Navigation Matrix

| Menu Item | ADMIN | PM | ENGINEER | SAFETY | DESIGNER | QUALITY | WAREHOUSE | CLIENT | VIEWER |
|-----------|-------|-----|---------|--------|---------|---------|-----------|--------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dự án | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **An toàn** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Chất lượng** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Kho vật tư** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Ngân sách** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Thành viên | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cài đặt dự án | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Báo cáo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Công việc | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Tài liệu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Người dùng | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Duyệt | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Quy ước đọc:
- ✅ = Thấy trong sidebar, có thể tương tác (tùy action permission)
- ⚠️ = Thấy nhưng chỉ đọc (READ permission)
- ❌ = Không thấy trong sidebar (`NONE` permission → ẩn hoàn toàn)

---

## 7. Câu hỏi/thảo luận cần resolve trước khi bắt đầu

1. **Safety/Quality — ai được tạo báo cáo?** Hiện tại Role Presets: ENGINEER có `SAFETY=READ`, không tạo được. Nên bổ sung: nếu muốn ENGINEER tạo báo cáo AT → cần override `SAFETY=STANDARD` cho ENGINEER, hoặc tạo riêng route cho "self-report".

2. **Warehouse — "Yêu cầu vật tư" cho ENGINEER?** Hiện tại: `WAREHOUSE=READ` cho ENGINEER. Đề xuất: ENGINEER chỉ thấy button "Yêu cầu vật tư" (tạo REQUEST transaction), không thấy inventory table. Quan điểm?

3. **Budget — CLIENT xem được?** Hiện tại: `BUDGET=READ` cho CLIENT → CLIENT thấy page, chỉ đọc. Chấp nhận hay ẩn hoàn toàn?

4. **Quality — CLIENT thấy không?** Hiện tại: `QUALITY=READ` cho CLIENT → CLIENT thấy page, chỉ đọc. Trong thực tế xây dựng, chủ đầu tư (CLIENT) thường muốn xem báo cáo chất lượng. Chấp nhận?

5. **Project Settings — ai thấy?** Chỉ ADMIN trên PROJECT tool → ADMIN toàn hệ thống và PROJECT_MANAGER. PM có thể xem nhưng không sửa?

6. **Special Privilege — ai có thể grant?** Đề xuất: chỉ ADMIN toàn hệ thống và PROJECT_MANAGER (có `PROJECT=ADMIN`) mới grant được. STAFF không có quyền này.
