# PHASE 4B: Dashboard UI role-based + NotificationBell

## Ngữ cảnh
App xây dựng, 3 packages. Phase 4A đã xong: Dashboard API + Notification backend.
Frontend: React + TypeScript + TailwindCSS + recharts.
Roles: ADMIN, STAFF, CLIENT (systemRole) + PM/ENGINEER/SAFETY/QUALITY/WAREHOUSE/CLIENT/VIEWER (projectRole).

## Mục tiêu
Dashboard page hiển thị widgets KHÁC NHAU cho mỗi role.
Thêm notification bell 🔔 trên header.
Thêm WarehouseTrendChart.

## useDashboardRole hook

```typescript
// packages/web/src/features/dashboard/hooks/useDashboardRole.ts
// Lấy systemRole + projectRoles từ authStore
// KHÔNG cần projectId
export function useDashboardRole(): DashboardRoleContext
// Trả về: isAdmin, isPM, isEngineer, isSafety, isQuality, isWarehouse, isClient, isViewer
// Trả về: widget visibility flags
```

## useDashboard hook — thay đổi

```typescript
// refetchInterval: 30000, refetchIntervalInBackground: false
```

## Widget permission matrix

| Widget | ADMIN | PM | ENGINEER | SAFETY | QUALITY | WAREHOUSE | CLIENT |
|--------|-------|-----|---------|--------|---------|-----------|--------|
| Stats cards tổng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SafetyStats | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| QualityStats | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WarehouseStats | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| OverdueTasks (all) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MyTasksWidget | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SafetyTasksWidget | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| QualityTasksWidget | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| LowStockAlerts | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| WarehouseTrendChart | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| PendingBadge | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ClientStatsWidget | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## DashboardPage — cấu trúc

```tsx
// packages/web/src/features/dashboard/pages/DashboardPage.tsx
export default function DashboardPage() {
  const role = useDashboardRole()
  const { data, isLoading } = useDashboard()

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
        <TaskStatusBreakdown />
        <WeeklyProgressChart />
        {role.isWarehouse && <WarehouseTrendChart />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ADMIN/PM: OverdueTasks, RiskyProjects, ActiveMembers */}
        {/* ENGINEER: MyTasks, MyReports */}
        {/* SAFETY: SafetyViolations, PendingSafetyApprovals */}
        {/* QUALITY: QualityReports, WarehouseOverview */}
        {/* WAREHOUSE: LowStockAlerts, PendingTransactions, RecentTransactions */}
        {/* CLIENT: ClientStatsWidget */}
      </div>

      <RecentActivity />
    </div>
  )
}
```

## NotificationBell

```tsx
// packages/web/src/shared/components/NotificationBell.tsx
// Bell icon trên header (AppLayout)
// - Badge = GET /notifications/count
// - Click = DropdownNotification (list notifications)
// - Filter notification theo role
```

## WarehouseTrendChart

```tsx
// packages/web/src/features/dashboard/components/widgets/WarehouseTrendChart.tsx
// recharts LineChart
// - X: 7 ngày, Y: số lượng tồn kho
// - 1 line mỗi top item, màu khác nhau
// - ReferenceArea: ngưỡng min (đỏ mờ), ngưỡng max (vàng mờ)
// - Tooltip: ngày, tên vật tư, số lượng, % so với ngưỡng
```

## File cần tạo mới

- `hooks/useDashboardRole.ts`
- `components/common/StatsCardGrid.tsx`
- `components/widgets/SafetyStatsWidget.tsx`
- `components/widgets/QualityStatsWidget.tsx`
- `components/widgets/WarehouseStatsWidget.tsx`
- `components/widgets/WarehouseTrendChart.tsx`
- `components/widgets/MyTasksWidget.tsx` (ENGINEER)
- `components/widgets/MyReportsWidget.tsx` (ENGINEER)
- `components/widgets/LowStockAlertsWidget.tsx` (WAREHOUSE)
- `components/widgets/PendingTransactionsWidget.tsx` (WAREHOUSE)
- `components/widgets/RecentTransactionsWidget.tsx` (WAREHOUSE)
- `components/widgets/SafetyViolationsWidget.tsx` (SAFETY)
- `components/widgets/PendingSafetyApprovalsWidget.tsx` (SAFETY)
- `components/widgets/QualityReportsWidget.tsx` (QUALITY)
- `components/widgets/WarehouseOverviewWidget.tsx` (QUALITY)
- `components/widgets/ClientStatsWidget.tsx` (CLIENT)
- `shared/components/NotificationBell.tsx`
- `shared/components/NotificationDropdown.tsx`
- `shared/api/notificationApi.ts`

## File cần sửa

- `DashboardPage.tsx`
- `useDashboard.ts`
- `PendingBadge.tsx`
- `OverdueTasksWidget.tsx`
- `RiskyProjectsWidget.tsx`
- `RecentActivity.tsx`
- `AppLayout.tsx` (thêm NotificationBell)

Đọc file hiện tại TRƯỚC KHI sửa: `DashboardPage.tsx`, `useDashboard.ts`, `AppLayout.tsx`.
