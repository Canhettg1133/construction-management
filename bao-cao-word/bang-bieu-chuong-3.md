# Bảng biểu Chương 3

Tài liệu này gồm đầy đủ 6 bảng để chèn vào Chương 3 của báo cáo.

## Bảng 3.3.1: Kế hoạch và lịch trình thực hiện dự án

| STT | Giai đoạn thực hiện | Nội dung công việc chính | Sản phẩm đầu ra | Thời gian dự kiến |
|-----|----------------------|--------------------------|-----------------|-------------------|
| 1 | Khảo sát và thu thập yêu cầu | Tìm hiểu quy trình quản lý thi công, xác định bài toán, thu thập yêu cầu nghiệp vụ từ thực tế doanh nghiệp | Tài liệu khảo sát, danh sách yêu cầu ban đầu | Tuần 1 |
| 2 | Phân tích hệ thống | Xác định tác nhân, phân hệ chức năng, phạm vi hệ thống, luồng xử lý chính | Tài liệu phân tích bài toán, mô tả chức năng | Tuần 2 |
| 3 | Thiết kế hệ thống | Thiết kế kiến trúc tổng thể, thiết kế cơ sở dữ liệu, thiết kế sơ đồ Use Case và mô hình triển khai | Sơ đồ kiến trúc, sơ đồ Use Case, mô hình dữ liệu | Tuần 3 |
| 4 | Xây dựng cơ sở dữ liệu | Xây dựng schema dữ liệu, quan hệ bảng, migration và seed dữ liệu mẫu | Cơ sở dữ liệu MySQL, schema Prisma | Tuần 4 |
| 5 | Phát triển backend | Xây dựng API, xử lý nghiệp vụ, xác thực, phân quyền, kiểm tra dữ liệu đầu vào và kết nối cơ sở dữ liệu | Hệ thống API backend hoàn chỉnh | Tuần 5 - Tuần 7 |
| 6 | Phát triển frontend | Xây dựng giao diện người dùng, điều hướng hệ thống, kết nối API, hiển thị dashboard và các phân hệ chức năng | Giao diện web hoàn chỉnh | Tuần 6 - Tuần 8 |
| 7 | Tích hợp và hoàn thiện các phân hệ | Tích hợp frontend và backend, đồng bộ dữ liệu, kiểm tra luồng xử lý thực tế giữa các chức năng | Phiên bản tích hợp dùng thử | Tuần 9 |
| 8 | Kiểm thử và hiệu chỉnh | Kiểm thử chức năng, kiểm thử phân quyền, sửa lỗi và tối ưu trải nghiệm sử dụng | Phiên bản ổn định hơn của hệ thống | Tuần 10 |
| 9 | Hoàn thiện tài liệu và báo cáo | Tổng hợp kết quả, viết báo cáo đồ án, bổ sung hình ảnh, bảng biểu và nhận xét đánh giá | Báo cáo hoàn chỉnh và sản phẩm nộp | Tuần 11 - Tuần 12 |

## Bảng 3.3.2: Phân công nhân sự thực hiện dự án

| STT | Nhân sự / Nhóm tham gia | Vai trò | Nhiệm vụ chính | Ghi chú |
|-----|--------------------------|---------|----------------|---------|
| 1 | Sinh viên thực hiện | Người phân tích, thiết kế và lập trình hệ thống | Khảo sát yêu cầu, phân tích bài toán, thiết kế cơ sở dữ liệu, phát triển frontend, phát triển backend, kiểm thử và hoàn thiện báo cáo | Là người triển khai chính của đề tài |
| 2 | Giảng viên hướng dẫn | Người hướng dẫn chuyên môn | Góp ý cấu trúc đề tài, định hướng nội dung thực hiện, nhận xét và điều chỉnh các phần chưa phù hợp | Đóng vai trò cố vấn học thuật |
| 3 | Đại diện doanh nghiệp / người hướng dẫn tại đơn vị | Người hỗ trợ nghiệp vụ | Cung cấp thông tin về quy trình quản lý thi công, góp ý bài toán thực tế và xác nhận tính phù hợp của hệ thống | Hỗ trợ giai đoạn khảo sát và đối chiếu nghiệp vụ |
| 4 | Người dùng nghiệp vụ | Đối tượng tham gia khai thác hệ thống | Cung cấp yêu cầu sử dụng, tham gia góp ý giao diện và luồng xử lý, hỗ trợ kiểm tra tính thực tế của chức năng | Gồm các vai trò như kỹ sư, cán bộ an toàn, cán bộ chất lượng, thủ kho |
| 5 | Người kiểm thử | Nhóm dùng thử hệ thống | Kiểm tra các chức năng chính, ghi nhận lỗi, đối chiếu kết quả mong đợi và kết quả thực tế | Có thể do sinh viên kết hợp người dùng nghiệp vụ thực hiện |

