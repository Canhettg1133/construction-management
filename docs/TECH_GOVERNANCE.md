# Technical Governance (Giai đoạn 3-4)

## 1. Definition of Ready (DoR) — trước khi dev một task/story
Một task chỉ được bắt đầu khi đủ các điều kiện:
- Có business goal rõ và link về AC liên quan.
- Có API contract hoặc route/response dự kiến.
- Có yêu cầu permission theo role.
- Có validation rule chính (FE + BE).
- Có tác động DB được nêu rõ (có migration hay không).
- Có tiêu chí test tối thiểu (unit/API/UI/UAT).

## 2. Definition of Done (DoD) — để đóng task/story
Một task chỉ được coi là Done khi:
- Code pass typecheck + build.
- Pass validation và permission theo thiết kế.
- Có audit log nếu là hành động quan trọng (CREATE/UPDATE/DELETE/STATUS_CHANGE).
- Có migration đi kèm nếu thay đổi schema.
- Có cập nhật tài liệu liên quan (nếu đổi hành vi hoặc API).
- Đã tự test theo acceptance criteria liên quan.

## 3. Coding & Architecture Guardrails
- Controller: chỉ nhận/trả request/response, không xử lý nghiệp vụ sâu.
- Service: xử lý nghiệp vụ, không đụng trực tiếp req/res.
- Repository: chỉ truy cập DB qua Prisma.
- Validation ở cả FE và BE.
- Response dùng format thống nhất `success/data/meta` và `success/error`.

## 4. Branch & PR Rules (bắt buộc)
- Branch naming: `feature/*`, `fix/*`, `chore/*`, `docs/*`.
- Mỗi PR phải ghi: phạm vi thay đổi, tác động dữ liệu, cách test.
- PR **không được merge** nếu fail quality gate.

## 5. Quality Gate bắt buộc trước merge/release
Tất cả điều kiện sau phải đạt:
- `pnpm typecheck` pass.
- `pnpm build` pass.
- Không có lỗi phân quyền mức nghiêm trọng.
- Không commit secrets (`.env`, key, token thật).
- Có self-check theo AC liên quan và cập nhật `DOC_IMPLEMENTATION_MATRIX.md` nếu trạng thái thay đổi.

## 5.1 Merge Gate Checklist (copy vào PR)
- [ ] Scope thay đổi đúng ticket/AC.
- [ ] Typecheck pass.
- [ ] Build pass.
- [ ] Permission check đã test.
- [ ] Validation FE/BE đã test.
- [ ] Audit log đã cover action quan trọng (nếu có mutate).
- [ ] Không chứa secrets.
- [ ] Cập nhật tài liệu liên quan (nếu cần).

## 5.2 Release Gate Checklist (trước khi lên staging/prod)
- [ ] Tất cả PR trong release pass Merge Gate.
- [ ] Migration đã test trên staging.
- [ ] Smoke test flow lõi pass.
- [ ] Không còn bug P0/P1 mở.
- [ ] Có kế hoạch rollback và người chịu trách nhiệm ca trực release.

## 6. Data Core Checklist (Giai đoạn 4)
- Entity lõi đã khóa: users, projects, project_members, daily_reports, tasks.
- Bảng phụ phase 1: files, audit_logs, task_comments (nếu cần).
- Enum/status rõ ràng, không dùng string tự do cho trạng thái lõi.
- Soft delete strategy thống nhất cho bảng cần phục hồi.
- Index tối thiểu cho truy vấn phổ biến (project_id, created_at, assignee, status).
- Seed data có admin + dữ liệu demo đủ test flow.

## 7. Migration Rules (bắt buộc)
- Mọi thay đổi schema đi qua Prisma migration.
- Không sửa DB production thủ công.
- Mỗi migration phải có tên có nghĩa và được review.
- Trước release: test migrate trên staging.
