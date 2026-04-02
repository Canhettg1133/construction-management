# User Flow Chính — Phase 1

## Luồng 1: Đăng nhập → Dashboard
```
User nhập email/password
  → Hệ thống xác thực
  → Redirect theo role:
     - Admin → Dashboard toàn hệ thống
     - PM → Dashboard dự án được giao
     - Site Engineer → Dashboard dự án tham gia
     - Viewer → Dashboard xem-only
```

## Luồng 2: Quản lý dự án
```
Admin/PM vào Projects
  → Xem danh sách dự án
  → Tạo dự án mới (Admin)
  → Vào chi tiết dự án:
     - Tab Overview: thông tin chung
     - Tab Members: quản lý thành viên
     - Tab Daily Reports: xem báo cáo
     - Tab Tasks: theo dõi task
     - Tab Files: tài liệu dự án
```

## Luồng 3: Tạo Daily Report
```
Site Engineer/PM vào Project → Daily Reports
  → Nhấn "Tạo báo cáo"
  → Điền form:
     - Ngày (mặc định hôm nay)
     - Thời tiết
     - Số công nhân tại công trường
     - Mô tả công việc hôm nay
     - Progress tổng thể (%)
     - Upload ảnh (tối đa 10)
  → Lưu → Hệ thống ghi audit log
  → (Optional) Tạo task ngay từ báo cáo
```

## Luồng 4: Tạo & Theo dõi Task
```
PM/Site Engineer vào Project → Tasks
  → Tạo task mới:
     - Tiêu đề
     - Mô tả
     - Người phụ trách (chọn từ members)
     - Deadline
     - Ưu tiên (Low / Medium / High)
  → Người được gán nhận task → cập nhật trạng thái
  → PM theo dõi tiến độ qua dashboard
```

## Luồng 5: Admin quản lý User & Quyền
```
Admin vào Users
  → Xem danh sách user
  → Tạo user mới (gán role hệ thống)
  → Gán user vào dự án (vào Project → Members)
  → Khóa/mở user
  → Reset mật khẩu
  → Xem audit log toàn hệ thống
```

## Luồng 6: Upload & Quản lý File
```
PM/Site Engineer vào Project → Files
  → Upload file (kéo thả hoặc chọn)
  → Xem danh sách file
  → Download / xem file
  → Xóa file (PM, Admin)
```

## Luồng 7: Xem Dashboard
```
User đăng nhập → Dashboard
  → Admin:
     - Tổng số dự án, user, báo cáo hôm nay
     - Task theo trạng thái toàn hệ thống
  → PM:
     - Dự án được giao
     - Task đang mở, báo cáo mới nhất
  → Site Engineer:
     - Dự án tham gia
     - Task được giao, báo cáo đã tạo
  → Viewer:
     - Thông tin xem-only
```
