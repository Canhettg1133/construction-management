# PHASE 4A: Backend — Dashboard API role-based + Notification System

**Thời gian ước tính:** 1–2 ngày

**Tiền đề:** Phase 2 + Phase 3 đã hoàn thành (permission service, guards, Safety/Quality/Warehouse/Budget pages)

---

## 0. Quyết định đã resolved

| # | Câu hỏi | Trả lời | Ghi chú |
|---|---------|---------|---------|
| 1 | Dashboard có project context không? | **A — Luôn thấy tất cả** | Dashboard `/dashboard` là trang riêng, hiển thị stats TỔNG HỢP tất cả dự án theo phạm vi quyền. ADMIN thấy tất cả, PM thấy dự án mình quản lý, ENGINEER thấy dự án mình tham gia. Không cần thêm route project-scoped. |
| 2 | Auto-refresh interval? | **B — 30 giây** | Cân bằng giữa data mới và server load. Role-based data ít thay đổi hơn. |
| 3 | Badge notification chung? | **A — Có, cần notification bell** | Icon chuông 🔔 trên header, click hiện dropdown thông báo. Mỗi role thấy notification khác nhau. |
| 4 | WAREHOUSE chart? | **C — Cảnh báo tồn kho** | Line chart mức tồn kho top vật tư với ngưỡng min/max. |

---

## 1. Tổng quan tình trạng hiện tại

### 1.1. API Endpoint hiện tại

```
GET /dashboard/stats → DashboardStats
```

**1 endpoint duy nhất**, trả về toàn bộ data. Không có user context → tất cả user nhìn cùng data.

### 1.2. DashboardStats type (đã có)

```typescript
interface DashboardStats {
  projectCount: number
  activeProjectCount: number
  openTaskCount: number
  overdueTaskCount: number
  todayReportCount: number
  memberCount: number
  tasksByStatus: Record<TaskStatus, number>
  pendingApprovals: { taskCount, reportCount }
  overdueTasks: DashboardOverdueTask[]
  riskyProjects: DashboardRiskyProject[]
  activeMembers: DashboardActiveMember[]
  weeklyProgress: DashboardWeeklyProgress[]
  recentActivity: AuditLog[]
  updatedAt: string
}
```

### 1.3. Prisma models hữu ích

- `User` — systemRole, specialty, isActive
- `Project` — status, progress
- `ProjectMember` — role, projectId, userId
- `Task` — status, priority, dueDate, approvalStatus, assigneeId, projectId
- `DailyReport` — reportDate, approvalStatus, creatorId, projectId
- `SafetyReport` — reportDate, violations, status, inspectorId
- `QualityReport` — reportDate, status, inspectorId
- `WarehouseInventory` — projectId, quantity, minQuantity
- `WarehouseTransaction` — inventoryId, type, status
- `BudgetItem` — projectId, estimatedCost, approvedCost, spentCost, status
- `AuditLog` — action, entityType, createdAt, userId
- `Notification` — type, isRead

---

## 2. Backend — Dashboard API

### 2.1. Kiến trúc endpoint

**File:** `packages/api/src/modules/dashboard/dashboard.controller.ts`

```typescript
// HIỆN TẠI:
router.get("/stats", authenticate, dashboardController.getStats)

// MỚI:
router.get("/stats", authenticate, dashboardController.getStats)
// - Nhận user từ req.user (JWT payload)
// - KHÔNG nhận projectId param — dashboard là trang riêng
// - Xác định role context từ:
//   1. systemRole (ADMIN/STAFF/CLIENT)
//   2. projectRoles[] (từ project_members table)
```

**KHÔNG cần endpoint project-scoped.**

### 2.2. Kiến trúc Service

**File:** `packages/api/src/modules/dashboard/dashboard.service.ts`

#### 2.2.1. DashboardContext

```typescript
interface DashboardContext {
  userId: string
  systemRole: SystemRole          // ADMIN | STAFF | CLIENT
  projectRoles: ProjectRole[]    // projectRoles của user (từ project_members)
}
```

#### 2.2.2. Hàm `getStats(userId)`

```typescript
async getStats(userId: string): Promise<DashboardStats> {
  const ctx = await this.buildContext(userId)

  const [general, roleSpecific] = await Promise.all([
    this.getGeneralStats(ctx),       // always available
    this.getRoleSpecificStats(ctx),  // filter by role
  ])

  return { ...general, ...roleSpecific }
}
```

