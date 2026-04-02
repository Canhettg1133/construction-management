# Tính năng In-Scope — Phase 1

## 1. Authentication & Authorization
- [ ] Đăng nhập (email + password)
- [ ] Đăng xuất
- [ ] Quên mật khẩu (reset qua email)
- [ ] Phân quyền theo role: Admin, PM, Site Engineer, Viewer
- [ ] JWT token / session management

## 2. User Management (Admin)
- [ ] Danh sách user
- [ ] Tạo user mới (gán role)
- [ ] Sửa thông tin user
- [ ] Khóa / mở khóa user
- [ ] Reset mật khẩu user

## 3. Project Management
- [ ] Danh sách dự án
- [ ] Tạo dự án mới (tên, mô tả, địa điểm, ngày bắt đầu/kết thúc)
- [ ] Sửa thông tin dự án
- [ ] Xem chi tiết dự án
- [ ] Trạng thái: Active / On Hold / Completed

## 4. Project Members
- [ ] Thêm thành viên vào dự án (gán role trong project)
- [ ] Xóa thành viên khỏi dự án
- [ ] Xem danh sách thành viên theo dự án
- [ ] Một user có thể thuộc nhiều dự án

## 5. Daily Reports
- [ ] Tạo báo cáo ngày (ngày, thời tiết, số công nhân, mô tả công việc, progress %)
- [ ] Upload ảnh kèm báo cáo (tối đa 10 ảnh/báo cáo)
- [ ] Chỉnh sửa báo cáo (người tạo hoặc PM)
- [ ] Xem danh sách báo cáo theo dự án / theo ngày
- [ ] Xem chi tiết báo cáo
- [ ] Tạo task từ báo cáo

## 6. Tasks
- [ ] Tạo task (tiêu đề, mô tả, người phụ trách, deadline, ưu tiên)
- [ ] Trạng thái: To Do / In Progress / Done / Cancelled
- [ ] Gán task cho thành viên trong dự án
- [ ] Cập nhật trạng thái task
- [ ] Danh sách task theo dự án
- [ ] Task có thể tạo từ daily report hoặc tạo độc lập

## 7. File Upload
- [ ] Upload file (ảnh, PDF, Excel) vào dự án
- [ ] Danh sách file theo dự án
- [ ] Xem / download file
- [ ] Xóa file (PM, Admin)
- [ ] Dung lượng tối đa: 10MB/file

## 8. Dashboard Cơ Bản
- [ ] Tổng quan: số dự án, số task đang mở, báo cáo hôm nay
- [ ] Task theo trạng thái (chart đơn giản)
- [ ] Báo cáo theo ngày (số lượng trong tuần)
- [] Dashboard theo role (mỗi role thấy dữ liệu phù hợp)

## 9. Audit Log
- [ ] Ghi nhận hành động: tạo/sửa/xóa report, task, project, user
- [ ] Ai làm — làm gì — lúc nào — trên bản ghi nào
- [ ] Xem danh sách audit log (Admin, PM)
