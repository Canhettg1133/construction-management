# Skeleton E2E + Vertical Slice Plan (Giai đoạn 5-6)

## A. Skeleton E2E Gate (Giai đoạn 5)

## A.1 Checklist bắt buộc
- [x] Frontend skeleton chạy được (layout + router cơ bản). ✅ — `packages/web/src/router/`, `AppLayout`
- [x] Backend skeleton chạy được (app/server + health endpoint). ✅ — `packages/api/src/app.ts`, `/api/v1/health`
- [x] Auth flow cơ bản chạy (login/logout/me). ✅ — `packages/api/src/modules/auth/`
- [x] Protected route hoạt động trên frontend. ✅ — `packages/web/src/router/ProtectedRoute.tsx`, `RoleGuard.tsx`
- [x] FE gọi được API BE qua env chuẩn. ✅ — `packages/web/src/config/api.ts`, Vite proxy
- [x] Prisma kết nối MySQL thành công. ✅ — `packages/api/src/config/database.ts`
- [x] Migration chạy thành công trên môi trường dev. ✅ — `prisma/migrations/`
- [x] `pnpm typecheck` pass toàn workspace. ✅ — root `package.json` scripts
- [x] `pnpm build` pass toàn workspace. ✅ — root `package.json` scripts
- [x] Deploy thử môi trường dev/staging thành công. ✅ — `docker-compose.yml` + `Dockerfile`

### A.2 Evidence
- CI workflow: `.github/workflows/ci.yml` (4 jobs: quality, build, migrate, test)
- Smoke test: `scripts/smoke-test.sh` / `scripts/smoke-test.ps1`
- Docker setup: `docker-compose.yml`, `docker-compose.dev.yml`, `packages/api/Dockerfile`, `packages/web/Dockerfile`
- README: `README.md` (hướng dẫn dev + docker đầy đủ)

### A.3 Exit Criteria
**GĐ5 Gate: PASSED** ✅
- Tất cả mục A.1 đã đạt.
- Evidence tại: CI workflow + smoke test script + docker compose.

---

## B. Vertical Slice Delivery Plan (Giai đoạn 6)

## B.1 Nguyên tắc thực thi slice
Mỗi slice phải hoàn tất xuyên suốt:
1. UI (screen + form + trạng thái)
2. API (route + controller + service + repository)
3. DB (schema/migration nếu có)
4. Validation FE/BE
5. Permission theo role
6. Audit log cho hành động chính
7. Test theo AC liên quan

## B.2 Thứ tự slice và tiêu chí pass

### Slice 1 — Auth + Role
Phạm vi:
- Login, logout, profile/me, JWT, protected route, role guard.
Pass khi:
- User login được đúng role.
- Route bảo vệ hoạt động.
- API chặn 401/403 đúng chuẩn.

### Slice 2 — Users + Roles
Phạm vi:
- List/create/update/lock-reset user (Admin).
Pass khi:
- Viewer/SE/PM không truy cập mutate user.
- Admin thao tác user đầy đủ.

### Slice 3 — Projects
Phạm vi:
- CRUD project, detail, status, assignment PM.
Pass khi:
- PM chỉ thấy dự án được giao.
- Truy cập chéo dự án bị chặn.

### Slice 4 — Project Members
Phạm vi:
- Add/remove/list member, role trong dự án.
Pass khi:
- Quyền add/remove đúng matrix.
- User được thêm thấy dự án tương ứng.

### Slice 5 — Daily Reports (trọng tâm)
Phạm vi:
- Create/list/detail/edit draft/submit/upload ảnh/filter.
Pass khi:
- Site Engineer tạo report ổn trên mobile web.
- PM/Admin có thể review theo quyền.
- Report tạo/sửa/submit ghi audit log.

### Slice 6 — Tasks
Phạm vi:
- Tạo task từ project/report, update status, comment, filter.
Pass khi:
- Task liên kết report đúng.
- Assignee/PM cập nhật trạng thái đúng quyền.

### Slice 7 — Files
Phạm vi:
- Upload/list/download/delete theo project.
Pass khi:
- Validate loại file/dung lượng đúng.
- Phân quyền xóa file đúng matrix.

### Slice 8 — Dashboard + Audit Logs
Phạm vi:
- Dashboard cơ bản theo role, danh sách audit logs.
Pass khi:
- Số liệu dashboard bám dữ liệu thực.
- Audit coverage đủ cho hành động trọng yếu.

---

## C. Handoff & demo sau mỗi slice
- Demo 15-30 phút với owner nghiệp vụ.
- Tick AC liên quan vào checklist.
- Cập nhật `DOC_IMPLEMENTATION_MATRIX.md`.
- Chỉ mở slice tiếp theo khi slice hiện tại đạt gate.