#### 2.2.3. buildContext

```typescript
private async buildContext(userId: string): Promise<DashboardContext> {
  const user = await this.repo.findUserById(userId)
  const projectRoles = await this.repo.getProjectRoles(userId)

  return {
    userId,
    systemRole: user.systemRole,
    projectRoles,
  }
}
```

#### 2.2.4. getGeneralStats — phần tất cả role đều thấy

```typescript
private async getGeneralStats(ctx: DashboardContext) {
  const [projectCount, todayReportCount, memberCount, weeklyProgress, recentActivity] =
    await Promise.all([
      this.getProjectCount(ctx),
      this.getTodayReportCount(ctx),
      this.getMemberCount(ctx),
      this.getWeeklyProgress(ctx),
      this.getRecentActivity(ctx),
    ])

  return { projectCount, todayReportCount, memberCount, weeklyProgress, recentActivity }
}
```

#### 2.2.5. getRoleSpecificStats

```typescript
private async getRoleSpecificStats(ctx: DashboardContext): Promise<Partial<DashboardStats>> {
  // ADMIN: tất cả data
  if (ctx.systemRole === "ADMIN") {
    return this.getAdminStats(ctx)
  }

  // STAFF: tất cả data
  if (ctx.systemRole === "STAFF") {
    return this.getStaffStats(ctx)
  }

  // CLIENT (systemRole): xem tiến độ dự án
  if (ctx.systemRole === "CLIENT") {
    return this.getClientSystemStats(ctx)
  }

  // Regular user: xác định bằng projectRoles
  return this.getProjectRoleStats(ctx)
}
```

#### 2.2.6. Chi tiết từng role stats

**ADMIN stats:**

```typescript
private async getAdminStats(ctx: DashboardContext) {
  const [openTaskCount, overdueTaskCount, pendingApprovals,
         overdueTasks, riskyProjects, activeMembers] = await Promise.all([
    this.repo.countOpenTasks(),
    this.repo.countOverdueTasks(),
    this.repo.countPendingApprovals(),
    this.repo.findOverdueTasks(),
    this.repo.findRiskyProjects(),
    this.repo.findActiveMembers(),
  ])

  return {
    openTaskCount, overdueTaskCount,
    pendingApprovals,
    overdueTasks, riskyProjects, activeMembers,
  }
}
```

**STAFF stats:** Giống ADMIN.

```typescript
private async getStaffStats(ctx: DashboardContext) {
  return this.getAdminStats(ctx)
}
```

**PROJECT_MANAGER stats:**

```typescript
private async getPMStats(ctx: DashboardContext) {
  // Chỉ thấy projects mình quản lý
  const projectIds = ctx.projectRoles
    .filter(r => r === "PROJECT_MANAGER")
    .map(() => /* lấy projectIds từ project_members */)

  const [openTaskCount, overdueTaskCount, pendingApprovals,
         overdueTasks, riskyProjects, activeMembers,
         budgetOverview, warehouseStats] = await Promise.all([
    this.repo.countOpenTasks({ projectIds }),
    this.repo.countOverdueTasks({ projectIds }),
    this.repo.countPendingApprovals({ projectIds }),
    this.repo.findOverdueTasks({ projectIds, limit: 10 }),
    this.repo.findRiskyProjects({ projectIds, limit: 5 }),
    this.repo.findActiveMembers({ projectIds }),
    this.repo.getBudgetOverviewByProjectIds(projectIds),
    this.repo.getWarehouseStatsByProjectIds(projectIds),
  ])

  return {
    openTaskCount, overdueTaskCount, pendingApprovals,
    overdueTasks, riskyProjects, activeMembers,
    budgetOverview, warehouseStats,
  }
}
```

**ENGINEER stats:**

