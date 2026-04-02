# Giai đoạn 8 — UX Hardening Checklist (Desktop + Mobile Web)

Mục tiêu: đảm bảo hệ thống dùng được trong bối cảnh thực tế, đặc biệt mobile cho Site Engineer.

## 1) Desktop Priority Flows
- [ ] Dashboard: số liệu đọc nhanh, không quá tải.
- [ ] Project management: list/filter/detail rõ ràng.
- [ ] User management: tạo/sửa/khóa user không rườm rà.
- [ ] Report review: PM/Admin duyệt/xem report mượt.
- [ ] Task tracking: lọc/sắp xếp trạng thái hiệu quả.

## 2) Mobile Priority Flows
- [ ] Tạo daily report đầy đủ field trên màn hình nhỏ.
- [ ] Upload nhiều ảnh (camera/gallery) ổn định.
- [ ] Cập nhật task nhanh với số thao tác tối thiểu.
- [ ] Điều hướng chính (Home/Projects/Reports/Tasks/Profile) dễ dùng.

## 3) UX Quality Criteria
- [ ] Không vỡ layout ở viewport <= 768px.
- [ ] Form validation hiển thị rõ, không mơ hồ.
- [ ] Nút hành động chính (primary CTA) luôn nhìn thấy.
- [ ] Trạng thái loading/success/error rõ ràng.
- [ ] Bảng/task list mobile có thể thao tác được (scroll/filter cơ bản).

## 4) Performance & Usability Baseline
- [ ] Thời gian mở màn hình report chấp nhận được trên 4G.
- [ ] Submit report không timeout trong điều kiện mạng trung bình.
- [ ] Upload ảnh nhiều file không gây treo UI.
- [ ] Tối ưu ảnh preview để tránh payload quá lớn.

## 5) UX Test Session Template
- Người test: ...
- Thiết bị: ...
- Trình duyệt: ...
- Flow chạy: ...
- Vấn đề phát hiện: ...
- Mức độ: P1/P2/P3
- Đề xuất cải tiến: ...

## 6) Exit Criteria Giai đoạn 8
- Desktop flow lõi pass theo checklist.
- Mobile flow báo cáo ngày pass end-to-end.
- Không còn UX bug mức P1 mở.
