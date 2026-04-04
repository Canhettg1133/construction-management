# PHASE 4B: Frontend — Dashboard UI role-based + NotificationBell

**Thời gian ước tính:** 2–3 ngày

**Tiền đề:** Phase 4A đã hoàn thành (Dashboard API + Notification backend)

---

## 0. Quyết định đã resolved

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | Dashboard có project context? | **A** — Dashboard riêng, KHÔNG có projectId |
| 2 | Auto-refresh interval? | **B** — 30 giây, `refetchIntervalInBackground: false` |
| 3 | Badge notification? | **A** — Có notification bell 🔔 trên header |
| 4 | WAREHOUSE chart? | **C** — Biểu đồ cảnh báo tồn kho (line chart với ngưỡng) |

---

## 1. Tổng quan tình trạng hiện tại

### 1.1. Dashboard page hiện tại

```
DashboardPage.tsx
├── Stats Cards Grid (4 cards): Dự án | Task đang mở | Task quá hạn | Báo cáo hôm nay
├── Task Status Breakdown
├── Nhân sự Card
├── WeeklyProgressChart
├── Widgets Grid (3 cols): OverdueTasks | RiskyProjects | ActiveMembers
└── Recent Activity
```

### 1.2. API endpoint mới (từ Phase 4A)

```
GET /dashboard/stats → DashboardStats (đã filter theo role)
GET /notifications?page&limit&type&isRead → Notification[]
GET /notifications/count → { count }
```

---

## 2. Frontend — Dashboard UI role-based

### 2.1. File structure

```
packages/web/src/features/dashboard/
├── pages/
│   └── DashboardPage.tsx              ← MODIFY: dynamic layout theo role
├── api/
│   └── dashboardApi.ts               ← MODIFY: KHÔNG đổi interface (API không có params)
├── hooks/
│   ├── useDashboard.ts              ← MODIFY: refetchInterval 30000ms
│   └── useDashboardRole.ts         ← NEW: xác định role từ authStore
└── components/
    ├── common/
    │   ├── StatsCardGrid.tsx        ← NEW: wrapper grid 4 cols, hiển thị theo role
    │   └── PendingBadge.tsx         ← MODIFY: hiển thị theo role
    ├── widgets/
    │   ├── SafetyStatsWidget.tsx         ← NEW: SAFETY + PM + QUALITY + ADMIN
    │   ├── QualityStatsWidget.tsx       ← NEW: tất cả roles
    │   ├── WarehouseStatsWidget.tsx     ← NEW: WAREHOUSE + PM + QUALITY + ADMIN
    │   ├── WarehouseTrendChart.tsx      ← NEW: line chart với ngưỡng
    │   ├── MyTasksWidget.tsx             ← NEW: ENGINEER
    │   ├── MyReportsWidget.tsx           ← NEW: ENGINEER
    │   ├── LowStockAlertsWidget.tsx    ← NEW: WAREHOUSE
    │   ├── PendingTransactionsWidget.tsx  ← NEW: WAREHOUSE
    │   ├── RecentTransactionsWidget.tsx   ← NEW: WAREHOUSE
    │   ├── SafetyViolationsWidget.tsx    ← NEW: SAFETY
    │   ├── PendingSafetyApprovalsWidget.tsx ← NEW: SAFETY
    │   ├── QualityReportsWidget.tsx    ← NEW: QUALITY
    │   ├── WarehouseOverviewWidget.tsx ← NEW: QUALITY
    │   └── ClientStatsWidget.tsx        ← NEW: CLIENT
    ├── overdue/
    │   └── OverdueTasksWidget.tsx        ← MODIFY: filter theo role, bỏ projectId
    ├── risky/
    │   └── RiskyProjectsWidget.tsx      ← MODIFY: bỏ projectId
    └── recent/
        └── RecentActivity.tsx              ← MODIFY: bỏ projectId

packages/web/src/shared/components/
└── NotificationBell.tsx                 ← NEW: bell icon trên header
    NotificationDropdown.tsx              ← NEW: dropdown notification list
```

### 2.2. useDashboardRole hook

**File:** `packages/web/src/features/dashboard/hooks/useDashboardRole.ts`