```typescript
private async getEngineerStats(ctx: DashboardContext) {
  // Chỉ thấy task của mình
  return {
    openTaskCount: await this.repo.countOpenTasks({ assigneeId: ctx.userId }),
    overdueTaskCount: await this.repo.countOverdueTasks({ assigneeId: ctx.userId }),
    myTasks: await this.repo.findMyTasks(ctx.userId),
    myReports: await this.repo.findMyReports(ctx.userId),
    todayReportCount: await this.repo.countMyTodayReports(ctx.userId),
    weeklyProgress: await this.repo.getMyWeeklyProgress(ctx.userId),
    pendingApprovals: { taskCount: 0, reportCount: 0 },
    myTasksByStatus: await this.repo.getMyTasksByStatus(ctx.userId),
  }
}
```

**SAFETY_OFFICER stats:**

```typescript
private async getSafetyStats(ctx: DashboardContext) {
  const projectIds = ctx.projectRoles
    .filter(r => r === "SAFETY_OFFICER")
    .map(() => /* lấy projectIds */)

  return {
    safetyStats: await this.repo.getSafetyStatsByProjectIds(projectIds),
    pendingSafetyApprovals: await this.repo.countPendingSafetyApprovalsByProjectIds(projectIds),
    safetyViolations: await this.repo.findRecentViolationsByProjectIds(projectIds),
    safetyTasks: await this.repo.findSafetyTasksByProjectIds(projectIds),
    openTaskCount: await this.repo.countOpenTasks({ projectIds, tags: ["safety"] }),
    overdueTaskCount: await this.repo.countOverdueTasks({ projectIds, tags: ["safety"] }),
    weeklyProgress: await this.repo.getWeeklySafetyProgressByProjectIds(projectIds),
    myReports: await this.repo.findMyReports(ctx.userId),
  }
}
```

**QUALITY_MANAGER stats:**

```typescript
private async getQualityStats(ctx: DashboardContext) {
  const projectIds = ctx.projectRoles
    .filter(r => r === "QUALITY_MANAGER")
    .map(() => /* lấy projectIds */)

  return {
    qualityStats: await this.repo.getQualityStatsByProjectIds(projectIds),
    pendingQualityApprovals: await this.repo.countPendingQualityApprovalsByProjectIds(projectIds),
    qualityReports: await this.repo.findRecentQualityReportsByProjectIds(projectIds),
    warehouseStats: await this.repo.getWarehouseStatsByProjectIds(projectIds),
    openTaskCount: await this.repo.countOpenTasks({ projectIds }),
    overdueTaskCount: await this.repo.countOverdueTasks({ projectIds }),
    weeklyProgress: await this.repo.getWeeklyQualityProgressByProjectIds(projectIds),
  }
}
```

**WAREHOUSE_KEEPER stats:**

```typescript
private async getWarehouseStats(ctx: DashboardContext) {
  const projectIds = ctx.projectRoles
    .filter(r => r === "WAREHOUSE_KEEPER")
    .map(() => /* lấy projectIds */)

  return {
    warehouseStats: await this.repo.getWarehouseStatsByProjectIds(projectIds),
    lowStockItems: await this.repo.findLowStockItemsByProjectIds(projectIds),
    pendingTransactions: await this.repo.countPendingTransactionsByProjectIds(projectIds),
    recentTransactions: await this.repo.findRecentTransactionsByProjectIds(projectIds),
    warehouseTrendData: await this.repo.getWarehouseTrendDataByProjectIds(projectIds),
  }
}
```

**CLIENT (projectRole) stats:**

```typescript
private async getClientProjectStats(ctx: DashboardContext) {
  const projectIds = ctx.projectRoles
    .filter(r => r === "CLIENT")
    .map(() => /* lấy projectIds */)

  return {
    projectProgress: await this.repo.getProjectProgressByProjectIds(projectIds),
    recentReports: await this.repo.findRecentReportsForClientByProjectIds(projectIds),
    qualityReports: await this.repo.findRecentQualityReportsByProjectIds(projectIds),
    budgetOverview: await this.repo.getBudgetOverviewByProjectIds(projectIds),
    weeklyProgress: await this.repo.getWeeklyProgressByProjectIds(projectIds),
  }
}
```

**VIEWER stats:** Giống CLIENT, chỉ đọc.

### 2.3. Repository — Thêm methods

**File:** `packages/api/src/modules/dashboard/dashboard.repository.ts`

