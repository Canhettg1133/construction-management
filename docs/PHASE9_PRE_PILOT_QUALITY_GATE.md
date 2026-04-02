# Giai đoạn 9 — Pre-Pilot Quality & Security Gate

Mục tiêu: khóa chất lượng trước khi cho nhóm pilot dùng thật.

## 1) Security & Permission
- [ ] Permission matrix được kiểm thử đầy đủ theo role.
- [ ] Endpoint mutate đều có auth + authorization.
- [ ] Không có lỗ hổng rõ ràng ở upload/input validation.
- [ ] JWT/cookie/session handling đúng chính sách.

## 2) Data & Migration Safety
- [ ] Tất cả thay đổi DB đi qua migration.
- [ ] Migration test thành công trên staging.
- [ ] Có phương án rollback migration đã được diễn tập.
- [ ] Seed data demo ổn định để tái lập test.

## 3) API & Error Quality
- [ ] API trả format error/success thống nhất.
- [ ] Message lỗi đủ rõ cho FE xử lý.
- [ ] Không lộ thông tin nhạy cảm trong response.

## 4) File Upload Controls
- [ ] Giới hạn dung lượng và định dạng được enforce ở BE.
- [ ] Kiểm tra quyền upload/delete file theo role.
- [ ] Đường dẫn lưu file và metadata nhất quán.

## 5) Logging & Audit
- [ ] Server log đọc được cho các lỗi chính.
- [ ] Audit log có đủ CREATE/UPDATE/DELETE/STATUS_CHANGE cho entity lõi.
- [ ] Có thể trace theo user + thời gian + entity.

## 6) Reliability Gate
- [ ] `pnpm typecheck` pass.
- [ ] `pnpm build` pass.
- [ ] Regression checklist pass.
- [ ] Không còn bug P0/P1 mở.

## 7) Pre-Pilot Sign-off
- Project Owner: [ ]
- Product Owner: [ ]
- Tech Lead: [ ]
- QA/UAT Owner: [ ]

## 8) Go/No-Go Rule
- **GO**: tất cả mục 1-7 pass.
- **NO-GO**: chỉ cần 1 mục critical fail (security, permission, data safety, P0/P1 chưa đóng).
