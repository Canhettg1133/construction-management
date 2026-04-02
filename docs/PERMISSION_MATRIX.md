# Permission Matrix — Phase 1

## Role hệ thống vs Action

| Action | Admin | PM | Site Engineer | Viewer |
|--------|-------|----|---------------|--------|
| **Auth** |
| Đăng nhập | ✅ | ✅ | ✅ | ✅ |
| Đăng xuất | ✅ | ✅ | ✅ | ✅ |
| Quên mật khẩu | ✅ | ✅ | ✅ | ✅ |
| Đổi mật khẩu | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| Xem danh sách user | ✅ Toàn bộ | ❌ | ❌ | ❌ |
| Tạo user | ✅ | ❌ | ❌ | ❌ |
| Sửa user | ✅ | ❌ | ❌ | ❌ |
| Khóa/mở user | ✅ | ❌ | ❌ | ❌ |
| Reset mật khẩu user | ✅ | ❌ | ❌ | ❌ |
| **Project** |
| Xem tất cả dự án | ✅ | ❌ (chỉ dự án được giao) | ❌ (chỉ dự án tham gia) | ❌ (chỉ dự án được mời) |
| Tạo dự án | ✅ | ❌ | ❌ | ❌ |
| Sửa dự án | ✅ | ✅ (dự án được giao) | ❌ | ❌ |
| Xóa dự án | ✅ | ❌ | ❌ | ❌ |
| **Members** |
| Xem members | ✅ | ✅ | ✅ | ✅ |
| Thêm member | ✅ | ✅ | ❌ | ❌ |
| Xóa member | ✅ | ✅ | ❌ | ❌ |
| Đổi role member | ✅ | ✅ | ❌ | ❌ |
| **Daily Reports** |
| Xem reports | ✅ | ✅ | ✅ | ✅ |
| Tạo report | ✅ | ✅ | ✅ | ❌ |
| Sửa report | ✅ | ✅ | ✅ (của mình, trong 7 ngày) | ❌ |
| Xóa report | ✅ | ✅ | ❌ | ❌ |
| Tạo task từ report | ✅ | ✅ | ✅ | ❌ |
| **Tasks** |
| Xem tasks | ✅ | ✅ | ✅ | ✅ |
| Tạo task | ✅ | ✅ | ✅ | ❌ |
| Sửa task | ✅ | ✅ | ✅ (của mình) | ❌ |
| Đổi trạng thái task | ✅ | ✅ | ✅ (task được giao) | ❌ |
| Xóa task | ✅ | ✅ | ❌ | ❌ |
| **Files** |
| Xem files | ✅ | ✅ | ✅ | ✅ |
| Upload file | ✅ | ✅ | ✅ | ❌ |
| Download file | ✅ | ✅ | ✅ | ✅ |
| Xóa file | ✅ | ✅ | ❌ | ❌ |
| **Dashboard** |
| Xem dashboard | ✅ Toàn hệ thống | ✅ Dự án được giao | ✅ Dự án tham gia | ✅ Xem-only |
| **Audit Logs** |
| Xem audit logs | ✅ Toàn bộ | ✅ Dự án được giao | ❌ | ❌ |
| **Settings** |
| Sửa profile | ✅ | ✅ | ✅ | ✅ |
| Đổi mật khẩu | ✅ | ✅ | ✅ | ✅ |

---

## Scope dữ liệu theo role

| Role | Phạm vi dữ liệu |
|------|-----------------|
| **Admin** | Toàn bộ hệ thống — tất cả projects, users, reports, tasks, files, logs |
| **PM** | Chỉ các dự án được gán làm PM — members, reports, tasks, files của dự án đó |
| **Site Engineer** | Chỉ các dự án được tham gia — tạo report, upload file, cập nhật task được giao |
| **Viewer** | Chỉ các dự án được mời — xem tất cả, không tạo/sửa/xóa |

---

## Ghi chú
- Admin luôn có quyền cao nhất, override mọi rule
- PM của dự án A không thấy dữ liệu dự án B
- Site Engineer chỉ sửa report của chính mình (trong 7 ngày)
- Viewer hoàn toàn read-only