```typescript
// === Context helpers ===
findUserById(userId: string): Promise<User>
getProjectRoles(userId: string): Promise<ProjectRole[]>
getMemberProjectIds(userId: string): Promise<string[]>

// === Role-specific filtering ===
countOpenTasks(filters: { projectIds?: string[]; assigneeId?: string; tags?: string[] }): Promise<number>
countOverdueTasks(filters: { projectIds?: string[]; assigneeId?: string; tags?: string[] }): Promise<number>

// === ENGINEER ===
findMyTasks(userId: string): Promise<Task[]>
findMyReports(userId: string): Promise<DailyReport[]>
countMyTodayReports(userId: string): Promise<number>
getMyWeeklyProgress(userId: string): Promise<DashboardWeeklyProgress[]>
getMyTasksByStatus(userId: string): Promise<Record<TaskStatus, number>>

// === SAFETY_OFFICER ===
getSafetyStatsByProjectIds(projectIds: string[]): Promise<SafetyDashboardStats>
countPendingSafetyApprovalsByProjectIds(projectIds: string[]): Promise<number>
findRecentViolationsByProjectIds(projectIds: string[]): Promise<SafetyViolation[]>
findSafetyTasksByProjectIds(projectIds: string[]): Promise<Task[]>
getWeeklySafetyProgressByProjectIds(projectIds: string[]): Promise<DashboardWeeklyProgress[]>

// === QUALITY_MANAGER ===
getQualityStatsByProjectIds(projectIds: string[]): Promise<QualityDashboardStats>
countPendingQualityApprovalsByProjectIds(projectIds: string[]): Promise<number>
findRecentQualityReportsByProjectIds(projectIds: string[]): Promise<QualityReport[]>
getWeeklyQualityProgressByProjectIds(projectIds: string[]): Promise<DashboardWeeklyProgress[]>

// === WAREHOUSE_KEEPER ===
getWarehouseStatsByProjectIds(projectIds: string[]): Promise<WarehouseDashboardStats>
findLowStockItemsByProjectIds(projectIds: string[]): Promise<WarehouseItem[]>
countPendingTransactionsByProjectIds(projectIds: string[]): Promise<number>
findRecentTransactionsByProjectIds(projectIds: string[]): Promise<WarehouseTransaction[]>
getWarehouseTrendDataByProjectIds(projectIds: string[]): Promise<WarehouseTrendDataPoint[]>

// === CLIENT ===
getProjectProgressByProjectIds(projectIds: string[]): Promise<ProjectProgressStats[]>
findRecentReportsForClientByProjectIds(projectIds: string[]): Promise<DailyReport[]>
getBudgetOverviewByProjectIds(projectIds: string[]): Promise<BudgetOverview[]>
getWeeklyProgressByProjectIds(projectIds: string[]): Promise<DashboardWeeklyProgress[]>

// === Shared ===
countPendingApprovals(filters?: { projectIds?: string[] }): Promise<{ taskCount: number; reportCount: number }>
findOverdueTasks(filters?: { projectIds?: string[]; limit?: number }): Promise<DashboardOverdueTask[]>
findRiskyProjects(filters?: { projectIds?: string[]; limit?: number }): Promise<DashboardRiskyProject[]>
findActiveMembers(filters?: { projectIds?: string[] }): Promise<DashboardActiveMember[]>
```

### 2.4. Types — Mở rộng DashboardStats

**File:** `packages/shared/src/types/entities.ts`

```typescript
// Safety Dashboard
interface SafetyDashboardStats {
  totalReports: number
  pendingApprovals: number
  totalViolations: number
  recentViolations: SafetyViolation[]
  thisWeekReports: number
  lastWeekReports: number
  violationRate: number
}

interface SafetyViolation {
  id: string
  date: Date
  location: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH"
  resolved: boolean
}

// Quality Dashboard
interface QualityDashboardStats {
  totalReports: number
  pendingApprovals: number
  passRate: number
  thisWeekReports: number
  lastWeekReports: number
  recentReports: QualityReport[]
}

// Warehouse Dashboard
interface WarehouseDashboardStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  pendingRequests: number
  thisMonthIn: number
  thisMonthOut: number
}

interface WarehouseTrendDataPoint {
  date: string
  itemId: string
  itemName: string
  quantity: number
  minQuantity: number
  maxQuantity: number
  unit: string
}

// Budget Overview
interface BudgetOverview {
  projectId: string
  projectName: string
  totalEstimated: number
  totalApproved: number
  totalSpent: number
  remaining: number
  completionRate: number
}

// Project Progress
interface ProjectProgressStats {
  projectId: string
  projectName: string
  progress: number
  startDate: Date
  endDate: Date
  daysRemaining: number
  status: ProjectStatus
  completionRate: number
}
```

