# Danh sách màn hình chi tiết — Phase 1

---

## 1. Login (`/login`)

**Mục tiêu:** Xác thực người dùng
**Ai dùng:** Tất cả
**Fields:**
- Email (required, valid email)
- Password (required, min 8 ký tự)
- Remember me (checkbox)

**Actions:**
- Đăng nhập → redirect `/dashboard`
- Quên mật khẩu → `/forgot-password`

**Validation:**
- Email không đúng format → báo lỗi
- Sai mật khẩu quá 5 lần → khóa tạm thời 15 phút
- Hiển thị "Email hoặc mật khẩu không đúng" (không tiết lộ cụ thể)

**Điều kiện:** Public, không cần login

---

## 2. Dashboard (`/dashboard`)

**Mục tiêu:** Tổng quan nhanh
**Ai dùng:** Tất cả (dữ liệu theo role)
**Fields/Widgets:**
- Số dự án (Admin: toàn bộ, PM/SE: dự án tham gia)
- Task đang mở
- Báo cáo hôm nay
- Biểu đồ task theo trạng thái (bar chart đơn giản)
- Báo cáo 7 ngày gần nhất (line chart đơn giản)
- Activity feed gần đây

**Actions:**
- Click vào số liệu → chuyển đến trang chi tiết
- Filter theo dự án (PM, SE)

**Điều kiện:** Đã đăng nhập

---

## 3. Projects List (`/projects`)

**Mục tiêu:** Xem & quản lý danh sách dự án
**Ai dùng:** Tất cả
**Fields (mỗi row):**
- Tên dự án
- Địa điểm
- Trạng thái (Active / On Hold / Completed)
- Ngày bắt đầu / kết thúc
- Số thành viên
- Progress tổng thể (%)

**Actions:**
- Xem danh sách (search, filter theo trạng thái)
- Tạo dự án mới (Admin)
- Click vào dự án → chi tiết

**Điều kiện:**
- Nút "Tạo dự án": chỉ Admin
- Danh sách: Admin thấy tất cả, PM/SE/Viewer thấy dự án tham gia

---

## 4. Create Project (`/projects/new`)

**Mục tiêu:** Tạo dự án mới
**Ai dùng:** Admin
**Fields:**
- Tên dự án (required, max 200 ký tự)
- Mã dự án (required, unique, alphanumeric)
- Mô tả (optional, textarea)
- Địa điểm (required)
- Ngày bắt đầu (required, date picker)
- Ngày kết thúc dự kiến (optional, date picker, >= ngày bắt đầu)
- Khách hàng / Chủ đầu tư (optional)
- Trạng thái (default: Active)

**Actions:**
- Lưu → redirect `/projects/:id`
- Hủy → quay lại danh sách

**Validation:**
- Tên, mã, địa điểm, ngày bắt đầu: required
- Mã dự án: unique
- Ngày kết thúc >= ngày bắt đầu

---

## 5. Project Detail — Overview (`/projects/:id`)

**Mục tiêu:** Xem thông tin chung dự án
**Ai dùng:** Thành viên dự án
**Fields:**
- Tên, mã, mô tả, địa điểm
- Ngày bắt đầu / kết thúc
- Trạng thái
- Progress tổng thể (%)
- Số thành viên
- Số báo cáo
- Số task (theo trạng thái)

**Actions:**
- Sửa dự án (Admin, PM)
- Tabs: Overview | Members | Reports | Tasks | Files

**Điều kiện:** Phải là thành viên dự án hoặc Admin

---

## 6. Project Members (`/projects/:id/members`)

**Mục tiêu:** Quản lý thành viên dự án
**Ai dùng:** Admin, PM (xem: tất cả members)
**Fields (mỗi row):**
- Tên thành viên
- Email
- Role trong dự án (PM / Site Engineer / Viewer)
- Ngày tham gia

**Actions:**
- Thêm thành viên (chọn từ danh sách user, gán role)
- Xóa thành viên
- Đổi role thành viên

**Điều kiện:**
- Thêm/xóa/đổi role: Admin, PM
- Xem: tất cả members

---

## 7. Daily Reports List (`/projects/:id/reports`)

**Mục tiêu:** Xem danh sách báo cáo ngày
**Ai dùng:** Thành viên dự án
**Fields (mỗi row):**
- Ngày báo cáo
- Người tạo
- Thời tiết
- Số công nhân
- Progress (%)
- Số ảnh kèm
- Trạng thái (Draft / Submitted)

**Actions:**
- Tạo báo cáo mới (PM, Site Engineer)
- Filter theo ngày, người tạo
- Click → xem chi tiết

**Điều kiện:** Phải là thành viên dự án

---

## 8. Create/Edit Daily Report (`/projects/:id/reports/new`, `/reports/:id/edit`)

