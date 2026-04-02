# Scope — Quản Lý Công Trình (Phase 1)

## 1. Mục tiêu sản phẩm
Xây dựng hệ thống quản lý công trình xây dựng **phase 1**, tập trung vào các nghiệp vụ cốt lõi:
- Quản lý dự án
- Quản lý thành viên trong dự án
- Báo cáo ngày (daily reports)
- Quản lý task
- Quản lý file / tài liệu
- Dashboard cơ bản
- Audit log

## 2. Nhóm người dùng
| Role | Mô tả |
|------|-------|
| **Admin** | Quản trị hệ thống, quản lý user, phân quyền, xem toàn bộ |
| **Project Manager (PM)** | Quản lý dự án được giao, duyệt/xem báo cáo, theo dõi task |
| **Site Engineer** | Tạo báo cáo ngày, upload ảnh/tài liệu, cập nhật tiến độ task |
| **Viewer** | Chỉ xem, không được tạo/sửa/xóa |

## 3. Nguyên tắc phạm vi
- **Làm ít nhưng chạy thật** — chỉ làm những gì cần thiết để luồng chính hoạt động
- **Không tự mở rộng scope** — mọi tính năng ngoài danh sách phải được duyệt
- **Mobile web ưu tiên** — Site Engineer cần nhập báo cáo tại công trường

## 4. Thời gian phase 1
- Mục tiêu: MVP chạy được luồng chính
- Không bao gồm: tính năng nâng cao, tích hợp bên thứ 3 phức tạp

## 5. Ưu tiên phạm vi (MoSCoW)
### Must-have
- Auth + phân quyền role
- User management (Admin)
- Project management + project members
- Daily reports + ảnh
- Tasks (bao gồm tạo từ report)
- Files cơ bản
- Dashboard cơ bản theo role
- Audit log cho hành động chính

### Should-have
- Reset password qua email
- Lọc/tìm kiếm nâng cao cho reports/tasks/files
- Trải nghiệm mobile web tối ưu cho nhập báo cáo

### Could-have
- Export dữ liệu đơn giản (CSV)
- Widget dashboard mở rộng mức nhẹ

### Won’t-have (phase 1)
- Safety, QA/QC, inventory, equipment
- Approval nhiều tầng
- Notification phức tạp
- Dashboard nâng cao
- AI copilot

## 6. Quy trình kiểm soát thay đổi scope (Change Request)
1. Mọi yêu cầu ngoài Must/Should/Could hiện tại phải tạo CR.
2. CR phải ghi: lý do nghiệp vụ, tác động timeline, tác động kỹ thuật, rủi ro.
3. Chỉ Product Owner/Project Owner mới có quyền duyệt CR.
4. CR được duyệt sẽ cập nhật đồng thời: `SCOPE.md`, `FEATURES_PHASE1.md`, `ACCEPTANCE_CRITERIA.md`.
5. Nếu CR làm trễ mốc bàn giao phase 1, tự động đẩy sang phase 2 trừ khi có phê duyệt đặc biệt.