## Bảng 3.4.1: Ma trận phân quyền của hệ thống

| Vai trò | Dự án | Công việc | Báo cáo ngày | Tài liệu / Tệp tin | An toàn | Chất lượng | Kho vật tư | Ngân sách | Ghi chú |
|---------|-------|-----------|--------------|---------------------|---------|------------|------------|-----------|---------|
| Quản trị viên hệ thống | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Có quyền cấp công ty, có thể truy cập toàn bộ hệ thống |
| Trưởng dự án | Toàn quyền trong dự án | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Quản lý tổng thể dự án và các phân hệ liên quan |
| Kỹ sư công trường | Xem | Thêm / sửa | Thêm / sửa | Thêm / sửa | Xem | Thêm / sửa | Xem | Không | Phù hợp với vai trò triển khai và cập nhật dữ liệu hiện trường |
| Cán bộ an toàn | Xem | Thêm / sửa | Thêm / sửa | Thêm / sửa | Toàn quyền | Thêm / sửa | Xem | Không | Ưu tiên quyền trên phân hệ an toàn |
| Kỹ sư thiết kế | Xem | Xem | Xem | Thêm / sửa | Không | Thêm / sửa | Không | Không | Chủ yếu phục vụ tài liệu và chất lượng |
| Cán bộ chất lượng | Xem | Thêm / sửa | Thêm / sửa | Thêm / sửa | Thêm / sửa | Toàn quyền | Thêm / sửa | Không | Ưu tiên quyền trên phân hệ chất lượng |
| Thủ kho vật tư | Xem | Không | Không | Thêm / sửa | Không | Thêm / sửa | Toàn quyền | Không | Chịu trách nhiệm chính ở phân hệ kho vật tư |
| Chủ đầu tư / Giám sát | Xem | Xem | Xem | Xem | Không | Xem | Không | Xem | Chủ yếu theo dõi thông tin dự án và kết quả triển khai |
| Người xem | Xem | Xem | Xem | Xem | Không | Xem | Không | Không | Không được tạo, sửa hoặc xóa dữ liệu |

## Bảng 3.5.1: Bảng ước lượng rủi ro