**Mục tiêu:** Tạo hoặc sửa báo cáo ngày
**Ai dùng:** PM, Site Engineer
**Fields:**
- Ngày (required, default hôm nay, date picker)
- Thời tiết (required, select: Nắng / Mưa / Nhiều mây / Khác)
- Nhiệt độ (optional, min-max)
- Số công nhân tại công trường (required, number >= 0)
- Công việc đã làm hôm nay (required, textarea)
- Vấn đề / vướng mắc (optional, textarea)
- Progress tổng thể % (required, 0-100)
- Ghi chú (optional)
- Upload ảnh (tối đa 10, JPG/PNG, max 5MB/ảnh)

**Actions:**
- Lưu draft
- Submit
- Tạo task từ báo cáo (nút "Tạo task")
- Hủy

**Validation:**
- Ngày, thời tiết, số công nhân, công việc, progress: required
- Progress: 0-100
- Ảnh: tối đa 10, max 5MB/ảnh, chỉ JPG/PNG
- Không sửa báo cáo ngày quá xa (configurable, default 7 ngày) — trừ PM/Admin

---

## 9. Tasks List (`/projects/:id/tasks`)

**Mục tiêu:** Xem & quản lý task
**Ai dùng:** Thành viên dự án
**Fields (mỗi row):**
- Tiêu đề task
- Người phụ trách
- Trạng thái (To Do / In Progress / Done / Cancelled)
- Ưu tiên (Low / Medium / High)
- Deadline
- Ngày tạo
- Nguồn (Từ report / Tạo độc lập)

**Actions:**
- Tạo task mới (PM, Site Engineer)
- Filter theo trạng thái, người phụ trách, ưu tiên
- Sort theo deadline, ưu tiên
- Click → xem chi tiết

**Điều kiện:** Phải là thành viên dự án

---

## 10. Create/Edit Task (`/projects/:id/tasks/new`, `/tasks/:id/edit`)

**Mục tiêu:** Tạo hoặc sửa task
**Ai dùng:** PM, Site Engineer
**Fields:**
- Tiêu đề (required, max 200 ký tự)
- Mô tả (optional, textarea)
- Người phụ trách (required, chọn từ members)
- Người tạo (auto)
- Deadline (required, date picker)
- Ưu tiên (required, Low / Medium / High)
- Trạng thái (default: To Do)
- Liên kết báo cáo (optional, nếu tạo từ report)

**Actions:**
- Lưu
- Hủy

**Validation:**
- Tiêu đề, người phụ trách, deadline, ưu tiên: required
- Deadline >= hôm nay (warning nếu < hôm nay)

---

## 11. Files List (`/projects/:id/files`)

**Mục tiêu:** Xem & quản lý file dự án
**Ai dùng:** Thành viên dự án
**Fields (mỗi row):**
- Tên file
- Loại (ảnh, PDF, Excel, Khác)
- Dung lượng
- Người upload
- Ngày upload

**Actions:**
- Upload file (PM, Site Engineer)
- Download / xem file
- Xóa file (Admin, PM)

**Điều kiện:**
- Upload/xóa: PM, Site Engineer, Admin
- Xem/download: tất cả members

---

## 12. Users Management (`/users`)

**Mục tiêu:** Quản lý user hệ thống
**Ai dùng:** Admin
**Fields (mỗi row):**
- Tên
- Email
- Role (Admin / PM / Site Engineer / Viewer)
- Trạng thái (Active / Locked)
- Lần đăng nhập cuối
- Ngày tạo

**Actions:**
- Tạo user mới
- Sửa user
- Khóa/mở user
- Reset mật khẩu
- Search, filter theo role, trạng thái

**Validation:**
- Email: required, valid, unique
- Password khi tạo: min 8 ký tự

---

## 13. Audit Logs (`/audit-logs`)

**Mục tiêu:** Theo dõi hành động hệ thống
**Ai dùng:** Admin, PM
**Fields (mỗi row):**
- Thời gian
- User thực hiện
- Hành động (Create / Update / Delete / Login / Logout)
- Entity type (Project / Report / Task / User / File)
- Entity ID
- Mô tả ngắn

**Actions:**
- Filter theo thời gian, user, hành động, entity type
- Export (phase 2)

**Điều kiện:**
- Admin: toàn bộ log
- PM: log của dự án được giao

---

## 14. Settings — Profile (`/settings/profile`)

**Mục tiêu:** Cập nhật thông tin cá nhân
**Ai dùng:** Tất cả
**Fields:**
- Tên (required)
- Email (readonly)
- Số điện thoại (optional)
- Avatar (optional, upload ảnh)

**Actions:**
- Lưu
- Đổi mật khẩu → `/settings/change-password`

---

## 15. Settings — Change Password (`/settings/change-password`)

**Mục tiêu:** Đổi mật khẩu
**Ai dùng:** Tất cả
**Fields:**
- Mật khẩu hiện tại (required)
- Mật khẩu mới (required, min 8 ký tự)
- Xác nhận mật khẩu mới (required, phải khớp)

**Actions:**
- Lưu
- Hủy

**Validation:**
- Mật khẩu hiện tại đúng
- Mật khẩu mới >= 8 ký tự
- Mật khẩu mới != mật khẩu hiện tại
- Xác nhận khớp
