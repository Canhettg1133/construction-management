# Giai đoạn 7 — Test Strategy Theo Nghiệp Vụ

Mục tiêu: kiểm thử theo flow thật, không test rời rạc từng màn hình.

## 1) Test Pyramid cho phase 1
- Unit test: logic nghiệp vụ quan trọng (service/utils/permission rules).
- API integration test: endpoint + validation + permission + DB write.
- UI smoke test: route chính và thao tác cơ bản không vỡ.
- UAT manual: theo checklist nghiệp vụ thực tế.

## 2) 6 luồng bắt buộc phải pass
1. Admin tạo user → gán role → user login được.
2. PM tạo project → thêm member → Site Engineer thấy project.
3. Site Engineer tạo daily report → upload ảnh → submit.
4. Từ report tạo task → assign người phụ trách.
5. PM/Site Engineer cập nhật trạng thái task.
6. Hệ thống ghi audit log đúng cho hành động chính.

## 3) Coverage tối thiểu theo module
- Auth: login/logout/refresh/me, lockout và error handling.
- Users: create/update/lock/reset + quyền admin-only.
- Projects/Members: quyền truy cập theo project membership.
- Reports: create/edit/submit/upload/filter + giới hạn edit window.
- Tasks: create/update status/comment/filter.
- Files: upload/download/delete + validate loại file/dung lượng.
- Audit: ghi log đúng entity/action/user/timestamp.

## 4) Exit criteria giai đoạn 7
- 6 luồng bắt buộc pass 100%.
- Không có bug P0/P1 mở.
- Có báo cáo test tổng hợp + link evidence.
