# Master Plan Vận Hành Giai Đoạn 0 → 9

Mục tiêu: dùng 1 tài liệu trung tâm để điều phối toàn bộ quy trình từ khởi tạo đến trước pilot.

## 1) Trạng thái tổng thể hiện tại
- GĐ0: **Partial** (đã có charter, cần điền owner thật)
- GĐ1: **Done** (scope lock + in/out scope + user flow)
- GĐ2: **Partial** (doc đầy đủ, cần đóng khoảng cách doc-vs-implementation)
- GĐ3: **Partial** (khung kỹ thuật có, cần enforcement quality gate thực thi)
- GĐ4: **Partial** (data core có, cần checklist index/soft-delete/retention rõ)
- GĐ5: **Done** (skeleton E2E hoàn thành: docker-compose, CI 4 jobs, smoke-test script, README)
- GĐ6: **Code Done — Gate Pending** (8/8 slices code hoàn thành; chờ UAT mini + smoke test thực tế)
- GĐ7: **Not Started**
- GĐ8: **Not Started**
- GĐ9: **Not Started**

## 2) Tài liệu điều phối theo giai đoạn
- GĐ0-2: `PROJECT_CHARTER.md`, `SCOPE.md`, `FEATURES_PHASE1.md`, `OUT_OF_SCOPE.md`, `USER_FLOW.md`, `SITEMAP.md`, `SCREENS.md`, `PERMISSION_MATRIX.md`, `ACCEPTANCE_CRITERIA.md`, `DOC_IMPLEMENTATION_MATRIX.md`
- GĐ3-5: `TECHNICAL_DESIGN.md`, `TECH_GOVERNANCE.md`, `DB_SCHEMA.md`, `API_CONVENTIONS.md`, `SKELETON_AND_SLICES_PLAN.md`
- GĐ6: `PHASE6_VERTICAL_SLICE_TRACKER.md`
- GĐ7: `PHASE7_TEST_STRATEGY.md`, `PHASE7_UAT_CHECKLIST.md`
- GĐ8: `PHASE8_UX_HARDENING_CHECKLIST.md`
- GĐ9: `PHASE9_PRE_PILOT_QUALITY_GATE.md`

## 3) Quy tắc vận hành bắt buộc
1. Không mở giai đoạn sau khi giai đoạn trước chưa đạt gate.
2. Mọi thay đổi scope đi qua CR.
3. Mỗi slice phải có evidence (test/log/demo/checklist).
4. Không release nếu chưa qua Phase 9 gate.

## 4) Nhịp cập nhật đề xuất
- Mỗi tuần 1 lần: cập nhật `DOC_IMPLEMENTATION_MATRIX.md` + tracker slice.
- Mỗi sprint close: rà soát gate theo `TECH_GOVERNANCE.md`.
- Trước pilot: chạy full checklists của GĐ7-9.

## 5) Definition of Complete cho GĐ0 → 9
- Toàn bộ tài liệu có trạng thái cập nhật trong 7 ngày gần nhất.
- Các checklist GĐ6-9 có bằng chứng đi kèm.
- Không còn mục P0/P1 mở.
- 6 luồng nghiệp vụ cốt lõi pass UAT.
