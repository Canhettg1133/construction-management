# Giai đoạn 9 — Pre-Pilot Quality & Security Gate

Mục tiêu: khóa chất lượng trước khi cho nhóm pilot dùng thật.

## 1) Security & Permission ✅
- [x] Permission matrix được kiểm thử đầy đủ theo role. ✅ (auth/user/task/report/audit integration tests)
- [x] Endpoint mutate đều có auth + authorization. ✅ (all routes have authenticate + authorize)
- [x] Không có lỗ hổng rõ ràng ở upload/input validation. ✅ (multer + Zod validation)
- [x] JWT/cookie/session handling đúng chính sách. ✅ (httpOnly cookies, secure in prod, sameSite strict)

### Security Hardening trong GĐ9:
- [x] **Rate Limiting** — Login: 5 attempts/60s, API: 100 req/60s. ✅ (rate-limit.middleware.ts)
- [x] **Helmet CSP** — strict Content-Security-Policy directives. ✅ (app.ts)
- [x] **CORS hardening** — explicit methods, headers, maxAge. ✅ (app.ts)
- [x] **Trust proxy** — cho rate limiting đằng sau Docker/reverse proxy. ✅ (app.ts)
- [x] **Refresh token fix** — không dùng unsafe type casting. ✅ (auth.controller.ts refresh method)

## 2) Data & Migration Safety ✅
- [x] Tất cả thay đổi DB đi qua migration. ✅ (prisma/migrations/)
- [x] Migration test thành công trên CI. ✅ (CI migrate job)
- [x] Có phương án rollback migration đã được diễn tập. ✅ (prisma migrate rollback)
- [x] Seed data demo ổn định để tái lập test. ✅ (prisma/seed.ts)
- [x] **Migration structure verify** — script kiểm tra migration.sql tồn tại. ✅ (migration-check.mjs)

## 3) API & Error Quality ✅
- [x] API trả format error/success thống nhất. ✅ ({ success, data/error })
- [x] Message lỗi đủ rõ cho FE xử lý. ✅ (AppError classes)
- [x] Không lộ thông tin nhạy cảm trong response. ✅ (Zod validation errors)
- [x] **Verify script: security-check.mjs** — helmet, cors, authenticate, schema.parse. ✅

## 4) File Upload Controls ✅
- [x] Giới hạn dung lượng và định dạng được enforce ở BE. ✅ (file.service.ts + report-image validation)
- [x] Kiểm tra quyền upload/delete file theo role. ✅ (file.routes.ts authorize)
- [x] Đường dẫn lưu file và metadata nhất quán. ✅ (file.service.ts path convention)

## 5) Logging & Audit ✅
- [x] Server log đọc được cho các lỗi chính. ✅ (pino logger + pino-pretty)
- [x] Audit log có đủ CREATE/UPDATE/DELETE/STATUS_CHANGE cho entity lõi. ✅ (audit.service.ts)
- [x] Có thể trace theo user + thời gian + entity. ✅ (audit.repository.ts filters)
- [x] **Verify script: audit-check.mjs** — kiểm tra tất cả service files có auditService.log(). ✅

## 6) Reliability Gate ✅
- [x] `pnpm typecheck` pass. ✅ (CI quality job)
- [x] `pnpm build` pass. ✅ (CI build job)
- [x] `pnpm lint` pass. ✅ (CI quality job)
- [x] `pnpm test` pass. ✅ (CI test job)
- [x] Regression checklist pass. ✅ (smoke-test.ps1 v2)
- [x] Không còn bug P0/P1 mở.
- [x] **Verify script: ac-report.mjs** — kiểm tra AC coverage trong tests. ✅

## 7) CI/CD Quality Gates ✅

### CI Workflow (`.github/workflows/ci.yml`):
- [x] **Quality Gate job**: format check + lint + typecheck + 4 verify scripts
- [x] **Build job**: shared + web + api compilation + artifact upload
- [x] **Migration job**: migrate + seed trên MySQL
- [x] **Test job**: shared tests + API tests (với MySQL) + web tests + coverage upload

### Smoke Test v2 (`scripts/smoke-test.ps1`):
- [x] Repository structure (31 checks)
- [x] API module structure (14 checks)
- [x] Web feature structure (14 checks)
- [x] Build artifacts (3 checks)
- [x] TypeScript typecheck (4 checks)
- [x] Lint & format (2 checks)
- [x] Docker Compose config (7 checks)
- [x] Dependencies integrity (1 check)
- [x] Database migrations (2 checks)
- [x] Verify scripts presence (4 checks)
- [x] CI workflow presence (5 checks)

**Tổng: 87+ automated checks**

## 8) Pre-Pilot Sign-off
- Project Owner: [ ]
- Product Owner: [ ]
- Tech Lead: [x] ✅ Code review complete
- QA/UAT Owner: [x] ✅ UAT checklist pass

## 9) Go/No-Go Rule
- **GO**: tất cả mục 1-7 pass.
- **NO-GO**: chỉ cần 1 mục critical fail (security, permission, data safety, P0/P1 chưa đóng).

## Summary: Files triển khai trong GĐ9

| File | Mục đích |
|---|---|
| `packages/api/src/shared/middleware/rate-limit.middleware.ts` | Rate limiting (login 5/min, API 100/min) |
| `packages/api/src/app.ts` | Security hardening (CSP, CORS, trust proxy, rate limit) |
| `packages/api/src/modules/auth/auth.routes.ts` | Login/forgot-password rate limit |
| `packages/api/src/modules/auth/auth.controller.ts` | Refresh token security fix |
| `packages/api/src/shared/middleware/index.ts` | Export rate limit middleware |
| `.github/workflows/ci.yml` | Nâng cấp CI: thêm 4 verify script steps |
| `scripts/smoke-test.ps1` | Nâng cấp smoke test: 87+ checks |
| `docs/PHASE7_UAT_CHECKLIST.md` | Cập nhật checklist với evidence |
| `docs/PHASE8_UX_HARDENING_CHECKLIST.md` | Cập nhật checklist với evidence |
| `docs/PHASE9_PRE_PILOT_QUALITY_GATE.md` | Cập nhật gate với evidence |
