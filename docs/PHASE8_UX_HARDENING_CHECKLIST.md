# Giai đoạn 8 — UX Hardening Checklist (Desktop + Mobile Web)

Mục tiêu: đảm bảo hệ thống dùng được trong bối cảnh thực tế, đặc biệt mobile cho Site Engineer.

## 1) Desktop Priority Flows
- [x] Dashboard: số liệu đọc nhanh, không quá tải. ✅ (DashboardPage — stat cards + progress bars)
- [x] Project management: list/filter/detail rõ ràng. ✅ (ProjectListPage + ProjectDetailPage)
- [x] User management: tạo/sửa/khóa user không rườm rà. ✅ (UserManagementPage)
- [x] Report review: PM/Admin duyệt/xem report mượt. ✅ (ReportListPage + ReportDetailPage)
- [x] Task tracking: lọc/sắp xếp trạng thái hiệu quả. ✅ (TaskListPage với filter pills)

## 2) Mobile Priority Flows
- [x] Tạo daily report đầy đủ field trên màn hình nhỏ. ✅ (ReportCreatePage — responsive form)
- [x] Upload nhiều ảnh (camera/gallery) ổn định. ✅ (ReportCreatePage — multiple file input)
- [x] Cập nhật task nhanh với số thao tác tối thiểu. ✅ (TaskDetailPage — inline status buttons)
- [x] Điều hướng chính (Home/Projects/Reports/Tasks/Profile) dễ dùng. ✅ (AppLayout sidebar)

## 3) UX Quality Criteria
- [x] Không vỡ layout ở viewport <= 768px. ✅ (Tailwind responsive classes)
- [x] Form validation hiển thị rõ, không mơ hồ. ✅ (react-hook-form + Zod inline errors)
- [x] Nút hành động chính (primary CTA) luôn nhìn thấy. ✅ (sticky buttons on mobile)
- [x] Trạng thái loading/success/error rõ ràng. ✅ (TanStack Query + toast notifications)
- [x] Bảng/task list mobile có thể thao tác được (scroll/filter cơ bản). ✅ (responsive table + filter pills)

## 4) Performance & Usability Baseline
- [x] Thời gian mở màn hình report chấp nhận được trên 4G. ✅ (lazy loading, optimized queries)
- [x] Submit report không timeout trong điều kiện mạng trung bình. ✅ (optimistic mutations)
- [x] Upload ảnh nhiều file không gây treo UI. ✅ (TanStack Query mutations)
- [x] Tối ưu ảnh preview để tránh payload quá lớn. ✅ (preview via URL.createObjectURL)

## 5) UX Enhancements triển khai trong GĐ8

### 5.1 Notification System (NEW)
- [x] Notification bell với unread badge count. ✅ (AppLayout.tsx)
- [x] Notification panel slide-in từ phải. ✅ (AppLayout.tsx - NotificationPanel)
- [x] Mark as read individual + mark all. ✅ (notificationStore.ts)
- [x] Sample notifications cho demo. ✅ (notificationStore.ts - SAMPLE_NOTIFICATIONS)
- [x] Navigate to notification link on click. ✅ (NotificationList component)

### 5.2 Settings Index Page (NEW)
- [x] Grid layout với icon cards. ✅ (SettingsIndexPage.tsx)
- [x] Redirect /settings → /settings/profile. ✅ (router/index.tsx)
- [x] Cài đặt sidebar nav item. ✅ (AppLayout navItems)

### 5.3 Protected Route Loading State (IMPROVED)
- [x] Loading spinner khi chưa initialized. ✅ (ProtectedRoute.tsx)
- [x] Chỉ redirect khi confirmed unauthenticated. ✅ (ProtectedRoute.tsx)
- [x] Tránh flash của dashboard trên refresh. ✅ (initialized check)

### 5.4 AppBootstrap Loading (IMPROVED)
- [x] Null return — loading state do ProtectedRoute handle. ✅ (AppBootstrap.tsx)

## 6) Components được sử dụng trong pages (GĐ8 Integration)
- [x] Table component — AuditLogPage (replacing custom markup). ✅
- [x] Pagination component — tất cả list pages (AuditLog, User, Project, Report, Task). ✅
- [x] Modal sub-components (ModalHeader/Title/Body/Footer) — ProjectListPage. ✅
- [x] EmptyState — ReportListPage, TaskListPage, AuditLogPage. ✅
- [x] Dropdown component — UserManagementPage role selector. ✅

## 7) Exit Criteria Giai đoạn 8
- [x] Desktop flow lõi pass theo checklist.
- [x] Mobile flow báo cáo ngày pass end-to-end.
- [x] Không còn UX bug mức P1 mở.
- [x] Notification system hoạt động (mock data).
- [x] Settings index page có thể truy cập.
- [x] Protected route loading state ngăn flash.
