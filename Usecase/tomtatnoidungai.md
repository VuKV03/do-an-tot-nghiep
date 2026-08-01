# TỔNG HỢP VÀ TÓM TẮT TẤT CẢ CÁC CHỨC NĂNG DỰ ÁN QUẢN LÝ THI TRẮC NGHIỆM AI

Tài liệu này tổng hợp toàn bộ các chức năng hệ thống **Quản lý ngân hàng câu hỏi, Sinh đề thi và Tổ chức thi trực tuyến tích hợp AI**. Hệ thống được chia thành 2 nhóm chức năng chính: **Chức năng Truyền thống (Non-AI)** và **Chức năng Trí tuệ nhân tạo (AI)**.

---

## 1. TOÀN BỘ CHỨC NĂNG NON-AI (TRUYỀN THỐNG / NGHIỆP VỤ CỐT LÕI)

Các chức năng Non-AI đảm bảo tính ổn định, toàn vẹn dữ liệu và luồng nghiệp vụ vận hành chuẩn xác của hệ thống.

### 1.1. Quản lý Tài khoản & Phân quyền (User & Security Management)

* **Xác thực người dùng:** Đăng nhập, đăng xuất, đổi mật khẩu, cập nhật thông tin hồ sơ cá nhân.
* **Quản lý Phân quyền (RBAC):** Phân chia vai trò rõ ràng gồm Admin (Quản trị hệ thống), TPGV (Trưởng phòng giáo vụ), TTBM (Tổ trưởng bộ môn), GVBM (Giáo viên bộ môn), Thí sinh / Sinh viên.
* **Quản lý Nhóm người dùng & Quyền hạn:** Tạo nhóm người dùng (`user_groups`), gán/rút quyền (`permissions`) theo từng module chức năng.

### 1.2. Quản lý Danh mục Hệ thống (Category Management)

* **Quản lý Môn học:** Khởi tạo, cập nhật môn học (`subject_categories`), cấu hình tham số môn học (`subject_configs`).
* **Quản lý Khối lớp / Trình độ:** Quản lý danh mục các khối lớp/năm học (`grade_levels`).
* **Quản lý Mức độ tư duy:** Danh mục độ khó câu hỏi (`cognitive_levels`): Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
* **Quản lý Thành phần năng lực:** Quản lý các chuẩn đầu ra/năng lực của môn học (`competency_components`).
* **Quản lý Dạng câu hỏi:** Cấu hình các loại câu hỏi (`question_types`): Trắc nghiệm chọn 1 đáp án, Đúng/Sai, Điền từ, Khớp nối...

### 1.3. Quản lý Ngân hàng Câu hỏi (Question Bank Management)

* **Quản lý Chủ đề / Bài học:** Quản lý phân cây chủ đề/bài học (`topics`) theo môn học và khối lớp.
* **Quản lý Câu hỏi thủ công:** Thêm mới, chỉnh sửa, xóa, tìm kiếm và lọc câu hỏi theo môn, bài học, độ khó, dạng câu hỏi.
* **Quản lý Đáp án & Lời giải:** Lưu trữ các phương án lựa chọn, đánh dấu đáp án đúng và lời giải chi tiết cho câu hỏi.
* **Quy trình Phê duyệt câu hỏi:** Quản lý vòng đời câu hỏi qua các trạng thái (Nháp -> Chờ duyệt -> Đã duyệt -> Rác/Ẩn).
* **Lưu lịch sử thay đổi:** Ghi vết lịch sử chỉnh sửa câu hỏi (`question_histories`) và lịch sử chủ đề (`topic_histories`).

### 1.4. Quản lý Ma trận & Tạo Đề thi (Exam Generation)

* **Quản lý Cấu trúc / Ma trận đề thi:** Thiết lập ma trận đề (`matrix_configs`) định nghĩa tỉ lệ câu hỏi theo bài học, mức độ tư duy và thành phần năng lực.
* **Khởi tạo Đề gốc (Original Exams):** Sinh đề gốc tự động rút từ Ngân hàng câu hỏi dựa trên Ma trận đề thi đã duyệt.
* **Quản lý Gói đề thi (Exam Packages):** Đóng gói các đề gốc phục vụ một đợt thi (`packages`, `package_exams`).
* **Thẩm định & Phê duyệt Gói đề:** Tổ trưởng bộ môn duyệt hoặc từ chối gói đề thi trước khi tổ chức thi hoặc in ấn.
* **Hoán vị Mã đề thi (Exam Papers):** Sinh ra nhiều mã đề hoán vị từ đề gốc (đảo thứ tự câu hỏi và đảo thứ tự lựa chọn đáp án).
* **Xuất bản Đề thi:** Xuất file Word (.docx) hoặc PDF theo mẫu chuẩn đề thi quốc gia phục vụ in ấn thi giấy.

### 1.5. Tổ chức Thi trực tuyến (Exam Execution & Online Testing)

* **Quản lý Ca thi / Đợt thi:** Đặt lịch thi (`exam_sessions`), cài đặt thời gian bắt đầu, kết thúc, thời lượng làm bài và gán mã đề thi.
* **Quản lý Thí sinh & Danh sách thi:** Thêm mới thí sinh thủ công (`exam_candidates`), cấp số báo danh (SBD) và mật khẩu truy cập.
* **Phân công Thí sinh - Môn học:** Đăng ký danh sách môn học cho từng thí sinh (`student_subjects`).
* **Cổng Thi trực tuyến (Exam Portal):**
  * Đăng nhập xác thực vào phòng thi.
  * Bộ đếm ngược thời gian thi chuẩn xác (Countdown Timer).
  * Tự động lưu tạm đáp án (Auto Sync) liên tục để chống mất dữ liệu khi gián đoạn mạng.
  * Tự động thu bài và nộp bài khi hết giờ (Auto Submit).
  * Chấm điểm tự động tức thì ngay khi hoàn thành bài thi.