```typescript
// Lấy systemRole + projectRoles từ authStore
// KHÔNG cần projectId
interface DashboardRoleContext {
  systemRole: SystemRole | null
  projectRoles: ProjectRole[]
  isAdmin: boolean
  isPM: boolean
  isEngineer: boolean
  isSafety: boolean
  isQuality: boolean
  isWarehouse: boolean
  isClient: boolean
  isViewer: boolean
  // Widget visibility flags
  showTaskStats: boolean
  showSafetyStats: boolean
  showQualityStats: boolean
  showWarehouseStats: boolean
  showBudgetStats: boolean
  showOverdueTasks: boolean
  showRiskyProjects: boolean
  showPendingApprovals: boolean
  showActiveMembers: boolean
}

export function useDashboardRole(): DashboardRoleContext
```

### 2.3. useDashboard hook

**File:** `packages/web/src/features/dashboard/hooks/useDashboard.ts`

```typescript
// HIỆN TẠI:
const { data } = useQuery({
  queryKey: ["dashboard", "stats"],
  queryFn: getDashboardStats,
  refetchInterval: 15000,
})

// MỚI:
const { data, isLoading } = useQuery({
  queryKey: ["dashboard", "stats"],
  queryFn: getDashboardStats,
  refetchInterval: 30000,
  refetchIntervalInBackground: false,  // không refetch khi tab không active
})
```

### 2.4. Widget permission matrix

| Widget | ADMIN | PM | ENGINEER | SAFETY | QUALITY | WAREHOUSE | CLIENT |
|--------|-------|-----|---------|--------|---------|-----------|--------|
| GeneralStatsCards (4 cards) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SafetyStatsWidget | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| QualityStatsWidget | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WarehouseStatsWidget | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| BudgetWidget | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| OverdueTasksWidget (all) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MyTasksWidget | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SafetyTasksWidget | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| QualityTasksWidget | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| LowStockAlertsWidget | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| WarehouseTrendChart | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| PendingApprovalsBadge | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ClientStatsWidget | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| RecentActivity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 2.5. Widget code

#### StatsCardGrid — wrapper grid 4 cols

```tsx
// packages/web/src/features/dashboard/components/common/StatsCardGrid.tsx

export function StatsCardGrid({ children }: { children: React.ReactNode }) {
  const role = useDashboardRole()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {(role.isAdmin || role.isPM) && (
        <>
          <StatsCard title="Tổng dự án" value={role.stats?.projectCount} icon={<FolderKanban />} />
          <StatsCard title="Task đang mở" value={role.stats?.openTaskCount} icon={<CheckSquare />} />
          <StatsCard title="Task quá hạn" value={role.stats?.overdueTaskCount} icon={<AlertTriangle />} variant={role.stats?.overdueTaskCount > 0 ? "danger" : undefined} />
          <StatsCard title="Báo cáo hôm nay" value={role.stats?.todayReportCount} icon={<FileText />} />
        </>
      )}
      {children}
    </div>
  )
}
```

#### PendingBadge — hiển thị theo role

```tsx
// packages/web/src/features/dashboard/components/common/PendingBadge.tsx

export function PendingBadge() {
  const role = useDashboardRole()
  const { data } = useDashboard()

  if (role.isAdmin || role.isPM) {
    const total = (data?.pendingApprovals?.taskCount ?? 0) +
                  (data?.pendingApprovals?.reportCount ?? 0)
    return total > 0 ? <Badge>{total} cần duyệt</Badge> : null
  }

  if (role.isSafety) {
    return data?.pendingSafetyApprovals
      ? <Badge variant="warning">{data.pendingSafetyApprovals} AT cần duyệt</Badge>
      : null
  }

  if (role.isQuality) {
    return data?.pendingQualityApprovals
      ? <Badge variant="warning">{data.pendingQualityApprovals} QC cần duyệt</Badge>
      : null
  }

  if (role.isEngineer) {
    const myPending = data?.myPendingTasks?.length ?? 0
    return myPending > 0 ? <Badge>{myPending} đang chờ duyệt</Badge> : null
  }

  return null  // CLIENT, WAREHOUSE, VIEWER không thấy badge
}
```

#### OverdueTasksWidget — filter theo role

