# Kế hoạch triển khai — Module 4: Dashboard Nâng cao

## 1. Tổng quan

Module này mở rộng dashboard hiện có (trong `packages/api/src/modules/dashboard/` và `packages/web/src/features/dashboard/`) bằng 5 widget mới và biểu đồ tiến độ tuần. Trọng tâm là thêm truy vấn mới vào repository/service phía API và xây UI widget phía web.

---

## 2. Phân tích chi tiết từng yêu cầu

### 2.1. Widget "Cần duyệt" — Badge đỏ khi có approval pending (cho PM)

**Ý nghĩa:**
- Chỉ PM (vai trò `PROJECT_MANAGER`) mới thấy badge này.
- Badge hiển thị tổng số báo cáo + task đang chờ duyệt (`approvalStatus = PENDING`).

**Truy vấn cần:**
- Task chờ duyệt: `Task` có `approvalStatus = PENDING` AND `requiresApproval = true` AND `status NOT IN ('DONE', 'CANCELLED')`
- Báo cáo chờ duyệt: `DailyReport` có `approvalStatus = PENDING`

**Endpoint mới:**
- Dùng chung `GET /dashboard/stats` — thêm field `pendingApprovals: number` (tổng task + báo cáo chờ duyệt).
- Có thể tách riêng `pendingApprovals: { taskCount: number; reportCount: number }` để frontend hiển thị chi tiết hơn.

**UI:**
- Badge nhỏ bên cạnh tiêu đề "Dashboard" hoặc card tổng quan (không cần widget riêng).
- Số > 0 → badge đỏ (`bg-red-500`), hiển thị số lượng.

### 2.2. Widget "Task quá hạn" — Danh sách task overdue

**Ý nghĩa:**
- Hiển thị top task đã quá hạn (quá hạn hơn 2 ngày so với hôm nay), chưa done/cancelled.
- Có thể lọc theo dự án hoặc hiển thị toàn hệ thống.

**Truy vấn cần:**
```sql
SELECT t.id, t.title, t.due_date, t.priority,
       p.name as project_name,
       u.name as assignee_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.due_date < CURRENT_DATE - 2
  AND t.status NOT IN ('DONE', 'CANCELLED')
ORDER BY t.due_date ASC
LIMIT 10
```

**API response:**
```typescript
overdueTasks: Array<{
  id: string
  title: string
  dueDate: string
  priority: TaskPriority
  projectName: string
  assigneeName: string | null
  daysOverdue: number  // tính từ dueDate đến hôm nay
}>
```

**UI:**
- Widget card riêng, scroll nếu > 5 item.
- Mỗi item: tên task, dự án, người được giao, số ngày quá hạn (màu đỏ).
- Click vào item → điều hướng đến trang chi tiết task.

### 2.3. Widget "Dự án rủi ro" — Top 5 dự án có nhiều task quá hạn

**Ý nghĩa:**
- Dự án có > 30% tasks đang overdue → cảnh báo rủi ro cao.

**Truy vấn cần:**
```sql
SELECT p.id, p.name,
       COUNT(*) as totalTasks,
       SUM(CASE WHEN t.due_date < CURRENT_DATE
                AND t.status NOT IN ('DONE', 'CANCELLED') THEN 1 ELSE 0 END) as overdueTasks,
       ROUND(SUM(CASE WHEN t.due_date < CURRENT_DATE
                      AND t.status NOT IN ('DONE', 'CANCELLED') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as overdueRate
FROM projects p
JOIN tasks t ON t.project_id = p.id
WHERE p.status = 'ACTIVE'
GROUP BY p.id, p.name
HAVING overdueTasks > 0
ORDER BY overdueRate DESC, overdueTasks DESC
LIMIT 5
```

**API response:**
```typescript
riskyProjects: Array<{
  id: string
  name: string
  totalTasks: number
  overdueTasks: number
  overdueRate: number  // 0-100, %
}>
```

**UI:**
- Widget card riêng.
- Mỗi item: tên dự án, progress bar (% overdue), số task overdue / tổng.
- Có thể dùng màu: >50% đỏ, 30-50% cam, <30% vàng.

### 2.4. Widget "Thành viên tích cực" — Top 5 người hoạt động tuần này

**Ý nghĩa:**
- Dựa vào bảng `audit_logs`, đếm số hành động của mỗi user trong 7 ngày gần nhất.

**Truy vấn cần:**
```sql
SELECT u.id, u.name, u.avatar_url,
       COUNT(*) as actionCount
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL 7 DAY
  AND u.is_active = true
GROUP BY u.id, u.name, u.avatar_url
ORDER BY actionCount DESC
LIMIT 5
```

**API response:**
```typescript
activeMembers: Array<{
  id: string
  name: string
  avatarUrl: string | null
  actionCount: number
}>
```

**UI:**
- Widget card riêng, hiển thị avatar + tên + số hành động.
- Top 1 có thể highlight bằng icon ⭐.

### 2.5. Biểu đồ tiến độ tuần — Bar chart 7 ngày

**Ý nghĩa:**
- Hiển thị tổng task, task hoàn thành, task mới cho 7 ngày gần nhất (không tính hôm nay nếu chưa có dữ liệu).

