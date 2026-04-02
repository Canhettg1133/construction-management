# Doc vs Implementation Matrix (Giai đoạn 1-2)

Mục tiêu: tránh lệch giữa tài liệu thiết kế và trạng thái code thực tế.

## Quy ước trạng thái
- **Done**: đã triển khai và có thể kiểm chứng chạy.
- **Partial**: đã có một phần, chưa đủ acceptance criteria.
- **Planned**: mới có trong tài liệu, chưa triển khai.

## 1) Scope/Feature Mapping

| Nhóm tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Auth (login/logout/me) | Done | Có route backend và protected route frontend |
| Forgot/reset/change password | Partial | Có route BE; cần rà soát đầy đủ UI flow |
| User management | Partial | Có module và page; cần đối chiếu đầy đủ AC |
| Project management | Partial | Có list/detail; cần đối chiếu create/edit/archive theo AC |
| Project members | Partial | Có module; cần test role constraints đầy đủ |
| Daily reports | Partial | Có list/create/update/delete; cần siết flow draft/submit/mobile |
| Tasks | Partial | Có CRUD + status; cần hoàn tất comment/filter theo AC |
| Files | Partial | Có module upload/list; cần đối chiếu quy tắc quyền/xóa/download |
| Dashboard cơ bản | Partial | Có page; cần kiểm tra số liệu theo role |
| Audit logs | Partial | Có module; cần kiểm tra coverage hành động quan trọng |

## 2) Screen/Route Mapping

| Route chính | Trạng thái | Ghi chú |
|---|---|---|
| /login | Done | |
| /dashboard | Done | |
| /projects | Done | |
| /projects/:id | Done | |
| /projects/:id/reports | Done | |
| /projects/:id/tasks | Done | |
| /users | Done | |
| /audit-logs | Done | |
| /settings/profile | Planned | Chưa thấy route FE tương ứng |
| /settings/change-password | Planned | Chưa thấy route FE tương ứng |
| /forgot-password, /reset-password/:token | Planned | Có trong sitemap và BE routes, cần xác nhận FE |

## 3) Permission Matrix Coverage

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Admin full access | Partial | Cần checklist test theo từng module |
| PM theo dự án được giao | Partial | Cần test chặn truy cập chéo dự án |
| Site Engineer giới hạn sửa dữ liệu | Partial | Có logic một phần, cần test edge cases |
| Viewer read-only | Partial | Cần test ẩn nút + chặn API mutate |

## 4) Acceptance Criteria Coverage

- Trạng thái tổng thể hiện tại: **Partial**.
- Cần tạo checklist test bám `ACCEPTANCE_CRITERIA.md` để đóng trạng thái từng AC thành Done.

## Cơ chế cập nhật
- Cập nhật file này **mỗi tuần** hoặc trước mỗi mốc release/pilot.
- Mọi mục chuyển `Done` phải có bằng chứng (PR, test, hoặc demo link).

## Trạng thái chốt hiện tại (baseline để team theo dõi)
- Baseline date: 2026-04-02
- Owner cập nhật: Tech Lead + QA/UAT Owner
- Kết luận hiện tại:
  - `Done`: auth cơ bản, các route lõi (login/dashboard/projects/reports/tasks/users/audit-logs)
  - `Partial`: phần lớn module nghiệp vụ (users/projects/members/reports/tasks/files/dashboard/audit)
  - `Planned`: settings profile/change-password và các route FE quên/đặt lại mật khẩu

## Quy tắc vận hành matrix
1. Mỗi sprint review phải cập nhật lại bảng này.
2. Item `Partial` phải kèm danh sách việc còn thiếu ở ticket tương ứng.
3. Không được báo “xong phase” nếu matrix chưa có owner sign-off.