Export tất cả types mới từ `packages/shared/src/index.ts`.

---

## 3. Backend — Notification System

### 3.1. Prisma model

```prisma
model Notification {
  id        String            @id @default(uuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  message   String
  data      Json?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_DEADLINE_SOON
  TASK_OVERDUE
  REPORT_PENDING_APPROVAL
  SAFETY_VIOLATION
  SAFETY_REPORT_PENDING
  QUALITY_REPORT_PENDING
  LOW_STOCK_ALERT
  TRANSACTION_PENDING
  PROJECT_PROGRESS_UPDATE
}
```

### 3.2. API Endpoints

```
GET  /notifications            → Lấy notifications (phân trang, lọc type + isRead)
GET  /notifications/count      → Badge count (isRead = false)
PATCH /notifications/:id/read  → Đánh dấu đã đọc
PATCH /notifications/read-all  → Đánh dấu tất cả đã đọc
```

### 3.3. NotificationService

**Auto-create rules:**

| Sự kiện | NotificationType | Gửi đến |
|---------|----------------|---------|
| Task được assign | TASK_ASSIGNED | assignee |
| Task sắp deadline (24h) | TASK_DEADLINE_SOON | assignee |
| Task quá hạn | TASK_OVERDUE | assignee, PM |
| Daily report chờ duyệt | REPORT_PENDING_APPROVAL | PM của project |
| Safety report chờ duyệt | SAFETY_REPORT_PENDING | SAFETY, ADMIN |
| Safety violation được tạo | SAFETY_VIOLATION | SAFETY, PM, ADMIN |
| Quality report chờ duyệt | QUALITY_REPORT_PENDING | QUALITY, ADMIN |
| Tồn kho < minQuantity | LOW_STOCK_ALERT | WAREHOUSE, PM |
| Warehouse transaction chờ duyệt | TRANSACTION_PENDING | WAREHOUSE |

**Cách implement:**
Gọi `NotificationService.create()` sau khi create/update trong: `TaskService`, `DailyReportService`, `SafetyReportService`, `QualityReportService`, `WarehouseService`.

### 3.4. Controller

```typescript
// GET /notifications
// Query params: page, limit, type?, isRead?
// Trả về: { data: Notification[], total, page, limit }

// GET /notifications/count
// Trả về: { count: number }

// PATCH /notifications/:id/read
// Trả về: { success: true }

// PATCH /notifications/read-all
// Trả về: { count: number }
```

---

## 4. Checklist triển khai

### Dashboard Backend

- [ ] Thêm types vào `packages/shared/src/types/entities.ts`
  - `SafetyDashboardStats`, `SafetyViolation`
  - `QualityDashboardStats`
  - `WarehouseDashboardStats`, `WarehouseTrendDataPoint`
  - `BudgetOverview[]`, `ProjectProgressStats[]`