| STT | Rủi ro | Nguyên nhân | Mức độ ảnh hưởng | Khả năng xảy ra | Biện pháp giảm thiểu |
|-----|--------|-------------|------------------|------------------|----------------------|
| 1 | Hiểu sai yêu cầu nghiệp vụ | Quy trình thực tế trong doanh nghiệp phức tạp, nhiều nghiệp vụ thay đổi theo từng dự án | Cao | Trung bình | Khảo sát kỹ hiện trạng, trao đổi thường xuyên với người dùng, mô tả yêu cầu rõ ràng trước khi lập trình |
| 2 | Thiết kế cơ sở dữ liệu chưa hợp lý | Chưa xác định đầy đủ quan hệ dữ liệu giữa các phân hệ | Cao | Trung bình | Thiết kế schema từ sớm, rà soát quan hệ bảng, thử nghiệm migration và dữ liệu mẫu |
| 3 | Phân quyền chưa chặt chẽ | Hệ thống có nhiều vai trò và nhiều mức quyền khác nhau | Cao | Trung bình | Xây dựng mô hình phân quyền hai cấp, kiểm thử middleware xác thực và quyền truy cập |
| 4 | Lỗi khi tích hợp frontend và backend | Dữ liệu truyền nhận không đồng nhất hoặc sai định dạng | Trung bình | Cao | Dùng shared types, kiểm tra API, kiểm thử từng luồng chính sau khi tích hợp |
| 5 | Khó kiểm soát phạm vi dự án | Hệ thống có nhiều phân hệ, dễ phát sinh thêm yêu cầu ngoài phạm vi ban đầu | Cao | Trung bình | Xác định phạm vi rõ từ đầu, ưu tiên các chức năng cốt lõi, tránh mở rộng quá mức |
| 6 | Thiếu dữ liệu kiểm thử thực tế | Không có nhiều dữ liệu thật từ doanh nghiệp để mô phỏng đầy đủ tình huống | Trung bình | Trung bình | Tạo dữ liệu mẫu, xây dựng seed và kiểm thử bằng nhiều tình huống giả lập |
| 7 | Chậm tiến độ thực hiện | Khối lượng công việc lớn, thời gian làm đồ án có hạn | Cao | Trung bình | Lập kế hoạch theo tuần, ưu tiên chức năng quan trọng trước, theo dõi tiến độ thường xuyên |
| 8 | Lỗi bảo mật cơ bản | Xử lý xác thực, cookie hoặc phân quyền chưa đầy đủ | Cao | Thấp | Sử dụng JWT, cookie httpOnly, middleware xác thực, phân quyền và rate limit |
| 9 | Khó bảo trì khi hệ thống mở rộng | Mã nguồn không tách module rõ ràng | Trung bình | Thấp | Tổ chức code theo module, tách route, controller, service, repository và validation |
| 10 | Giao diện chưa thân thiện với người dùng | Nhiều phân hệ, người dùng không chuyên CNTT dễ khó sử dụng | Trung bình | Trung bình | Thiết kế giao diện rõ ràng, bố cục hợp lý, kiểm tra thủ công theo các luồng sử dụng thật |

## Bảng 3.6.1: Bảng ước lượng chi phí

| STT | Hạng mục chi phí | Nội dung | Chi phí ước lượng (VNĐ) |
|-----|------------------|----------|--------------------------|
| 1 | Khảo sát và phân tích yêu cầu | Tìm hiểu bài toán, xác định yêu cầu, xây dựng tài liệu mô tả ban đầu | 500.000 |
| 2 | Thiết kế hệ thống | Thiết kế kiến trúc tổng thể, cơ sở dữ liệu, sơ đồ chức năng và mô hình triển khai | 800.000 |
| 3 | Phát triển backend | Xây dựng API, xử lý nghiệp vụ, xác thực, phân quyền và kết nối cơ sở dữ liệu | 1.200.000 |
| 4 | Phát triển frontend | Xây dựng giao diện, điều hướng, dashboard và tích hợp API | 1.200.000 |
| 5 | Kiểm thử và hiệu chỉnh | Kiểm tra chức năng, sửa lỗi, hoàn thiện luồng xử lý | 700.000 |
| 6 | Triển khai môi trường | Cấu hình môi trường phát triển, cơ sở dữ liệu và dữ liệu mẫu | 400.000 |
| 7 | Hoàn thiện tài liệu và báo cáo | Viết báo cáo, vẽ sơ đồ, chụp hình minh họa và chỉnh sửa nội dung | 600.000 |
| 8 | Chi phí dự phòng | Dự phòng cho các phát sinh nhỏ trong quá trình thực hiện | 600.000 |
|   | Tổng cộng |   | 6.000.000 |

## Bảng 3.10.1: Danh sách kiểm thử các chức năng chính

