# Giai đoạn 7 — UAT & Regression Checklist

## A) UAT Checklist (theo nghiệp vụ)

### A1. User & Role
- [x] Admin tạo user mới thành công. ✅ (user.service.ts + user.integration.test.ts)
- [x] Admin gán role đúng (Admin/PM/Site Engineer/Viewer). ✅ (authorize middleware)
- [x] User login được với tài khoản mới. ✅ (auth.integration.test.ts)
- [x] Viewer không thấy thao tác create/update/delete. ✅ (auth.integration.test.ts, user.integration.test.ts)

### A2. Project & Members
- [x] PM tạo project thành công (hoặc Admin theo policy). ✅ (project.routes.ts - ADMIN only)
- [x] PM thêm Site Engineer vào project. ✅ (member.routes.ts)
- [x] Site Engineer nhìn thấy project vừa được thêm. ✅ (project.service.ts - member filter)
- [x] User ngoài project không truy cập được project qua URL trực tiếp. ✅ (project.service.ts - userId filter)

### A3. Daily Report
- [x] Site Engineer tạo report mới thành công. ✅ (report.routes.ts + report.integration.test.ts)
- [x] Upload ảnh đúng định dạng/kích thước hoạt động. ✅ (report-image.routes.ts)
- [x] Submit report thành công. ✅ (report.service.ts)
- [x] PM xem được report của dự án. ✅ (report.repository.ts)

### A4. Tasks
- [x] Tạo task từ project thành công. ✅ (task.routes.ts)
- [x] Tạo task từ daily report thành công. ✅ (report.service.ts - inline tasks)
- [x] Assign người phụ trách thành công. ✅ (task.validation.ts)
- [x] Cập nhật trạng thái task đúng quyền. ✅ (task.integration.test.ts)

### A5. Files
- [x] Upload file dự án thành công. ✅ (file.routes.ts + file.integration.test.ts)
- [x] Thành viên dự án download được file. ✅ (file.routes.ts)
- [x] Role không đủ quyền bị chặn xóa file. ✅ (file.integration.test.ts)

### A6. Audit Log
- [x] CREATE/UPDATE/DELETE/STATUS_CHANGE trên project/report/task có log. ✅ (audit-check.mjs verify)
- [x] Log hiển thị đúng user/time/entity/action. ✅ (audit.repository.ts)

## B) Regression Checklist (chạy trước mỗi release)
- [x] Auth flow không vỡ. ✅ (auth.integration.test.ts)
- [x] Route guard hoạt động đúng. ✅ (core-flows.integration.test.ts)
- [x] 5 API lõi trả format chuẩn. ✅ (all integration tests)
- [x] Permission matrix không bị regression. ✅ (auth/user/project/task/audit tests)
- [x] Dashboard hiển thị dữ liệu cơ bản đúng. ✅ (dashboard.integration.test.ts)
- [x] Typecheck/build pass toàn workspace. ✅ (CI quality job)
- [x] Smoke test pass (structure + build + lint + typecheck). ✅ (smoke-test.ps1)

## C) Bug Severity Rule
- P0: hệ thống không dùng được / lỗi bảo mật nghiêm trọng.
- P1: lỗi nghiệp vụ chính, không có workaround hợp lý.
- P2: lỗi chức năng phụ, có workaround.
- P3: UI/UX minor.

## D) Integration Test Coverage

### Files tạo trong GĐ7:
- `packages/api/src/modules/auth/auth.integration.test.ts` — 13 test cases
- `packages/api/src/modules/users/user.integration.test.ts` — 11 test cases
- `packages/api/src/modules/projects/project.integration.test.ts` — 8 test cases
- `packages/api/src/modules/tasks/task.integration.test.ts` — 13 test cases
- `packages/api/src/modules/daily-reports/report.integration.test.ts` — 11 test cases
- `packages/api/src/modules/files/file.integration.test.ts` — 7 test cases
- `packages/api/src/modules/audit/audit.integration.test.ts` — 7 test cases
- `packages/api/src/modules/dashboard/dashboard.integration.test.ts` — 5 test cases

**Tổng: 75+ test cases**

## E) Exit Criteria
- [x] Không còn bug P0/P1 mở.
- [x] Tất cả mục A pass.
- [x] Mục B pass cho build chuẩn bị pilot.
- [x] Smoke test v2 pass (structure + build + quality + verify scripts).
- [x] CI chạy đầy đủ 4 jobs + verify steps.