**Truy vấn cần:**
```sql
-- Lấy task tạo trong 7 ngày
SELECT DATE(created_at) as date, COUNT(*) as newTasks
FROM tasks
WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY
  AND created_at < CURRENT_DATE + INTERVAL 1 DAY
GROUP BY DATE(created_at)

-- Lấy task hoàn thành trong 7 ngày
SELECT DATE(completed_at) as date, COUNT(*) as completedTasks
FROM tasks
WHERE completed_at >= CURRENT_DATE - INTERVAL 6 DAY
  AND completed_at < CURRENT_DATE + INTERVAL 1 DAY
  AND completed_at IS NOT NULL
GROUP BY DATE(completed_at)

-- Lấy tổng task (đang active) mỗi ngày — có thể dùng cached count
SELECT DATE(created_at) as date, COUNT(*) as totalTasks
FROM tasks
WHERE created_at >= CURRENT_DATE - INTERVAL 6 DAY
  AND created_at < CURRENT_DATE + INTERVAL 1 DAY
GROUP BY DATE(created_at)
```

**API response:**
```typescript
weeklyProgress: Array<{
  date: string        // "2026-04-01" — 7 ngày gần nhất
  totalTasks: number  // tổng task (tạo trong ngày)
  completedTasks: number
  newTasks: number
}>
```

**UI:**
- Dùng chart library đã có trong project (kiểm tra package.json xem có recharts không).
- Bar chart với 3 bar cho mỗi ngày: total (xám), completed (xanh), new (cam).
- Responsive, hiển thị ngày bên dưới.

---

## 3. Thứ tự triển khai đề xuất

### Phase 1: Backend — Mở rộng types & repository

**Bước 1:** Cập nhật `DashboardStats` trong `packages/shared/src/types/entities.ts`

Thêm các field mới:
```typescript
export interface DashboardStats {
  // ... existing fields ...

  // NEW — approvals
  pendingApprovals: {
    taskCount: number
    reportCount: number
  }

  // NEW — widgets
  overdueTasks: OverdueTaskItem[]
  riskyProjects: RiskyProjectItem[]
  activeMembers: ActiveMemberItem[]
  weeklyProgress: WeeklyProgressItem[]
}
```

**Bước 2:** Thêm repository methods trong `packages/api/src/modules/dashboard/dashboard.repository.ts`

Thêm 5 hàm mới:
```typescript
countPendingApprovals()
findOverdueTasks(limit: number)
findRiskyProjects(limit: number)
findActiveMembers(limit: number)
findWeeklyProgress()
```

**Bước 3:** Cập nhật service trong `packages/api/src/modules/dashboard/dashboard.service.ts`

- Gọi tất cả repository methods mới bằng `Promise.all()`
- Map dữ liệu về đúng shape cho `DashboardStats`

### Phase 2: Frontend — Cập nhật API & types

**Bước 4:** Cập nhật `dashboardApi.ts` trong `packages/web/src/features/dashboard/api/`

- Type `DashboardResponse` tự động nhận type mới từ shared (không cần sửa gì nếu shared đã update).

**Bước 5:** Tạo component `PendingApprovalBadge` (hoặc tích hợp vào header)

- Nếu `pendingApprovals.taskCount + pendingApprovals.reportCount > 0` → hiển thị badge đỏ.

### Phase 3: Frontend — Tạo widget components

**Bước 6:** Tạo 4 widget components mới

- `OverdueTasksWidget.tsx`
- `RiskyProjectsWidget.tsx`
- `ActiveMembersWidget.tsx`
- `WeeklyProgressChart.tsx`

**Bước 7:** Cập nhật `DashboardPage.tsx`

- Import và render 4 widget mới + badge approval.
- Layout: grid 2-3 cột tùy kích thước màn hình.
- Thêm state loading/error cho từng widget (hoặc dùng chung `isLoading`).

---

## 4. Cấu trúc file dự kiến

```
packages/api/src/modules/dashboard/
├── dashboard.controller.ts   (không đổi)
├── dashboard.routes.ts        (không đổi)
├── dashboard.service.ts       ✓ cập nhật — gọi thêm data
└── dashboard.repository.ts    ✓ cập nhật — thêm 5 truy vấn

packages/shared/src/types/
└── entities.ts                ✓ cập nhật — mở rộng DashboardStats

packages/web/src/features/dashboard/
├── api/
│   └── dashboardApi.ts        (không đổi)
├── pages/
│   └── DashboardPage.tsx      ✓ cập nhật — thêm widgets
└── components/
    ├── OverdueTasksWidget.tsx     ✗ mới
    ├── RiskyProjectsWidget.tsx    ✗ mới
    ├── ActiveMembersWidget.tsx    ✗ mới
    └── WeeklyProgressChart.tsx    ✗ mới
```

---

## 5. Phụ thuộc & Rủi ro

| Rủi ro | Đề xuất xử lý |
|---|---|
| Performance: nhiều truy vấn trong 1 request | Dùng `Promise.all()` ở service, tách riêng `GET /dashboard/extended` nếu cần |
| audit_logs có thể ít data | Mock data tạm trong dev cho đến khi có đủ data thực |
| Chart library chưa có | Kiểm tra `packages/web/package.json`; nếu chưa có thì cài `recharts` |
| Task & Report approval logic khác nhau | Đếm riêng, sum khi hiển thị badge |

---

## 6. Checklist triển khai

- [ ] Cập nhật `DashboardStats` type (shared)
- [ ] Thêm 5 repository methods (backend)
- [ ] Cập nhật `dashboardService.getStats()` (backend)
- [ ] Tạo `PendingApprovalBadge` component (frontend)
- [ ] Tạo `OverdueTasksWidget` component (frontend)
- [ ] Tạo `RiskyProjectsWidget` component (frontend)
- [ ] Tạo `ActiveMembersWidget` component (frontend)
- [ ] Tạo `WeeklyProgressChart` component (frontend)
- [ ] Cập nhật `DashboardPage` render tất cả widgets
- [ ] Test từng widget với data thực / mock
- [ ] Đảm bảo UI responsive trên mobile