```tsx
// packages/web/src/features/dashboard/components/overdue/OverdueTasksWidget.tsx

export function OverdueTasksWidget() {
  const role = useDashboardRole()
  const { data } = useDashboard()

  // ADMIN/PM: thấy tất cả overdue tasks
  if (role.isAdmin || role.isPM) {
    return (
      <Widget title="Task quá hạn" actions={<Link to="/tasks?filter=overdue">Xem tất cả</Link>}>
        <TaskList tasks={data?.overdueTasks ?? []} />
      </Widget>
    )
  }

  // SAFETY: chỉ thấy tasks liên quan an toàn
  if (role.isSafety) {
    return (
      <Widget title="Task AT quá hạn">
        <TaskList tasks={data?.safetyTasks?.filter(t => t.overdue) ?? []} />
      </Widget>
    )
  }

  // ENGINEER: chỉ thấy task của mình
  if (role.isEngineer) {
    return (
      <Widget title="Task của tôi quá hạn">
        <TaskList tasks={data?.myTasks?.filter(t => t.overdue) ?? []} />
      </Widget>
    )
  }

  // QUALITY: thấy task QC quá hạn
  if (role.isQuality) {
    return (
      <Widget title="Task QC quá hạn">
        <TaskList tasks={data?.qualityTasks?.filter(t => t.overdue) ?? []} />
      </Widget>
    )
  }

  return null
}
```

### 2.6. Widgets mới

#### SafetyStatsWidget

```tsx
// packages/web/src/features/dashboard/components/widgets/SafetyStatsWidget.tsx

export function SafetyStatsWidget() {
  const role = useDashboardRole()
  const { data } = useDashboard()

  if (!role.showSafetyStats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="Báo cáo AT tuần này"
        value={data?.safetyStats?.thisWeekReports}
        trend={calculateTrend(data?.safetyStats?.thisWeekReports, data?.safetyStats?.lastWeekReports)}
      />
      <StatsCard
        title="Chờ ký duyệt"
        value={data?.pendingSafetyApprovals}
        variant="warning"
      />
      <StatsCard
        title="Vi phạm tuần này"
        value={data?.safetyStats?.totalViolations}
        variant={data?.safetyStats?.totalViolations > 0 ? "danger" : "success"}
      />
      <StatsCard
        title="Tỷ lệ tuân thủ"
        value={`${100 - (data?.safetyStats?.violationRate ?? 0)}%`}
        variant="success"
      />
    </div>
  )
}
```

#### QualityStatsWidget

```tsx
// packages/web/src/features/dashboard/components/widgets/QualityStatsWidget.tsx

export function QualityStatsWidget() {
  const { data } = useDashboard()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="Báo cáo QC tuần này"
        value={data?.qualityStats?.thisWeekReports}
        trend={calculateTrend(data?.qualityStats?.thisWeekReports, data?.qualityStats?.lastWeekReports)}
      />
      <StatsCard title="Chờ nghiệm thu" value={data?.pendingQualityApprovals} variant="warning" />
      <StatsCard title="Tỷ lệ đạt" value={`${data?.qualityStats?.passRate ?? 0}%`} variant="success" />
      <StatsCard title="Báo cáo gần đây" value={data?.qualityReports?.length} />
    </div>
  )
}
```

#### WarehouseStatsWidget

```tsx
// packages/web/src/features/dashboard/components/widgets/WarehouseStatsWidget.tsx

export function WarehouseStatsWidget() {
  const role = useDashboardRole()
  const { data } = useDashboard()

  if (!role.showWarehouseStats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard title="Vật tư trong kho" value={data?.warehouseStats?.totalItems} />
      <StatsCard
        title="Cảnh báo tồn kho thấp"
        value={data?.warehouseStats?.lowStockCount}
        variant={data?.warehouseStats?.lowStockCount > 0 ? "warning" : "success"}
      />
      <StatsCard title="Chờ duyệt yêu cầu" value={data?.pendingTransactions} variant="warning" />
      <StatsCard title="Giá trị tồn kho" value={formatCurrency(data?.warehouseStats?.totalValue)} />
    </div>
  )
}
```

#### WarehouseTrendChart — Biểu đồ cảnh báo tồn kho

