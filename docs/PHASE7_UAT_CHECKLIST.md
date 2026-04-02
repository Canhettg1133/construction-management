# Giai đoạn 7 — UAT & Regression Checklist

## A) UAT Checklist (theo nghiệp vụ)

### A1. User & Role
- [ ] Admin tạo user mới thành công.
- [ ] Admin gán role đúng (Admin/PM/Site Engineer/Viewer).
- [ ] User login được với tài khoản mới.
- [ ] Viewer không thấy thao tác create/update/delete.

### A2. Project & Members
- [ ] PM tạo project thành công (hoặc Admin theo policy).
- [ ] PM thêm Site Engineer vào project.
- [ ] Site Engineer nhìn thấy project vừa được thêm.
- [ ] User ngoài project không truy cập được project qua URL trực tiếp.

### A3. Daily Report
- [ ] Site Engineer tạo report mới thành công.
- [ ] Upload ảnh đúng định dạng/kích thước hoạt động.
- [ ] Submit report thành công.
- [ ] PM xem được report của dự án.

### A4. Tasks
- [ ] Tạo task từ project thành công.
- [ ] Tạo task từ daily report thành công.
- [ ] Assign người phụ trách thành công.
- [ ] Cập nhật trạng thái task đúng quyền.

### A5. Files
- [ ] Upload file dự án thành công.
- [ ] Thành viên dự án download được file.
- [ ] Role không đủ quyền bị chặn xóa file.

### A6. Audit Log
- [ ] CREATE/UPDATE/DELETE trên project/report/task có log.
- [ ] STATUS_CHANGE task có log.
- [ ] Log hiển thị đúng user/time/entity/action.

## B) Regression Checklist (chạy trước mỗi release)
- [ ] Auth flow không vỡ.
- [ ] Route guard hoạt động đúng.
- [ ] 5 API lõi trả format chuẩn.
- [ ] Permission matrix không bị regression.
- [ ] Dashboard hiển thị dữ liệu cơ bản đúng.
- [ ] Typecheck/build pass toàn workspace.

## C) Bug Severity Rule
- P0: hệ thống không dùng được / lỗi bảo mật nghiêm trọng.
- P1: lỗi nghiệp vụ chính, không có workaround hợp lý.
- P2: lỗi chức năng phụ, có workaround.
- P3: UI/UX minor.

## D) Exit Criteria
- Không còn bug P0/P1 mở.
- Tất cả mục A pass.
- Mục B pass cho build chuẩn bị pilot.