| STT | Chức năng kiểm thử | Nội dung kiểm thử | Điều kiện / Dữ liệu kiểm thử | Kết quả mong đợi | Kết quả thực tế |
|-----|--------------------|-------------------|------------------------------|------------------|-----------------|
| 1 | Đăng nhập hệ thống | Kiểm tra đăng nhập với tài khoản hợp lệ | Email và mật khẩu đúng | Đăng nhập thành công, tạo phiên làm việc hợp lệ | Đạt |
| 2 | Đăng nhập hệ thống | Kiểm tra đăng nhập với mật khẩu sai | Email đúng, mật khẩu sai | Hệ thống thông báo lỗi, không tạo phiên đăng nhập | Đạt |
| 3 | Quản lý dự án | Kiểm tra tạo mới dự án | Người dùng có quyền tạo dự án, dữ liệu nhập đầy đủ | Dự án mới được tạo thành công và hiện trong danh sách | Đạt |
| 4 | Quản lý dự án | Kiểm tra cập nhật thông tin dự án | Dự án đã tồn tại, người dùng có quyền sửa | Thông tin dự án được cập nhật đúng trong hệ thống | Đạt |
| 5 | Quản lý công việc | Kiểm tra tạo công việc mới | Người dùng có quyền, nhập đầy đủ tiêu đề, người được giao và trạng thái | Công việc được tạo và gắn với dự án tương ứng | Đạt |
| 6 | Quản lý công việc | Kiểm tra cập nhật trạng thái công việc | Công việc đã tồn tại | Trạng thái được cập nhật đúng và hiển thị chính xác | Đạt |
| 7 | Báo cáo ngày | Kiểm tra tạo báo cáo ngày | Người dùng có quyền, nhập đầy đủ ngày báo cáo, thời tiết, nội dung công việc | Báo cáo ngày được lưu thành công | Đạt |
| 8 | Báo cáo ngày | Kiểm tra gửi báo cáo cho phê duyệt | Báo cáo đã tạo hợp lệ | Trạng thái báo cáo chuyển sang chờ duyệt hoặc đã gửi | Đạt |
| 9 | Tài liệu và tệp tin | Kiểm tra tải tệp lên hệ thống | Tệp hợp lệ, người dùng có quyền tải lên | Tệp được lưu và hiện trong danh sách tài liệu | Đạt |
| 10 | Tài liệu và tệp tin | Kiểm tra tìm kiếm tài liệu | Nhập tên hoặc nhãn của tài liệu | Hệ thống trả về danh sách tài liệu phù hợp | Đạt |
| 11 | Quản lý an toàn | Kiểm tra tạo báo cáo an toàn | Người dùng có quyền trên phân hệ an toàn | Báo cáo an toàn được tạo và lưu đúng dự án | Đạt |
| 12 | Quản lý chất lượng | Kiểm tra tạo báo cáo chất lượng | Người dùng có quyền trên phân hệ chất lượng | Báo cáo chất lượng được tạo thành công | Đạt |
| 13 | Quản lý kho vật tư | Kiểm tra cập nhật tồn kho sau giao dịch | Có giao dịch nhập hoặc xuất vật tư | Số lượng tồn kho thay đổi đúng theo giao dịch | Đạt |
| 14 | Quản lý ngân sách | Kiểm tra tạo khoản mục ngân sách | Người dùng có quyền, dữ liệu chi phí hợp lệ | Khoản mục ngân sách được tạo và hiện trong danh sách | Đạt |
| 15 | Phê duyệt | Kiểm tra phê duyệt hoặc từ chối nội dung chờ duyệt | Có công việc hoặc báo cáo đang chờ xử lý | Hệ thống cập nhật đúng trạng thái phê duyệt | Đạt |
| 16 | Phân quyền hệ thống | Kiểm tra người dùng không đủ quyền truy cập chức năng | Đăng nhập bằng tài khoản không đủ quyền | Hệ thống từ chối truy cập và hiện thông báo phù hợp | Đạt |

## Gợi ý chèn vào Word

- Đặt tên bảng ở phía trên bảng theo đúng mẫu:
  + `Bảng 3.3.1: Kế hoạch và lịch trình thực hiện dự án`
- Nếu cần dùng danh mục bảng tự động:
  + Chọn bảng
  + Vào `References` -> `Insert Caption`
  + Tạo nhãn `Bảng`
  + Chọn `Position`: `Above selected item`
- Nếu bảng rộng:
  + Dùng khổ ngang trang
  + Có thể chọn `Layout` -> `AutoFit Window`
