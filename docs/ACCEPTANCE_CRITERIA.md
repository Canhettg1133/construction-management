# Acceptance Criteria — Phase 1

## 1. Authentication

### AC-1.1: Đăng nhập thành công
- **Given** User có tài khoản hợp lệ
- **When** Nhập đúng email và password
- **Then** Đăng nhập thành công, redirect đến `/dashboard`
- **And** JWT token được lưu (httpOnly cookie)
- **And** Audit log ghi nhận "User logged in"

### AC-1.2: Đăng nhập thất bại
- **Given** User nhập sai email hoặc password
- **When** Submit form login
- **Then** Hiển thị "Email hoặc mật khẩu không đúng"
- **And** Không tiết lộ email có tồn tại hay không

### AC-1.3: Khóa tài khoản sau 5 lần sai
- **Given** User nhập sai password liên tiếp 5 lần
- **When** Lần thử thứ 5 thất bại
- **Then** Tài khoản bị khóa tạm thời 15 phút
- **And** Hiển thị thông báo "Tài khoản bị khóa, thử lại sau 15 phút"

### AC-1.4: Quên mật khẩu
- **Given** User nhập email đã đăng ký
- **When** Submit form quên mật khẩu
- **Then** Gửi email chứa link reset password (hết hạn sau 1 giờ)
- **And** Không báo lỗi nếu email không tồn tại (bảo mật)

---

## 2. Daily Reports

### AC-2.1: Tạo daily report thành công
- **Given** User là PM hoặc Site Engineer của dự án
- **When** Điền đầy đủ fields required và nhấn "Lưu"
- **Then** Report được tạo thành công
- **And** Redirect đến danh sách reports
- **And** Audit log ghi nhận "Report created"

### AC-2.2: Report có ảnh
- **Given** User đang tạo report
- **When** Upload tối đa 10 ảnh (JPG/PNG, max 5MB/ảnh)
- **Then** Ảnh được lưu và hiển thị trong report
- **And** Hiển thị lỗi nếu: quá 10 ảnh, sai định dạng, quá 5MB

### AC-2.3: Tạo task từ report
- **Given** Report đã được tạo
- **When** Nhấn "Tạo task từ báo cáo"
- **Then** Mở form tạo task với mô tả tự động điền từ report
- **And** Task có liên kết ngược về report

### AC-2.4: Sửa report
- **Given** User là người tạo report (hoặc PM)
- **When** Report chưa quá 7 ngày
- **Then** User có thể sửa report
- **And** Audit log ghi nhận "Report updated"

### AC-2.5: Không sửa report cũ
- **Given** Report đã tạo quá 7 ngày
- **When** User không phải Admin
- **Then** Không thể sửa report (nút sửa bị ẩn/disabled)

---

## 3. Tasks

### AC-3.1: Tạo task
- **Given** User là PM hoặc Site Engineer
- **When** Điền đầy đủ fields required và nhấn "Lưu"
- **Then** Task được tạo thành công
- **And** Người được gán nhận được thông báo (trong app)
- **And** Audit log ghi nhận "Task created"

### AC-3.2: Đổi trạng thái task
- **Given** User là người được giao task (hoặc PM)
- **When** Đổi trạng thái (To Do → In Progress → Done)
- **Then** Trạng thái được cập nhật
- **And** Audit log ghi nhận "Task status changed"
- **And** Hiển thị lịch sử trạng thái

### AC-3.3: Task từ report
- **Given** Task được tạo từ daily report
- **When** Xem chi tiết task
- **Then** Hiển thị liên kết ngược về report nguồn

---

## 4. Projects

### AC-4.1: Tạo project
- **Given** User là Admin
- **When** Điền đầy đủ fields required và nhấn "Lưu"
- **Then** Project được tạo thành công
- **And** Redirect đến chi tiết project
- **And** Audit log ghi nhận "Project created"

### AC-4.2: Thêm member vào project
- **Given** User là Admin hoặc PM của project
- **When** Chọn user và gán role
- **Then** User được thêm vào project
- **And** User đó thấy project trong danh sách
- **And** Audit log ghi nhận "Member added"

---

## 5. File Upload

### AC-5.1: Upload file
- **Given** User là PM hoặc Site Engineer
- **When** Upload file (max 10MB)
- **Then** File được lưu vào project
- **And** Hiển thị trong danh sách files
- **And** Audit log ghi nhận "File uploaded"

### AC-5.2: Download file
- **Given** User là thành viên project
- **When** Click download
- **Then** File được tải về
- **And** Audit log ghi nhận "File downloaded"

---

## 6. Dashboard

### AC-6.1: Dashboard theo role
- **Given** User đăng nhập với role X
- **When** Vào `/dashboard`
- **Then** Hiển thị dữ liệu phù hợp với role X
- **And** Admin thấy toàn hệ thống
- **And** PM chỉ thấy dự án được giao
- **And** Site Engineer chỉ thấy dự án tham gia

### AC-6.2: Số liệu chính xác
- **Given** Có dữ liệu trong hệ thống
- **When** Xem dashboard
- **Then** Số dự án, task, report hiển thị đúng
- **And** Biểu đồ render đúng dữ liệu

---

## 7. Audit Log

### AC-7.1: Ghi nhận hành động
- **Given** User thực hiện hành động (CRUD) trên Report/Task/Project/User/File
- **When** Hành động thành công
- **Then** Audit log được ghi với: user, action, entity type, entity ID, timestamp

### AC-7.2: Xem audit log
- **Given** User là Admin hoặc PM
- **When** Vào `/audit-logs`
- **Then** Hiển thị danh sách log theo phạm vi role
- **And** Filter được theo thời gian, user, action

---

## 8. Mobile Web

### AC-8.1: Responsive
- **Given** User mở trên mobile (viewport <= 768px)
- **When** Truy cập các trang chính
- **Then** Giao diện responsive, không bị vỡ layout
- **And** Bottom navigation hiển thị đúng

### AC-8.2: Nhập report trên mobile
- **Given** Site Engineer mở trên mobile
- **When** Tạo daily report
- **Then** Form hiển thị đầy đủ
- **And** Upload ảnh từ camera/gallery hoạt động
- **And** Submit thành công

---

## 9. Permission

### AC-9.1: Viewer không thể tạo/sửa/xóa
- **Given** User là Viewer
- **When** Truy cập các trang
- **Then** Chỉ thấy dữ liệu (read-only)
- **And** Các nút tạo/sửa/xóa bị ẩn

### AC-9.2: PM không thấy dự án khác
- **Given** User là PM của project A
- **When** Vào danh sách dự án
- **Then** Chỉ thấy project A
- **And** Không thể truy cập project B qua URL trực tiếp (403)

### AC-9.3: Site Engineer chỉ sửa report của mình
- **Given** Site Engineer A tạo report
- **When** Site Engineer B thử sửa report đó
- **Then** Bị từ chối (403)