```tsx
// packages/web/src/features/dashboard/components/widgets/WarehouseTrendChart.tsx

// recharts LineChart
// - X axis: 7 ngày gần nhất
// - Y axis: số lượng tồn kho
// - Mỗi item là 1 line, màu khác nhau
// - ReferenceArea: ngưỡng min (đỏ mờ), ngưỡng max (vàng mờ)
// - Khi gần ngưỡng → line đổi màu (normal → warning → danger)
// - Tooltip: ngày, tên vật tư, số lượng, % so với ngưỡng
// - Data từ: data?.warehouseTrendData (top 5 items, đã có từ Phase 4A)

interface TrendDataPoint {
  date: string
  [itemName: string]: number | string  // dynamic: mỗi item là 1 field
}

export function WarehouseTrendChart() {
  const { data } = useDashboard()
  const trendItems = data?.warehouseTrendData ?? []

  return (
    <Card title="Xu hướng tồn kho">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={transformToChartData(trendItems)}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<WarehouseTooltip />} />
          <Legend />
          {trendItems.map((item, i) => (
            <Line
              key={item.itemId}
              type="monotone"
              dataKey={item.itemName}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
          {/* Ngưỡng min — vùng đỏ mờ phía dưới */}
          <ReferenceArea y1={0} y2={100} fill="red" fillOpacity={0.05} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

#### ClientStatsWidget

```tsx
// packages/web/src/features/dashboard/components/widgets/ClientStatsWidget.tsx

export function ClientStatsWidget() {
  const { data } = useDashboard()

  return (
    <div className="space-y-4">
      {data?.projectProgress?.map((project) => (
        <Card key={project.projectId}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{project.projectName}</span>
            <span className="text-sm text-gray-500">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} />
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Còn {project.daysRemaining} ngày</span>
            <span>Đạt {project.completionRate}% công việc</span>
          </div>
        </Card>
      ))}

      <Card title="Ngân sách">
        <BudgetSummary data={data?.budgetOverview} />
      </Card>
    </div>
  )
}
```

### 2.7. DashboardPage

**File:** `packages/web/src/features/dashboard/pages/DashboardPage.tsx`

```tsx
export default function DashboardPage() {
  const role = useDashboardRole()
  const { data, isLoading } = useDashboard()

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-6">
      <DashboardHeader>
        <PendingBadge />
      </DashboardHeader>

      <StatsCardGrid>
        <SafetyStatsWidget />
        <QualityStatsWidget />
        <WarehouseStatsWidget />
      </StatsCardGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TaskStatusBreakdown data={data?.tasksByStatus} />
        <WeeklyProgressChart data={data?.weeklyProgress} />
        {/* WAREHOUSE: thay biểu đồ tuần bằng biểu đồ tồn kho */}
        {role.isWarehouse && <WarehouseTrendChart />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ADMIN/PM: đầy đủ widgets */}
        {(role.isAdmin || role.isPM) && (
          <>
            <OverdueTasksWidget />
            <RiskyProjectsWidget />
            <ActiveMembersWidget />
          </>
        )}

        {/* ENGINEER: tasks của mình */}
        {role.isEngineer && (
          <>
            <MyTasksWidget data={data?.myTasks} />
            <MyReportsWidget data={data?.myReports} />
            <TaskStatusBreakdown data={data?.myTasksByStatus} />
          </>
        )}

        {/* SAFETY: safety overview */}
        {role.isSafety && (
          <>
            <SafetyViolationsWidget data={data?.safetyViolations} />
            <PendingSafetyApprovalsWidget data={data?.pendingSafetyApprovals} />
          </>
        )}

        {/* QUALITY: quality overview */}
        {role.isQuality && (
          <>
            <QualityReportsWidget data={data?.qualityReports} />
            <WarehouseOverviewWidget data={data?.warehouseStats} />
          </>
        )}

        {/* WAREHOUSE: warehouse */}
        {role.isWarehouse && (
          <>
            <LowStockAlertsWidget data={data?.lowStockItems} />
            <PendingTransactionsWidget data={data?.pendingTransactions} />
            <RecentTransactionsWidget data={data?.recentTransactions} />
          </>
        )}

        {/* CLIENT: progress + budget */}
        {role.isClient && (
          <ClientStatsWidget />
        )}
      </div>

      <RecentActivity />
    </div>
  )
}
```

---

## 3. NotificationBell — Header component

### 3.1. File structure

```
packages/web/src/shared/components/
├── NotificationBell.tsx          ← Bell icon + badge
└── NotificationDropdown.tsx      ← Dropdown list notifications
```

### 3.2. NotificationBell

```tsx
// packages/web/src/shared/components/NotificationBell.tsx

// Icon chuông 🔔 trên header (AppLayout)
// - Số badge = GET /notifications/count → count
// - Click mở NotificationDropdown
// - Mỗi role thấy notification khác nhau (filter theo NotificationType phù hợp)

// Props:
// - variant: "header" | "sidebar" (vị trí đặt)
// - className: string
```

### 3.3. NotificationDropdown

```tsx
// packages/web/src/shared/components/NotificationDropdown.tsx

