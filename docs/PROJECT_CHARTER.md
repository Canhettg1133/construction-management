# Project Charter — Construction Management Phase 1

## 1. Business Objective
Xây dựng hệ thống quản lý công trình phase 1 giúp chuẩn hóa vận hành hằng ngày tại công trường và văn phòng, tập trung vào chuỗi nghiệp vụ:
`Đăng nhập → Quản lý dự án → Báo cáo ngày → Phát sinh task → Theo dõi tiến độ`.

## 2. Success Metrics (KPI)
### KPI sản phẩm
- >= 90% báo cáo ngày được nộp đúng hạn trong pilot.
- >= 80% task phát sinh từ report được cập nhật trạng thái trong vòng 48 giờ.
- >= 95% API lõi (auth/projects/reports/tasks) phản hồi thành công trong điều kiện dữ liệu hợp lệ.

### KPI vận hành kỹ thuật
- Build + typecheck pass 100% trước mỗi bản staging.
- Không có lỗi phân quyền mức nghiêm trọng (P0/P1) trước pilot.
- Tỷ lệ lỗi server 5xx < 1% trong pilot.

## 3. Scope Boundary
- Scope phase 1 theo các tài liệu: `SCOPE.md`, `FEATURES_PHASE1.md`, `OUT_OF_SCOPE.md`, `USER_FLOW.md`.
- Mọi thay đổi scope phải qua Change Request (CR) theo quy trình đã nêu ở `SCOPE.md`.

## 4. Timeline Guardrail (định hướng)
- Giai đoạn 0-3: khóa phạm vi + blueprint sản phẩm + blueprint kỹ thuật.
- Giai đoạn 4-6: data core + skeleton + vertical slices lõi.
- Pilot chỉ được mở khi hoàn tất quality gate pre-pilot.

## 5. Roles & Decision Owner
- **Project Owner (Final approver):** Trần Minh Quân
- **Product Owner (nghiệp vụ):** Nguyễn Thu Hà
- **Tech Lead (kỹ thuật):** Lê Hoàng Nam
- **QA/UAT Owner:** Phạm Gia Linh

> Lưu ý: Đây là tên mẫu để test quy trình. Cần thay bằng tên thật trước khi áp dụng chính thức.

## 6. Key Risks & Mitigation
1. **Scope creep**
   - Mitigation: CR bắt buộc, phân loại Must/Should/Could, freeze scope theo mốc.
2. **Lệch tài liệu và code thực tế**
   - Mitigation: duy trì `DOC_IMPLEMENTATION_MATRIX.md` và rà soát mỗi tuần.
3. **Rủi ro phân quyền sai**
   - Mitigation: test matrix quyền theo role ở mỗi slice.
4. **Rủi ro UX mobile khi nhập báo cáo**
   - Mitigation: ưu tiên test mobile cho luồng tạo report + upload ảnh.
5. **Nợ kỹ thuật tăng nhanh**
   - Mitigation: bắt buộc quality gate (typecheck/build/test) trước merge/release.

## 7. Exit Criteria for Phase 1
- Hoàn tất các tính năng Must-have.
- 6 luồng nghiệp vụ cốt lõi pass UAT.
- Pilot nhóm nhỏ ổn định và không còn lỗi P0/P1.
- Có checklist vận hành production: backup, rollback, monitoring cơ bản.
