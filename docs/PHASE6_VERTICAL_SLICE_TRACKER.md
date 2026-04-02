# Giai đoạn 6 — Vertical Slice Tracker

Mục tiêu: triển khai theo lát dọc, không làm rời rạc UI/API/DB.

## Quy tắc đóng mỗi slice (bắt buộc)
Một slice chỉ được đóng khi tất cả tiêu chí dưới đây đạt:
- [ ] UI flow chạy được trên môi trường dev.
- [ ] API route/controller/service/repository hoàn chỉnh.
- [ ] Validation FE + BE hoạt động đúng.
- [ ] Permission theo role đúng matrix.
- [ ] Audit log ghi nhận action quan trọng.
- [ ] `pnpm typecheck` pass.
- [ ] `pnpm build` pass.
- [ ] AC liên quan được tick Done trong bằng chứng test.

## Bảng tracker tổng

| Slice | Mục tiêu | Owner | Status | Evidence | Blocker |
|-------|---------|-------|--------|---------|---------|
| 1. Auth + Role | Login/logout/me/protected/role guard | TBD | ✅ Done | `packages/api/src/modules/auth/`, `packages/web/src/router/ProtectedRoute.tsx` | — |
| 2. Users + Roles | CRUD user + lock/reset + role | TBD | ✅ Done | `packages/api/src/modules/users/`, `packages/web/src/features/users/` | — |
| 3. Projects | CRUD + detail + status | TBD | ✅ Done | `packages/api/src/modules/projects/`, `packages/web/src/features/projects/` | — |
| 4. Project Members | add/remove/list + role in project | TBD | ✅ Done | `packages/api/src/modules/project-members/` | — |
| 5. Daily Reports | create/list/detail/edit/submit/upload/filter | TBD | ✅ Done | `packages/api/src/modules/daily-reports/`, `packages/web/src/features/reports/` | — |
| 6. Tasks | create from project/report + status + comment/filter | TBD | ✅ Done | `packages/api/src/modules/tasks/`, `packages/web/src/features/tasks/` | — |
| 7. Files | upload/list/download/delete + permissions | TBD | ✅ Done | `packages/api/src/modules/files/`, `packages/web/src/features/projects/ProjectFilesTab.tsx` | — |
| 8. Dashboard + Audit | dashboard theo role + audit coverage | TBD | ✅ Done | `packages/api/src/modules/dashboard/`, `packages/api/src/modules/audit/`, `packages/web/src/features/dashboard/`, `packages/web/src/features/audit/` | — |

> **Trạng thái:** Code tất cả 8 slices đã hoàn thành. Tiếp theo cần: (1) chạy smoke test thực tế, (2) viết unit/integration test, (3) UAT checklist pass, (4) demo cho business.

## Chi tiết evidence từng slice

### Slice 1 — Auth + Role
- **AC liên quan:** Login/logout/me, protected route 401/403 đúng, JWT token management
- **API test cases:** `packages/api/src/security/core-flows.integration.test.ts` (6 test cases), `packages/api/src/modules/health/health.routes.test.ts`
- **Permission tests:** viewer → 403, unauth → 401
- **Validation tests:** payload validation → 400
- **Audit log checks:** LOGIN/LOGOUT ghi audit_logs
- **Demo notes:** Login → dashboard redirect → header hiển user + role badge
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 2 — Users + Roles
- **AC liên quan:** Admin CRUD user, gán role, lock/unlock, reset password
- **API test cases:** Cần viết thêm trong `packages/api/src/`
- **Demo notes:** User management page với table + create/edit form
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 3 — Projects
- **AC liên quan:** CRUD project, detail page, status change, PM thấy dự án được giao
- **Demo notes:** Project list → detail (tabs: overview/members/files)
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 4 — Project Members
- **AC liên quan:** Thêm/xóa member, đổi role trong dự án
- **Demo notes:** Project members tab
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 5 — Daily Reports (trọng tâm)
- **AC liên quan:** SE tạo report, upload ảnh, PM xem report, report ghi audit log
- **Demo notes:** Report list → create (mobile-friendly form) → detail (với ảnh) → edit (trong 7 ngày)
- **UI tests:** `packages/web/src/features/reports/pages/ReportCreatePage.test.tsx`
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 6 — Tasks
- **AC liên quan:** Tạo task từ project/report, update status, filter theo trạng thái
- **Demo notes:** Task list → create → detail (với comment section)
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 7 — Files
- **AC liên quan:** Upload/list/download/delete, phân quyền đúng
- **Demo notes:** Project files tab
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

### Slice 8 — Dashboard + Audit
- **AC liên quan:** Dashboard số liệu theo role, audit log đầy đủ
- **UI tests:** `packages/web/src/store/authStore.test.ts`
- **Demo notes:** Dashboard: stats cards + task chart + recent activity | Audit: filterable log page
- **Gate:**
  - Typecheck: ✅ Pass
  - Build: ✅ Pass
  - UAT mini: ⏳ Chưa chạy

## Next steps (sau khi code xong tất cả slices)

1. **Chạy smoke test:** `pnpm smoke-test` (hoặc `pnpm smoke-test:win` trên Windows)
2. **Viết thêm integration test:** Ưu tiên auth → reports → tasks
3. **Chạy UAT mini:** 6 luồng nghiệp vụ bắt buộc trong `PHASE7_UAT_CHECKLIST.md`
4. **Demo cho business owner:** Mỗi slice demo 15-30 phút
5. **Cập nhật tracker:** Điền kết quả UAT mini vào bảng trên
6. **Formal close GĐ6:** Khi tất cả 8 slices đạt UAT mini → chuyển GĐ7

## Quy tắc chuyển slice
- Không mở slice tiếp theo nếu slice hiện tại chưa đạt gate.
- Nếu blocker > 2 ngày, phải escalation với Project Owner/Tech Lead.
- **Hiện tại:** Tất cả slices đã code xong — cần UAT mini + evidence để formal close.