- [ ] Export types mới từ `packages/shared/src/index.ts`
- [ ] Thêm `buildContext(userId)` vào `dashboard.service.ts`
- [ ] Thêm `getGeneralStats(ctx)` — stats TẤT CẢ roles đều thấy
- [ ] Thêm `getRoleSpecificStats(ctx)` — switch theo systemRole/projectRoles
- [ ] Thêm `getAdminStats(ctx)`, `getStaffStats(ctx)`
- [ ] Thêm `getPMStats(ctx)` — filter projects mình quản lý
- [ ] Thêm `getEngineerStats(ctx)` — filter task/báo cáo của mình
- [ ] Thêm `getSafetyStats(ctx)` — safety-specific data
- [ ] Thêm `getQualityStats(ctx)` — quality-specific data
- [ ] Thêm `getWarehouseStats(ctx)` — warehouse-specific data
- [ ] Thêm `getClientProjectStats(ctx)` — tiến độ + budget overview
- [ ] Thêm repository methods: `findUserById`, `getProjectRoles`, `getMemberProjectIds`
- [ ] Thêm repository methods: `countOpenTasks`, `countOverdueTasks` (với filters)
- [ ] Thêm repository methods: ENGINEER (`findMyTasks`, `findMyReports`, `countMyTodayReports`, `getMyWeeklyProgress`, `getMyTasksByStatus`)
- [ ] Thêm repository methods: SAFETY (`getSafetyStatsByProjectIds`, `countPendingSafetyApprovalsByProjectIds`, `findRecentViolationsByProjectIds`, `findSafetyTasksByProjectIds`, `getWeeklySafetyProgressByProjectIds`)
- [ ] Thêm repository methods: QUALITY (`getQualityStatsByProjectIds`, `countPendingQualityApprovalsByProjectIds`, `findRecentQualityReportsByProjectIds`, `getWeeklyQualityProgressByProjectIds`)
- [ ] Thêm repository methods: WAREHOUSE (`getWarehouseStatsByProjectIds`, `findLowStockItemsByProjectIds`, `countPendingTransactionsByProjectIds`, `findRecentTransactionsByProjectIds`, `getWarehouseTrendDataByProjectIds`)
- [ ] Thêm repository methods: CLIENT (`getProjectProgressByProjectIds`, `findRecentReportsForClientByProjectIds`, `getBudgetOverviewByProjectIds`, `getWeeklyProgressByProjectIds`)
- [ ] Sửa controller: nhận `userId` từ JWT, KHÔNG nhận projectId
- [ ] Sửa route: `GET /dashboard/stats` — không đổi path, không có params
- [ ] Test: gọi API với JWT của từng role → data khác nhau

### Notification Backend

- [ ] Migration: thêm Notification model + NotificationType enum
- [ ] Tạo `notification.controller.ts`
- [ ] Tạo `notification.service.ts`
- [ ] Tạo `notification.repository.ts`
- [ ] Thêm routes vào `routes/index.ts`
- [ ] Thêm `NotificationService.create()` vào `TaskService` (assign, deadline, overdue)
- [ ] Thêm `NotificationService.create()` vào `DailyReportService` (chờ duyệt)
- [ ] Thêm `NotificationService.create()` vào `SafetyReportService` (chờ duyệt, violation)
- [ ] Thêm `NotificationService.create()` vào `QualityReportService` (chờ duyệt)
- [ ] Thêm `NotificationService.create()` vào `WarehouseService` (low stock, transaction)
- [ ] Test: tạo task → notification record → GET /notifications/count tăng

---

## 5. Ma trận RBAC Dashboard — Backend data trả về

### Thống kê Cards

| Card | ADMIN | PM | SAFETY | ENGINEER | QUALITY | WAREHOUSE | CLIENT |
|------|-------|-----|--------|---------|---------|-----------|--------|
| Dự án | ✅ | ✅ (của mình) | ✅ (của mình) | ✅ (của mình) | ✅ (của mình) | ✅ (của mình) | ⚠️ Tiến độ |
| Task đang mở | ✅ | ✅ (team) | ✅ (AT tasks) | ✅ (mình) | ✅ | ❌ | ❌ |
| Task quá hạn | ✅ | ✅ | ⚠️ AT tasks | ✅ (mình) | ✅ | ❌ | ❌ |
| Báo cáo hôm nay | ✅ | ✅ | ✅ (AT) | ✅ | ✅ | ❌ | ⚠️ Xem |
| Safety | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Quality | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Kho vật tư | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Ngân sách | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (xem) |

### Widget data

| Widget | ADMIN | PM | SAFETY | ENGINEER | QUALITY | WAREHOUSE | CLIENT |
|--------|-------|-----|--------|---------|---------|-----------|--------|
| Biểu đồ tuần | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Task quá hạn | ✅ (tất cả) | ✅ (team) | ⚠️ AT tasks | ✅ (mình) | ✅ | ❌ | ❌ |
| Dự án rủi ro | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Hoạt động gần đây | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Hạn chế |
| Badge cần duyệt | ✅ (task+report) | ✅ | ✅ (Safety) | ✅ (task mình tạo) | ✅ (Quality) | ❌ | ❌ |
| Thành viên tích cực | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Báo cáo AT gần đây | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Báo cáo QC gần đây | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cảnh báo tồn kho thấp | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Tiến độ dự án | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ngân sách | ✅ (chi tiết) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (tổng quan) |