### 1.6. Quản lý Kết quả Thi & Báo cáo Thống kê (Results & Analytics)

* **Lưu trữ & Tra cứu điểm thi:** Quản lý chi tiết bảng điểm (`exam_results`) theo ca thi, môn học, lớp học.
* **Xem chi tiết bài làm:** Cho phép giáo viên và thí sinh xem lại toàn bộ bài thi đã nộp (đối chiếu đáp án đã chọn và đáp án đúng xanh/đỏ).
* **Xuất báo cáo:** Xuất bảng điểm chi tiết ra file Excel (.xlsx).
* **Biểu đồ Thống kê:** Phân tích phổ điểm, tỉ lệ Đạt/Kém, đánh giá chất lượng đề thi.

---

## 2. CHỨC NĂNG AI (TRÍ TUỆ NHÂN TẠO / AI INTEGRATION)

Hệ thống tích hợp công nghệ Trí tuệ nhân tạo (Generative AI / LLM) giúp tự động hóa và nâng cao chất lượng quá trình biên soạn đề thi.

### 2.1. Sinh câu hỏi tự động bằng AI (AI Question Generation)

* **Sinh câu hỏi theo Yêu cầu / Prompt:** Cho phép giáo viên nhập chủ đề hoặc từ khóa, AI tự động tạo ra chuỗi câu hỏi trắc nghiệm hoàn chỉnh.
* **Sinh câu hỏi dưa trên Ma trận kiến thức:** AI tự động đọc cấu trúc Ma trận đề thi để tạo ra câu hỏi chuẩn theo đúng tỷ lệ mức độ tư duy (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
* **Trích xuất câu hỏi từ Tài liệu (File-to-Question):** AI đọc và phân tích nội dung file tài liệu tải lên (PDF, DOCX, TXT), tự động trích xuất và biến đổi nội dung thành các câu hỏi trắc nghiệm chuẩn hóa.
* **Tự động sinh Đáp án & Lời giải chi tiết:** AI tự động đề xuất 4 phương án trả lời, đánh dấu đáp án chính xác và viết lời giải thích chi tiết cho từng câu hỏi.

### 2.2. Hỗ trợ Biên tập & Thẩm định Câu hỏi bằng AI (AI Question Refinement)

* **Kiểm tra & Sửa lỗi câu hỏi:** AI quét phát hiện lỗi chính tả, ngữ pháp hoặc các câu hỏi có vắn tắt, mơ hồ khó hiểu.
* **Tự động sinh Phương án nhiễu (Distractor Generation):** AI phân tích câu hỏi để tạo ra các đáp án sai nhưng có tính hợp lý cao, tránh việc các phương án nhiễu quá dễ bị loại trừ.
* **Đánh giá & Gợi ý Mức độ tư duy:** AI phân tích nội dung câu hỏi để gợi ý phân loại chuẩn xác mức độ tư duy (Nhận biết / Thông hiểu / Vận dụng).

### 2.3. Tối ưu & Đóng gói Đề thi Thông minh (AI Exam Optimization)

* **Phát hiện Trùng lặp Ngữ nghĩa (Semantic Duplicate Check):** AI so sánh vector ngữ nghĩa để cảnh báo các câu hỏi bị trùng lặp hoặc có nội dung tương tự nhau trong ngân hàng câu hỏi.
* **Gợi ý Câu hỏi Thay thế:** Khi giáo viên muốn đổi một câu hỏi trong đề gốc, AI gợi ý danh sách các câu hỏi tương đương về bài học và độ khó để thay thế nhanh chóng.

---

## 3. TỔNG KẾT BẢNG PHÂN LOẠI CHỨC NĂNG

| Phân hệ / Module                  | Chức năng Non-AI (Nghiệp vụ CSDL)                                         | Chức năng AI (Trí tuệ nhân tạo)                                                     |
| :---------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Quản trị & Phân quyền** | Login, RBAC, User Groups, Security Policy, Audit Log                          | -                                                                                         |
| **Danh mục Hệ thống**      | Quản lý Môn học, Khối lớp, Độ khó, Năng lực, Dạng câu hỏi       | -                                                                                         |
| **Ngân hàng Câu hỏi**     | Quản lý Chủ đề, CRUD Câu hỏi, Duyệt câu hỏi, Lịch sử              | Sinh câu hỏi tự động, Sinh đáp án/lời giải, Tạo phương án nhiễu            |
| **Tạo Đề & Ma trận**      | Cấu hình Ma trận, Đề gốc, Gói đề, Hoán vị mã đề, Xuất Word/PDF | Sinh đề theo ma trận, Phát hiện trùng lặp ngữ nghĩa, Gợi ý câu hỏi thay thế |
| **Thi Trực tuyến**          | Tạo Ca thi, Thí sinh, Đếm giờ, Auto-sync đáp án, Auto-submit          | -                                                                                         |
| **Kết quả & Thống kê**    | Chấm điểm tự động, Xem chi tiết bài làm, Xuất Excel, Phổ điểm    | Phân tích chất lượng câu hỏi & Đánh giá mức độ bao phủ kiến thức          |