// Dropdown hiển thị danh sách notifications
// - Header: "Thông báo" + "Đánh dấu tất cả đã đọc"
// - List: notification items với icon theo type
// - Empty state: "Không có thông báo nào"
// - Click item → điều hướng đến trang tương ứng
// - Click nút "Xem tất cả" → /notifications
```

### 3.4. Notification API

```typescript
// packages/web/src/shared/api/notificationApi.ts

export const getNotifications = async (params?: {
  page?: number; limit?: number; type?: NotificationType; isRead?: boolean
}) => {
  return apiClient.get<PaginatedResponse<Notification>>("/notifications", { params })
}

export const getNotificationCount = async () => {
  return apiClient.get<{ count: number }>("/notifications/count")
}

export const markAsRead = async (id: string) => {
  return apiClient.patch(`/notifications/${id}/read`)
}

export const markAllAsRead = async () => {
  return apiClient.patch("/notifications/read-all")
}
```

### 3.5. Thêm vào AppLayout

```tsx
// packages/web/src/shared/components/Layout/AppLayout.tsx

// Thêm NotificationBell vào header bên cạnh user avatar
<header>
  <NotificationBell />
  <UserMenu />
</header>
```

---

## 4. Checklist triển khai

### Dashboard UI

- [ ] Tạo `useDashboardRole.ts` — hook xác định role từ authStore
- [ ] Cập nhật `useDashboard.ts` — refetchInterval 30000, refetchIntervalInBackground false
- [ ] Tạo `StatsCardGrid.tsx` — wrapper grid 4 cols, hiển thị theo role
- [ ] Cập nhật `PendingBadge.tsx` — hiển thị theo role
- [ ] Cập nhật `OverdueTasksWidget.tsx` — filter theo role, bỏ projectId
- [ ] Cập nhật `RiskyProjectsWidget.tsx` — bỏ projectId
- [ ] Cập nhật `RecentActivity.tsx` — bỏ projectId
- [ ] Tạo `SafetyStatsWidget.tsx`
- [ ] Tạo `QualityStatsWidget.tsx`
- [ ] Tạo `WarehouseStatsWidget.tsx`
- [ ] Tạo `WarehouseTrendChart.tsx`
- [ ] Tạo `MyTasksWidget.tsx` (ENGINEER)
- [ ] Tạo `MyReportsWidget.tsx` (ENGINEER)
- [ ] Tạo `LowStockAlertsWidget.tsx` (WAREHOUSE)
- [ ] Tạo `PendingTransactionsWidget.tsx` (WAREHOUSE)
- [ ] Tạo `RecentTransactionsWidget.tsx` (WAREHOUSE)
- [ ] Tạo `SafetyViolationsWidget.tsx` (SAFETY)
- [ ] Tạo `PendingSafetyApprovalsWidget.tsx` (SAFETY)
- [ ] Tạo `QualityReportsWidget.tsx` (QUALITY)
- [ ] Tạo `WarehouseOverviewWidget.tsx` (QUALITY)
- [ ] Tạo `ClientStatsWidget.tsx` (CLIENT)
- [ ] Cập nhật `DashboardPage.tsx` — dynamic layout theo role
- [ ] Cập nhật `DashboardSkeleton.tsx` — loading state hợp lý

### Notification UI

- [ ] Tạo notification API: `getNotifications`, `getNotificationCount`, `markAsRead`, `markAllAsRead`
- [ ] Tạo `NotificationBell.tsx` — bell icon trên header
- [ ] Tạo `NotificationDropdown.tsx` — dropdown list notifications
- [ ] Thêm NotificationBell vào `AppLayout.tsx` header
- [ ] Test: đăng nhập với từng role → thấy widgets khác nhau
- [ ] Test: tạo task → notification → bell badge tăng

---

## 5. Ma trận RBAC Dashboard — Frontend widgets

| Widget | ADMIN | PM | ENGINEER | SAFETY | QUALITY | WAREHOUSE | CLIENT |
|--------|-------|-----|---------|--------|---------|-----------|--------|
| Stats cards tổng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SafetyStats | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| QualityStats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WarehouseStats | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| BudgetWidget | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| OverdueTasks (all) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MyTasksWidget | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SafetyTasksWidget | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| QualityTasksWidget | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| LowStockAlerts | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| WarehouseTrendChart | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| PendingBadge | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ClientStatsWidget | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| RecentActivity | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
