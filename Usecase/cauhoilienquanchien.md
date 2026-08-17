# 🎓 BỘ CÂU HỎI PHẢN BỆN VÀ CÂU TRẢ LỜI CHI TIẾT BẢO VỆ ĐỒ ÁN

**Sinh viên thực hiện:** Nguyễn Văn Chiến
**Tên đề tài:** Quản lý và Sinh đề thi AI v2
**Vị trí phụ trách:** Quản lý người dùng, Quản lý nhóm & Phân quyền (RBAC), Thống kê ngân hàng câu hỏi, Quản lý thí sinh, Quản lý kết quả thi, Thi trực tuyến.

---

## 🏛️ PHẦN I: BỘ CÂU HỎI PHẢN BỆN TRỰC TIẾP TỪ GIẢNG VIÊN (MOCK DEFENSE QA)

---

### 1️⃣ Câu hỏi 1 (Về Bảo mật Session & JWT Invalidation):

> **Giáo viên hỏi:** *"Em dùng Token JWT để xác thực người dùng. Giả sử tài khoản Giảng viên A bị phát hiện lộ mật khẩu, Admin thực hiện khóa tài khoản đó trên màn hình Quản lý người dùng. Nhưng lúc này Giảng viên A đang đăng nhập ở một máy tính khác và vẫn giữ chuỗi `access_token` chưa hết hạn. **Hệ thống của em xử lý làm sao để ngăn chặn ngay lập tức người đó không tiếp tục thao tác được nữa?** Em hãy chỉ ra đoạn code/middleware xử lý việc này."*

#### 💡 Câu trả lời chi tiết:

- **Nguyên lý xử lý:** Vì Token JWT cơ bản mang tính chất Stateless (không lưu trạng thái ở server), nếu không có cơ chế hủy token thì Token cũ vẫn hợp lệ cho đến khi hết hạn (exp). Hệ thống của em giải quyết vấn đề này bằng mô hình **Server-Side Token Revocation / Session Invalidation**:
  1. Trong Bảng `Users` ở Cơ sở dữ liệu, em bổ sung 1 trường tên là `token_version` (hoặc `status`, `password_updated_at`) với giá trị khởi tạo là `1`.
  2. Khi sinh `access_token` tại thời điểm Đăng nhập, thông tin `token_version` (ví dụ: `v: 1`) được đóng gói trực tiếp vào Payload của JWT.
  3. Khi Admin thực hiện **Khóa tài khoản** hoặc **Reset mật khẩu** cho Giảng viên A, Backend ngay lập tức cập nhật trường `token_version` trong DB tăng lên 1 (ví dụ từ `1` thành `2`) hoặc cập nhật `status = 'LOCKED'`.
  4. Mọi API Request từ máy tính của Giảng viên A gửi lên đều phải đi qua **Authentication Middleware**. Tại đây, Middleware giải mã JWT lấy `user_id` và `token_version` trong payload, sau đó truy vấn nhanh DB (hoặc Cache Redis):
     - **Nếu `user_status == 'LOCKED'` hoặc `jwt_payload.token_version < db_user.token_version`:** Middleware lập tức reject request, trả về mã HTTP `401 Unauthorized` kèm thông báo *"Tài khoản đã bị khóa hoặc phiên làm bài đã bị hủy"*.
     - Client (Frontend) nhận mã 401 sẽ tự động xóa token trong LocalStorage/Cookie và điều hướng người dùng văng ra màn hình Đăng nhập.

---

### 2️⃣ Câu hỏi 2 (Về Phân quyền RBAC & Chống Bypass Frontend):

> **Giáo viên hỏi:** *"Hệ thống của em quảng bá là có phân quyền động RBAC. Giả sử Thầy/Cô dùng công cụ F12 (DevTools) để sửa giao diện Frontend, cố tình cho hiển thị lại các nút bấm 'Xóa câu hỏi' hoặc 'Tạo ca thi' mà tài khoản của Thầy/Cô không được phép. **Backend của em sẽ phát hiện và chặn hành vi này bằng cách nào?** Mã lỗi HTTP trả về là gì?"*

#### 💡 Câu trả lời chi tiết:

- **Nguyên lý xử lý:**
  - **Frontend (UI Layer):** Ẩn/Hiện nút bấm hoặc Menu chỉ mang tính chất **Tối ưu trải nghiệm người dùng (UX)**, giúp người dùng không nhìn thấy các tính năng mình không có quyền. Frontend **không được coi là một lớp bảo mật**.
  - **Backend (Security Layer):** Mọi hành động kích hoạt từ nút bấm (dù bị can thiệp F12) đều phải gửi 1 HTTP Request (POST, PUT, DELETE...) tới API tương ứng ở Backend.
  - **Cơ chế chặn ở Backend:**
    1. Tất cả các Route bảo mật đều được gắn **Authorization Middleware** kèm theo mã quyền yêu cầu. Ví dụ: Route DELETE `/api/questions/:id` yêu cầu quyền `QUESTION_DELETE`.
    2. Khi Request đến, Middleware lấy `user_id` từ Token, truy vấn bảng `User_Roles` và `Role_Permissions` để lấy tập hợp tất cả các `permission_code` mà User đó thực sự sở hữu dưới Database.
    3. Middleware thực hiện hàm so sánh: `user_permissions.includes('QUESTION_DELETE')`.
    4. **Kết quả:** Nếu không tồn tại quyền `QUESTION_DELETE`, Backend ngắt tiến trình xử lý ngay lập tức, trả về mã lỗi HTTP `403 Forbidden` cùng JSON phản hồi: `{"detail": "Bạn không có quyền thực hiện thao tác xóa câu hỏi!"}`. Do đó, việc sửa giao diện Frontend hoàn toàn bất lực.

---

### 3️⃣ Câu hỏi 3 (Về Thống kê Ngân hàng câu hỏi & Tối ưu Dữ liệu lớn):

> **Giáo viên hỏi:** *"Khi ngân hàng câu hỏi của trường tăng lên 50.000 câu hỏi với hàng trăm môn học, mỗi lần mở trang Dashboard Thống kê, hệ thống có bị treo hoặc load chậm không? **Em đã dùng những kỹ thuật gì ở Database và Backend để tối ưu tốc độ tính toán các biểu đồ thống kê này?**"*

#### 💡 Câu trả lời chi tiết:

- **Các kỹ thuật tối ưu được áp dụng:**
  1. **Tối ưu chỉ mục Database (Database Indexing):** Đánh B-Tree Index cho các trường thường xuyên tham gia vào mệnh đề `WHERE` và `GROUP BY` như: `subject_id`, `topic_id`, `difficulty_level`, `status`. Điều này giúp DB tìm kiếm và gom nhóm dữ liệu trong thời gian $O(\log N)$ thay vì quét toàn bộ bảng (Full Table Scan).
  2. **Thực thi Aggregation Query trực tiếp tại Database:** Không bao giờ kéo 50.000 bản ghi về Server Backend rồi dùng vòng lặp `for/filter` để đếm. Thay vào đó, gửi câu lệnh Gom nhóm tối ưu (`SELECT subject_id, difficulty, COUNT(*) FROM questions GROUP BY subject_id, difficulty`) để Database Engine thực thi tính toán và chỉ trả về kết quả tổng hợp dạng JSON cực nhỏ (vài KB).
  3. **Cơ chế Caching (Bộ nhớ đệm Redis / In-memory Cache):** Các số liệu thống kê tổng quan (Dashboard) không biến động từng giây. Backend lưu kết quả tính toán vào Cache với thời gian sống `TTL = 5 - 10 phút`. Khi người dùng mở trang Thống kê, Backend lấy ngay từ Cache trả về dưới 10ms mà không cần truy vấn lại Database. Khi có sự kiện Thêm/Sửa/Xóa câu hỏi, hệ thống sẽ xóa cache (Invalidate Cache) để tính lại ở lần request tiếp theo.

---

### 4️⃣ Câu hỏi 4 (Về Import Thí sinh & Quản lý Transaction File Excel):

> **Giáo viên hỏi:** *"Khi cán bộ coi thi Import danh sách 500 thí sinh từ file Excel vào hệ thống, giả sử đến dòng thứ 250 thì bị trùng Số báo danh (SBD) hoặc sai định dạng Email. **Hệ thống của em sẽ xử lý Transaction như thế nào? Bỏ qua dòng lỗi đó hay hủy bỏ (Rollback) toàn bộ file?** Làm sao người dùng biết dòng nào bị lỗi để sửa?"*

#### 💡 Câu trả lời chi tiết:

- **Quy trình xử lý Import qua 3 giai đoạn của hệ thống:**
  1. **Giai đoạn 1 - Validate & In-Memory Check (Chưa ghi vào DB):**
     - Đọc file Excel thành mảng dữ liệu JSON bằng thư viện (như `SheetJS`/`pandas`).
     - Duyệt qua từng dòng kiểm tra tính hợp lệ về cú pháp: Cột Họ tên không rỗng, Email đúng regex, SBD không để trống.
     - Kiểm tra trùng SBD/Email nội bộ ngay trong chính file Excel tải lên.
  2. **Giai đoạn 2 - Database Transaction Management (Ghi dữ liệu an toàn):**
     - Mở một **Database Transaction** (`BEGIN TRANSACTION`).
     - Thực hiện kiểm tra trùng SBD/Email với dữ liệu đã có trong Database.
     - **Chính sách xử lý lỗi:** Hệ thống hỗ trợ chế độ **Atomic Transaction (All-or-Nothing)** nhằm đảm bảo tính toàn vẹn dữ liệu. Nếu phát hiện bất kỳ lỗi nào (dù ở dòng 250), toàn bộ Transaction sẽ bị hủy bỏ ngay lập tức (`ROLLBACK TRANSACTION`). Không có dữ liệu rác hay dữ liệu bán phần nào được lưu vào DB.
  3. **Giai đoạn 3 - Báo cáo lỗi chi tiết (Error Reporting):**
     - Hệ thống thu thập danh sách tất cả các dòng vi phạm và trả về Client danh sách lỗi có cấu trúc:
       - *Dòng 250: Trùng Số Báo Danh "SBD12345" với thí sinh Nguyễn Văn A đã có trong hệ thống.*
       - *Dòng 310: Định dạng Email "abc@" không hợp lệ.*
     - Giao diện hiển thị bảng danh sách các dòng bị lỗi để Cán bộ coi thi chỉnh sửa trực tiếp file Excel và tải lên lại.

---

### 5️⃣ Câu hỏi 5 (Về Chấm lại bài thi - Re-grading Result Management):

> **Giáo viên hỏi:** *"Sau khi ca thi kết thúc và đã có bảng điểm, nếu phát hiện ra 1 câu hỏi trong ngân hàng câu hỏi bị nhập sai đáp án gốc dẫn đến chấm sai cho hàng loạt thí sinh. **Hệ thống của em có hỗ trợ chấm lại (Re-grade) không? Quy trình tính toán lại điểm số diễn ra như thế nào?**"*

#### 💡 Câu trả lời chi tiết:

- **Hệ thống có hỗ trợ chức năng Chấm lại (Re-grade / Recalculate Exam Results):**
- **Quy trình tính toán lại điểm số diễn ra như sau:**
  1. **Bước 1 - Cập nhật đáp án chuẩn:** Giáo viên/Admin vào phân hệ Quản lý câu hỏi, điều chỉnh lại đáp án đúng chính xác cho câu hỏi bị sai và lưu lại.
  2. **Bước 2 - Kích hoạt tiến trình Chấm lại ca thi:** Tại giao diện Quản lý kết quả thi (`QuanLyKetQuaThi.tsx`), Quản trị viên chọn Ca thi cần chấm lại và ấn nút *"Chấm lại toàn bộ ca thi"*.
  3. **Bước 3 - Backend Re-grading Logic:**
     - Backend truy vấn danh sách tất cả bài thi (`ExamResults`) thuộc Ca thi đó.
     - Duyệt qua từng bài làm của thí sinh (lịch sử các câu trả lời `selected_options` đã được lưu trữ vĩnh viễn trong chi tiết bài thi `exam_submission_details`).
     - Chạy lại hàm tính điểm tự động `autoGrade()` với bộ đáp án chuẩn mới nhất của đề thi.
     - Tính lại: Tổng điểm, Số câu đúng, Số câu sai.
  4. **Bước 4 - Cập nhật & Lưu vết (Audit Log):** Cập nhật điểm mới vào bảng `ExamResults`, đồng thời ghi vết lịch sử `updated_at` và lý do chấm lại vào System Log để phục vụ công tác thanh tra/phúc khảo.

---

### 6️⃣ Câu hỏi 6 (Về Thi trực tuyến, Đồng bộ thời gian & Chống Gian lận):

> **Giáo viên hỏi:** *"Về chức năng Thi trực tuyến, em hãy trả lời 2 ý:*
> *- a) Làm sao em đảm bảo đếm ngược thời gian thi chính xác nếu sinh viên cố tình chỉnh lùi giờ trên máy tính cá nhân?*
> *- b) Nếu sinh viên bị rớt mạng hoàn toàn trong 3 phút rồi có lại, hoặc vô tình ấn phím F5 / Ctrl+R, làm sao bài thi không bị mất đáp án đã chọn và đồng hồ vẫn chạy đúng?"*

#### 💡 Câu trả lời chi tiết:

- **Trả lời ý a) - Xử lý Đồng bộ thời gian Server (Server-Side Time Sync):**

  - Đồng hồ đếm ngược **tuyệt đối không dựa vào thời gian hệ thống của máy tính Client (`new Date()`)**.
  - Khi thí sinh bắt đầu làm bài, Server lưu vết `server_start_time` và `duration_minutes`. Server tính mốc thời gian kết thúc cố định: `server_end_time = server_start_time + duration_minutes`.
  - Mỗi khi Render hoặc đếm ngược ở Frontend, thời gian còn lại được tính bằng: `remaining_time = server_end_time - current_server_time`.
  - Định kỳ (hoặc khi sync đáp án), Client nhận lại `current_server_time` từ phản hồi API của Server để hiệu chỉnh lại đồng hồ đếm ngược trên màn hình. Do đó, dù thí sinh có chỉnh lùi giờ trên Windows/Mac bao nhiêu tùy thích thì đồng hồ thi vẫn đếm ngược chính xác theo giờ Server.
- **Trả lời ý b) - Khôi phục bài làm & Bảo toàn trạng thái thi khi mất mạng / F5:**

  - **Bảo toàn đáp án (Dual-layer Auto-Save):**
    1. *Layer 1 (Tức thì ở Client):* Ngay khi thí sinh bấm chọn một đáp án, đáp án đó được ghi ngay vào `localStorage` của trình duyệt theo cấu trúc key: `exam_draft_{candidate_id}_{exam_id}`. Khi F5 hoặc rớt mạng mở lại, ứng dụng lấy ngay từ `localStorage` để hiển thị lại đầy đủ các câu đã chọn.
    2. *Layer 2 (Định kỳ lên Server):* Song song đó, có một tiến trình ngầm gửi API `POST /api/exam/save-draft` lên Server mỗi 10-15 giây. Nên dù có chuyển sang máy tính khác đăng nhập lại, bài làm vẫn được khôi phục từ bản lưu trên Server.
  - **Khôi phục đếm ngược:** Khi trang web bị tải lại (F5), Frontend gửi API lấy thông tin ca thi hiện tại. Server trả về mốc `server_end_time`. Frontend tiếp tục đếm ngược từ khoảng thời gian còn lại chính xác mà không bị đứt đoạn hay reset lại từ đầu.

---

### 7️⃣ Câu hỏi 7 (Về Tải cao Concurrency & Race Condition khi Nộp bài thi):

> **Giáo viên hỏi:** *"Giả sử trong một ca thi có 1.000 thí sinh cùng bấm nút 'Nộp bài' ở những giây cuối cùng. **Server của em làm sao để chống treo/sập (Crash/Overload) và xử lý không bị xung đột (Race condition) khi ghi nhận điểm số vào Database?**"*

#### 💡 Câu trả lời chi tiết:

- **Kỹ thuật chống quá tải & Race condition khi Nộp bài đồng thời:**
  1. **Hàng chờ xử lý bất đồng bộ (Asynchronous Task Queue):** API tiếp nhận Nộp bài không thực hiện các tác vụ nặng (như tính toán điểm chi tiết, tạo PDF) đồng bộ trên main thread. API chỉ nhanh chóng nhận Payload, cập nhật trạng thái `status = 'SUBMITTED'` vào DB (vài ms) rồi trả phản hồi thành công ngay cho Client. Quá trình tính điểm nâng cao được đẩy vào Message Queue (như RabbitMQ / Redis Streams / Celery Task Worker) để xử lý tuần tự dưới background.
  2. **Connection Pooling & Non-blocking I/O:** Sử dụng Web Server bất đồng bộ (Node.js Event Loop / FastAPI AsyncIO) kết hợp với Database Connection Pool (ví dụ: max 50-100 connections). Điều này cho phép hàng ngàn kết nối I/O cùng tồn tại mà không làm tràn RAM Server.
  3. **Chống Nộp bài trùng lặp (Idempotency & Lock):** Để tránh trường hợp Thí sinh double-click nút Nộp bài hoặc mạng lag làm gửi 2 request trùng nhau:
     - Tại DB, thiết lập ràng buộc duy nhất (`UNIQUE Constraint`) trên cặp `(candidate_id, exam_id)`.
     - Sử dụng Redis Distributed Lock (`Redlock`) hoặc Idempotency Key theo `submission_id`. Nếu có request thứ 2 gửi đến khi request 1 đang xử lý, hệ thống sẽ bỏ qua ngay request thứ 2.

---

### 8️⃣ Câu hỏi 8 (Về Phân quyền Dữ liệu theo phạm vi / Row-Level Data Authorization):

> **Giáo viên hỏi:** *"Trong hệ thống, cả Giảng viên A và Giảng viên B đều có quyền 'Xem kết quả thi' (`VIEW_EXAM_RESULT`). **Làm sao em đảm bảo Giảng viên A chỉ xem được kết quả thi của lớp/môn học do Giảng viên A phụ trách, mà không xem được kết quả thi thuộc môn của Giảng viên B?**"*

#### 💡 Câu trả lời chi tiết:

- **Phân biệt giữa RBAC (Role-Based) và ABAC (Attribute-Based / Row-Level Security):**
  - RBAC kiểm tra xem Giảng viên A có quyền `VIEW_EXAM_RESULT` hay không.
  - Tuy nhiên, để lọc đúng dữ liệu thuộc sở hữu của Giảng viên A, hệ thống áp dụng **Row-Level Data Scoping (Phân quyền dữ liệu theo dòng)** ở lớp truy vấn Backend.
- **Cách thực thi trong Code Backend:**
  1. Mỗi tài khoản Giảng viên được liên kết với danh sách `assigned_subject_ids` (hoặc `class_ids`) trong bảng phân công giảng dạy.
  2. Khi Giảng viên A gọi API `GET /api/exam-results`, Controller lấy `current_user_id` từ JWT token.
  3. Thay vì truy vấn `SELECT * FROM exam_results`, Backend tự động bổ sung điều kiện lọc dữ liệu bắt buộc (Data Scoping Clause):
     `WHERE subject_id IN (SELECT subject_id FROM teacher_subjects WHERE teacher_id = current_user_id)`
  4. Nếu là Admin (`user_role == 'ADMIN'`), điều kiện lọc này sẽ được bỏ qua để xem toàn bộ hệ thống. Do đó, Giảng viên A tuyệt đối không thể truy cập hay xem trộm kết quả thi môn của Giảng viên B.

---

### 9️⃣ Câu hỏi 9 (Về Cấp quyền thi lại & Bảo toàn Dữ liệu / Soft Delete & Audit Log):

> **Giáo viên hỏi:** *"Khi thí sinh gặp sự cố bất khả kháng (máy hỏng) và Admin bấm nút 'Cấp quyền Thi lại' trên màn hình Quản lý thí sinh. **Dữ liệu bài thi cũ của thí sinh đó được xóa hẳn khỏi Database hay ẩn đi? Tại sao không nên xóa cứng (`HARD DELETE`) dữ liệu trong hệ thống giáo dục?**"*

#### 💡 Câu trả lời chi tiết:

- **Chính sách xử lý Dữ liệu bài thi khi Cấp quyền Thi lại:**
  - **Tối kỵ Xóa cứng (Hard Delete):** Trong các hệ thống Giáo dục & Đào tạo, dữ liệu bài làm và điểm số mang tính pháp lý cao, tuyệt đối **không bao giờ được sử dụng lệnh `DELETE FROM`** để xóa vĩnh viễn bản ghi khỏi Database. Việc xóa cứng sẽ làm mất lịch sử đối soát khi có thanh tra hoặc khiếu nại của thí sinh.
- **Giải pháp áp dụng (Soft Delete & Versioning & Audit Log):**
  1. **Xóa mềm (Soft Delete / Status Update):** Khi Admin bấm nút *"Cấp quyền Thi lại"*, hệ thống cập nhật trường `is_cancelled = True` hoặc `status = 'RESET_FOR_RETEST'` trên bản ghi bài thi cũ.
  2. **Đánh phiên bản bài thi (Attempt Version):** Mỗi lượt thi của thí sinh ở một môn học có trường `attempt_number` (Lần thi 1, Lần thi 2). Bản ghi thi lại sẽ là `attempt_number = 2`.
  3. **Ghi vết lịch sử (Audit Log Trail):** Hệ thống tự động ghi 1 bản ghi vào bảng `System_Audit_Logs` chứa thông tin: `admin_id` người duyệt thi lại, `candidate_id`, `reason` (lý do cho thi lại), `timestamp` thực hiện.
  4. Khi tính toán bảng điểm chính thức, câu lệnh SQL sẽ tự động lọc `WHERE is_cancelled = False AND is_latest = True`.

---

### 🔟 Câu hỏi 10 (Về Thuật toán Hoán vị Đề thi & Đối chiếu Chấm điểm):

> **Giáo viên hỏi:** *"Hệ thống của em tạo đề thi hoán vị cho từng thí sinh. **Nếu Thí sinh A chọn đáp án B cho Câu 1, nhưng ở đề của Thí sinh B thì Câu 1 đó lại nằm ở vị trí Câu 15 và đáp án B lại nằm ở vị trí C. Làm sao hệ thống đối chiếu đáp án chính xác khi chấm điểm?**"*

#### 💡 Câu trả lời chi tiết:

- **Cấu trúc lưu trữ Đề thi Hoán vị (Permutation Structure):**
  - Hệ thống **không bao giờ** chấm điểm dựa trên thứ tự hiển thị giao diện (như "Câu 1 chọn B", "Câu 2 chọn A").
  - Mọi câu hỏi trong Ngân hàng đều có một `question_id` cố định (UUID/Int), và mỗi phương án trả lời đều có một `option_id` cố định.
- **Cách thức hoạt động:**
  1. **Khi Sinh đề hoán vị cho Thí sinh:** Backend tạo ra một bản đồ ánh xạ (Mapping Schema) đảo thứ tự hiển thị nhưng **giữ nguyên ID gốc**:
     - *Thí sinh A:* Câu hiển thị 1 -> `question_id: 105`. Các lựa chọn: Pos A (`option_id: 1`), Pos B (`option_id: 2`), Pos C (`option_id: 3`).
     - *Thí sinh B:* Câu hiển thị 15 -> `question_id: 105`. Các lựa chọn: Pos A (`option_id: 3`), Pos B (`option_id: 1`), Pos C (`option_id: 2`).
  2. **Khi Thí sinh chọn đáp án & Nộp bài:** Payload gửi về Backend lưu trữ chính xác ID của lựa chọn: `{ question_id: 105, selected_option_id: 2 }`.
  3. **Khi Chấm điểm (Auto-Grading):** Backend chỉ cần so sánh `selected_option_id` của thí sinh với `correct_option_id` của `question_id: 105` lưu trong Database. Việc câu hỏi nằm ở vị trí thứ mấy hay chữ cái A/B/C/D hiển thị ở đâu hoàn toàn không ảnh hưởng đến độ chính xác của thuật toán chấm điểm.

---

### 1️⃣1️⃣ Câu hỏi 11 (Về Tối ưu Bộ nhớ RAM khi Xuất Báo cáo Excel Dung lượng lớn):

> **Giáo viên hỏi:** *"Khi xuất báo cáo bảng điểm cho một ca thi lên đến 5.000 thí sinh ra file Excel/PDF, nếu backend tạo toàn bộ file trong bộ nhớ RAM trước khi gửi về client thì có nguy cơ bị **Out-Of-Memory (OOM)**. **Em đã tối ưu quá trình xuất file báo cáo này như thế nào?**"*

#### 💡 Câu trả lời chi tiết:

- **Các kỹ thuật giải quyết bài toán OOM khi Xuất file dữ liệu lớn:**
  1. **Truy vấn dữ liệu dạng Con trỏ / Chunking (Cursor & Pagination Query):** Thay vì nạp toàn bộ 5.000 bản ghi bài thi vào RAM bằng `SELECT *` (`results.fetchall()`), Backend sử dụng `Server-Side Cursor` hoặc phân trang ngầm để đọc từng lô (ví dụ 500 bản ghi/lần).
  2. **Sử dụng Stream Response (HTTP Chunked Transfer Encoding):**
     - Thay vì tạo toàn bộ file `.xlsx` trong bộ nhớ RAM rồi mới gửi HTTP Response về Client, Backend kết hợp thư viện hỗ trợ Stream (như `exceljs` Stream Writer / Python `StreamingResponse`).
     - File Excel được ghi và đẩy trực tiếp thành các đoạn dữ liệu nhỏ (chunks) qua kết nối HTTP Stream về trình duyệt Client.
  3. **Tối ưu giải phóng bộ nhớ (Garbage Collection):** Sau khi ghi xong mỗi chunk dữ liệu, các biến tạm thời lập tức được giải phóng bộ nhớ. Kỹ thuật này giúp dung lượng RAM của Server duy trì ở mức thấp cố định (vài chục MB) dù xuất báo cáo cho 5.000 hay 100.000 thí sinh.

---

## 📌 PHẦN II: TỔNG HỢP CÂU HỎI & ĐÁP ÁN BỔ TRỢ THEO CHUYÊN ĐỀ

### 📁 Chuyên đề 1: Quản lý người dùng & Phân quyền RBAC

* **Câu hỏi:** Phân biệt Role và Permission?
* **Đáp án:** `Permission` (Quyền hạn) là các đơn vị hành động nhỏ nhất (Ví dụ: `CREATE_USER`, `DELETE_QUESTION`). `Role` (Vai trò) là một tập hợp gom nhóm nhiều Permission lại với nhau (Ví dụ: Role "Giảng viên" chứa `CREATE_QUESTION`, `EDIT_QUESTION`, `VIEW_RESULT`). User được gán Role sẽ thừa hưởng toàn bộ Permission nằm trong Role đó.

### 📁 Chuyên đề 2: Quản lý thí sinh & Import dữ liệu

* **Câu hỏi:** Làm sao để tạo Số báo danh (SBD) tự động không bao giờ bị trùng trong môi trường nhiều người cùng bấm tạo một lúc (Concurrency)?
* **Đáp án:** Sử dụng chuỗi định dạng tiền tố + số tự tăng managed bởi Database Sequence hoặc UUID v4 / Mã băm duy nhất. Đối với cơ sở dữ liệu quan hệ, thiết lập ràng buộc `UNIQUE` trên cột `sbd`. Trong code backend, sử dụng cơ chế `Locking` (Optimistic/Pessimistic Lock) hoặc xử lý `Catch Unique Constraint Violation` để retry sinh SBD khác nếu có xung đột trùng lặp.

### 📁 Chuyên đề 3: Thi trực tuyến & Cơ chế Giám sát Anti-Cheat

* **Câu hỏi:** Em thu thập hành vi gian lận của thí sinh bằng những sự kiện (Events) nào trong JavaScript?
* **Đáp án:**
  - Sự kiện chuyển Tab / Ẩn trình duyệt: `document.addEventListener('visibilitychange', ...)`
  - Sự kiện Mất tiêu điểm cửa sổ: `window.addEventListener('blur', ...)`
  - Chặn menu chuột phải: `window.addEventListener('contextmenu', e => e.preventDefault())`
  - Chặn phím tắt DevTools / Copy: `window.addEventListener('keydown', e => { if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) e.preventDefault() })`
  - Mọi vi phạm được lưu số lần `violation_count` và gửi về Server để Cán bộ coi thi theo dõi trên màn hình giám sát thời gian thực.

---

## 🗄️ PHẦN III: 10 CÂU HỎI TRỌNG TÂM VỀ SQL CỦA HỆ THỐNG HIỆN TẠI (KÈM CÂU TRUY VẤN MẪU & GIẢI THÍCH CHI TIẾT)

---

### 1️⃣ Câu 1 (Về Truy vấn Phân quyền RBAC qua nhiều bảng trung gian):

> **Giáo viên hỏi:** *"Trong hệ thống của em, phân quyền người dùng trải qua các bảng `users`, `user_group_members`, `group_permissions`, `permissions`. Em hãy viết một câu lệnh SQL để kiểm tra xem `user_id = 5` có sở hữu quyền `QUESTION_DELETE` (Xóa câu hỏi) hay không?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
SELECT EXISTS (
    SELECT 1 
    FROM user_group_members ugm
    JOIN group_permissions gp ON ugm.group_id = gp.group_id
    JOIN permissions p ON gp.permission_id = p.id
    JOIN users u ON ugm.user_id = u.id
    WHERE u.id = 5 
      AND u.status = 'ACTIVE'
      AND p.code = 'QUESTION_DELETE'
) AS has_permission;
```

- **Giải thích:**
  - Sử dụng `JOIN` nối 4 bảng lại với nhau dựa trên Khóa ngoại (`group_id`, `permission_id`, `user_id`).
  - Hàm `EXISTS` trả về `TRUE/FALSE` giúp truy vấn dừng ngay khi tìm thấy bản ghi thỏa mãn đầu tiên (tối ưu tốc độ, không cần duyệt hết dữ liệu).
  - Kết hợp kiểm tra trạng thái tài khoản `u.status = 'ACTIVE'`.

---

### 2️⃣ Câu 2 (Về Thống kê Ngân hàng câu hỏi theo Môn & Độ khó - Dynamic Aggregation):

> **Giáo viên hỏi:** *"Hãy viết câu lệnh SQL để xuất báo cáo thống kê số lượng câu hỏi của từng Môn học (`subjects`), phân loại theo 4 cấp độ tư duy (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) dưới dạng các cột tương ứng?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
SELECT 
    s.id AS subject_id,
    s.name AS subject_name,
    COUNT(q.id) AS total_questions,
    COUNT(CASE WHEN q.difficulty = 'NHAN_BIET' THEN 1 END) AS count_nhan_biet,
    COUNT(CASE WHEN q.difficulty = 'THONG_HIEU' THEN 1 END) AS count_thong_hieu,
    COUNT(CASE WHEN q.difficulty = 'VAN_DUNG' THEN 1 END) AS count_van_dung,
    COUNT(CASE WHEN q.difficulty = 'VAN_DUNG_CAO' THEN 1 END) AS count_van_dung_cao
FROM subjects s
LEFT JOIN questions q ON s.id = q.subject_id AND q.is_deleted = FALSE
GROUP BY s.id, s.name
ORDER BY total_questions DESC;
```

- **Giải thích:**
  - Sử dụng `LEFT JOIN` để đảm bảo những môn chưa có câu hỏi nào vẫn hiển thị với số lượng bằng `0`.
  - Kỹ thuật **Conditional Aggregation (`COUNT(CASE WHEN...)`)** cho phép chuyển đổi dòng dữ liệu (Rows) thành các cột chỉ số (Columns) trong duy nhất một lần quét bảng, không cần nối bảng nhiều lần.

---

### 3️⃣ Câu 3 (Về Phát hiện & Xử lý Thí sinh bị trùng lặp dữ liệu):

> **Giáo viên hỏi:** *"Khi cán bộ Import thí sinh từ file Excel, nếu bị trùng Số CCCD hoặc Số báo danh (SBD), làm sao em dùng SQL để phát hiện các bản ghi trùng và chỉ lấy bản ghi mới nhất?"*

#### 💡 Câu trả lời & Truy vấn SQL:

- **Bước 1: Tìm danh sách CCCD bị trùng trong hệ thống:**

```sql
SELECT cccd, COUNT(*) AS duplicate_count
FROM exam_candidates
GROUP BY cccd
HAVING COUNT(*) > 1;
```

- **Bước 2: Sử dụng Window Function `ROW_NUMBER()` để lọc ra bản ghi thí sinh mới nhất:**

```sql
WITH RankedCandidates AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY cccd ORDER BY created_at DESC) AS rn
    FROM exam_candidates
)
SELECT id, username, full_name, cccd, created_at
FROM RankedCandidates
WHERE rn = 1;
```

- **Giải thích:** `PARTITION BY cccd` gom nhóm các thí sinh trùng CCCD, `ORDER BY created_at DESC` sắp xếp bản ghi tạo sau lên đầu. `rn = 1` đại diện cho bản ghi mới nhất.

---

### 4️⃣ Câu 4 (Về Xếp hạng Điểm số Thí sinh trong Ca thi - Window Functions):

> **Giáo viên hỏi:** *"Hãy viết câu lệnh SQL xếp hạng thứ tự điểm số của các thí sinh tham gia Ca thi `exam_id = 10`. Nếu 2 thí sinh bằng điểm nhau thì đồng hạng và thí sinh tiếp theo không bị nhảy cách thứ hạng?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
SELECT 
    er.candidate_id,
    ec.full_name,
    ec.sbd,
    er.score,
    er.submit_time,
    DENSE_RANK() OVER (ORDER BY er.score DESC, er.submit_time ASC) AS ranking
FROM exam_results er
JOIN exam_candidates ec ON er.candidate_id = ec.id
WHERE er.exam_id = 10 AND er.is_cancelled = FALSE;
```

- **Giải thích:**
  - Hàm `DENSE_RANK()` giúp xếp hạng đồng hạng (VD: Hai thí sinh điểm 9.0 cùng xếp hạng 2, người điểm 8.5 tiếp theo sẽ xếp hạng 3 thay vì hạng 4 như hàm `RANK()`).
  - Tiêu chí phụ `ORDER BY er.submit_time ASC` ưu tiên thí sinh nộp bài sớm hơn nếu bằng điểm.

---

### 5️⃣ Câu 5 (Về Tối ưu Chỉ mục Index & Kiểm tra Hiệu năng EXPLAIN ANALYZE):

> **Giáo viên hỏi:** *"Bảng `exam_results` có 100.000 bản ghi. Truy vấn tìm bài thi theo `exam_id` và `candidate_id` chạy bị chậm. Em đánh Index như thế nào và kiểm tra xem câu lệnh SQL đã ăn Index chưa?"*

#### 💡 Câu trả lời & Truy vấn SQL:

- **Tạo Composite Index (Chỉ mục kết hợp):**

```sql
CREATE INDEX idx_exam_results_exam_candidate 
ON exam_results (exam_id, candidate_id);
```

- **Kiểm tra Kế hoạch thực thi (Execution Plan):**

```sql
EXPLAIN ANALYZE 
SELECT * FROM exam_results 
WHERE exam_id = 10 AND candidate_id = 502;
```

- **Giải thích phân tích:**
  - Nếu xuất hiện `Index Scan` hoặc `Index Only Scan` sử dụng `idx_exam_results_exam_candidate` nghĩa là truy vấn đã được tối ưu thành công.
  - Nếu xuất hiện `Seq Scan` (Sequential Scan - quét toàn bộ bảng), hệ thống đang bị chậm và cần kiểm tra lại kiểu dữ liệu của điều kiện `WHERE`.

---

### 6️⃣ Câu 6 (Về Khóa dữ liệu chống Race Condition khi Nộp bài - Pessimistic Locking):

> **Giáo viên hỏi:** *"Khi thí sinh ấn Nộp bài, làm sao để trong SQL không bị xung đột dữ liệu (Race Condition) nếu có 2 request cập nhật trạng thái bài thi gửi lên cùng một lúc?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
BEGIN;

-- Khóa dòng dữ liệu bài thi để không cho transaction khác sửa đổi
SELECT id, status 
FROM exam_submissions 
WHERE exam_id = 10 AND candidate_id = 502 
FOR UPDATE;

-- Cập nhật kết quả bài thi
UPDATE exam_submissions 
SET status = 'SUBMITTED', 
    submit_time = NOW(),
    score = 8.5
WHERE exam_id = 10 AND candidate_id = 502 AND status = 'IN_PROGRESS';

COMMIT;
```

- **Giải thích:** `FOR UPDATE` thực hiện **Pessimistic Locking (Khóa bi quan)** trên dòng bản ghi đó. Request thứ 2 đến sau sẽ phải chờ Request 1 hoàn tất (`COMMIT` hoặc `ROLLBACK`), tránh tình trạng ghi đè trạng thái bài thi.

---

### 7️⃣ Câu 7 (Về Lấy dữ liệu Bài thi Chính thức mới nhất khi Thi lại - Soft Delete Query):

> **Giáo viên hỏi:** *"Một thí sinh có thể thi lại nhiều lần (`attempt_number = 1, 2...`) hoặc có bài thi bị hủy (`is_cancelled = TRUE`). Hãy viết SQL lấy ra kết quả thi chính thức hợp lệ cuối cùng của thí sinh đó?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
SELECT er.*
FROM exam_results er
WHERE er.candidate_id = 502 
  AND er.subject_id = 1
  AND er.is_cancelled = FALSE
ORDER BY er.attempt_number DESC
LIMIT 1;
```

- **Hoặc viết dạng Subquery gom nhóm cho tất cả thí sinh:**

```sql
SELECT er.*
FROM exam_results er
INNER JOIN (
    SELECT candidate_id, subject_id, MAX(attempt_number) AS max_attempt
    FROM exam_results
    WHERE is_cancelled = FALSE
    GROUP BY candidate_id, subject_id
) latest ON er.candidate_id = latest.candidate_id 
        AND er.subject_id = latest.subject_id 
        AND er.attempt_number = latest.max_attempt;
```

- **Giải thích:** Loại bỏ các bài thi bị hủy (`is_cancelled = FALSE`) và chỉ lấy bản ghi có `attempt_number` lớn nhất cho mỗi môn học.

---

### 8️⃣ Câu 8 (Về Lấy ngẫu nhiên Câu hỏi theo Ma trận đề thi & Nhược điểm ORDER BY RANDOM):

> **Giáo viên hỏi:** *"Viết câu lệnh SQL lấy ngẫu nhiên 10 câu hỏi Mức độ Vận dụng (`VAN_DUNG`) của Môn Toán (`subject_id = 2`). Tại sao `ORDER BY RANDOM()` lại chậm khi ngân hàng có 50.000 câu?"*

#### 💡 Câu trả lời & Truy vấn SQL:

- **Câu lệnh SQL lấy ngẫu nhiên chuẩn:**

```sql
SELECT id, content, options 
FROM questions 
WHERE subject_id = 2 
  AND difficulty = 'VAN_DUNG' 
  AND status = 'APPROVED' 
  AND is_deleted = FALSE
ORDER BY RANDOM() 
LIMIT 10;
```

- **Giải thích nhược điểm & Giải pháp tối ưu:**
  - **Nhược điểm:** `ORDER BY RANDOM()` buộc Database Engine phải gán 1 số ngẫu nhiên cho tất cả bản ghi thỏa mãn điều kiện `WHERE`, sau đó thực hiện **Sắp xếp toàn bộ dữ liệu (Full Table Sort)** rồi mới lấy 10 bản ghi đầu. Với 50.000 câu hỏi, thao tác này cực kỳ tốn CPU và RAM.
  - **Giải pháp tối ưu cho Dữ liệu lớn:** Lấy danh sách danh sách `ID` thỏa mãn điều kiện về Backend, sau đó dùng thuật toán `Fisher-Yates Shuffle` ở code application để chọn ngẫu nhiên 10 ID, rồi gọi SQL `WHERE id IN (...)`.

---

### 9️⃣ Câu 9 (Về Tự động Ghi vết Audit Log thay đổi Điểm số bằng Trigger):

> **Giáo viên hỏi:** *"Em làm thế nào để ở mức Database, mỗi khi có ai đó sửa trường `score` trong bảng `exam_results`, hệ thống tự động lưu vết điểm cũ, điểm mới và thời gian sửa vào bảng `audit_logs`?"*

#### 💡 Câu trả lời & Truy vấn SQL:

- **Bước 1: Tạo hàm xử lý Trigger (Trigger Function):**

```sql
CREATE OR REPLACE FUNCTION log_score_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.score IS DISTINCT FROM NEW.score THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value, changed_at)
        VALUES (
            'exam_results',
            NEW.id,
            'UPDATE_SCORE',
            json_build_object('score', OLD.score),
            json_build_object('score', NEW.score),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

- **Bước 2: Gắn Trigger vào bảng `exam_results`:**

```sql
CREATE TRIGGER trigger_exam_results_score_audit
AFTER UPDATE ON exam_results
FOR EACH ROW
EXECUTE FUNCTION log_score_change();
```

- **Giải thích:** Trigger chạy tự động dưới tầng DB ngay khi có câu lệnh `UPDATE`. Đảm bảo tính minh bạch tối đa kể cả khi ai đó can thiệp trực tiếp vào DB mà không thông qua giao diện Web.

---

### 10️⃣ Câu 10 (Về Cấu hình Khóa ngoại Ràng buộc Xóa thí sinh - ON DELETE CASCADE vs RESTRICT):

> **Giáo viên hỏi:** *"Khi xóa một bản ghi trong bảng `exam_candidates`, làm sao thiết lập SQL để tự động xóa các môn học đăng ký trong `student_subjects` nhưng **chặn không cho xóa** nếu thí sinh đó đã có kết quả thi trong `exam_results`?"*

#### 💡 Câu trả lời & Truy vấn SQL:

```sql
-- 1. Với bảng student_subjects: Cấu hình ON DELETE CASCADE (Xóa tự động theo thí sinh)
ALTER TABLE student_subjects
DROP CONSTRAINT IF EXISTS fk_student_subjects_candidate,
ADD CONSTRAINT fk_student_subjects_candidate
    FOREIGN KEY (candidate_id) 
    REFERENCES exam_candidates(id)
    ON DELETE CASCADE;

-- 2. Với bảng exam_results: Cấu hình ON DELETE RESTRICT (Chặn xóa nếu đã có lịch sử thi)
ALTER TABLE exam_results
DROP CONSTRAINT IF EXISTS fk_exam_results_candidate,
ADD CONSTRAINT fk_exam_results_candidate
    FOREIGN KEY (candidate_id) 
    REFERENCES exam_candidates(id)
    ON DELETE RESTRICT;
```

- **Giải thích:**
  - `ON DELETE CASCADE`: Khi xóa thí sinh `id = 5`, tất cả các dòng đăng ký môn trong `student_subjects` có `candidate_id = 5` sẽ tự động bị xóa theo.
  - `ON DELETE RESTRICT`: Nếu thí sinh `id = 5` đã có ít nhất 1 bài thi trong `exam_results`, câu lệnh `DELETE FROM exam_candidates WHERE id = 5` sẽ bị Database từ chối và báo lỗi vi phạm ràng buộc khóa ngoại (Foreign Key Constraint Violation), đảm bảo không bao giờ bị mất dữ liệu lịch sử điểm thi.

---

## 🏗️ PHẦN IV: BỘ CÂU HỎI VỀ KIẾN TRÚC HỆ THỐNG TỔNG THỂ (MICROSERVICES ARCHITECTURE)

---

### 1️⃣ Câu 1 (Về Centralized Database trong Kiến trúc Microservices):

> **Giáo viên hỏi:** *"Em vẽ sơ đồ hệ thống là Microservices nhưng tại sao tất cả các Service (Auth, QuanLyThi, Analytics, Exam) lại cùng kết nối chung tới một MySQL Database (Central Store)? Việc này có vi phạm nguyên tắc thiết kế Microservices không?"*

#### 💡 Câu trả lời chi tiết:

- **Nguyên lý thiết kế:** Về mặt lý thuyết chuẩn thiết kế Microservices (*Database-per-Service pattern*), mỗi microservice nên sở hữu cơ sở dữ liệu riêng để bảo đảm tính độc lập, loose coupling và khả năng mở rộng (scale). Việc dùng chung một DB tạo ra mô hình gọi là *Distributed Monolith*.
- **Giải trình quyết định kiến trúc trong đồ án:**
  1. **Tối ưu nguồn lực & Giản lược hạ tầng:** Trong phạm vi đồ án tốt nghiệp, việc sử dụng **Shared Database (Central Store)** giúp giảm độ phức tạp trong quản lý giao dịch liên dịch vụ (tránh phải triển khai Distributed Transactions / Saga Pattern phức tạp) và đơn giản hóa môi trường triển khai.
  2. **Đảm bảo tính nhất quán dữ liệu (ACID):** Dữ liệu ca thi, thí sinh và đề thi có quan hệ ràng buộc chặt chẽ với nhau. Dùng chung MySQL DB giúp tận dụng cơ chế giao dịch ACID của RDBMS.
  3. **Khả năng mở rộng tương lai:** Mặc dù dùng chung CSDL vật lý, nhưng lớp truy vấn dữ liệu trong code Backend (FastAPI + SQLAlchemy Async) đã được bóc tách theo từng Bounded Context rõ ràng. Khi hệ thống cần mở rộng thực tế, việc tách DB vật lý cho từng Service (đặc biệt là Auth Service và Analytics Service) hoàn toàn dễ dàng thực hiện.

---

### 2️⃣ Câu 2 (Về Giao tiếp Synchronous HTTP REST vs Asynchronous Message Broker):

> **Giáo viên hỏi:** *"Anh/Chị thấy Analytics Service gọi trực tiếp sang QuanLyThi Service và Exam Service qua HTTP REST (HTTPX). Tại sao không dùng Message Broker (như RabbitMQ / Kafka) để truyền dữ liệu bất đồng bộ mà lại dùng HTTP REST trực tiếp?"*

#### 💡 Câu trả lời chi tiết:

- **So sánh 2 mô hình:**
  - **HTTP REST (Synchronous):** Giao tiếp đồng bộ/bất đồng bộ trực tiếp qua HTTP. Dễ triển khai, truy vấn lấy dữ liệu thời gian thực (Real-time aggregation) ngay lập tức. Nhược điểm: Phụ thuộc tính sẵn sàng của service đích, nguy cơ tăng latency tích tụ nếu chuỗi gọi API dài.
  - **Message Broker (Asynchronous Event-Driven):** Giao tiếp qua Hàng chờ tin nhắn. Giảm gánh nặng kết nối trực tiếp, độ chịu lỗi cao. Nhược điểm: Phức tạp trong hạ tầng, dữ liệu mang tính *Eventual Consistency* (nhất quán sau một khoảng thời gian).
- **Lý do lựa chọn trong đồ án:**
  - `Analytics Service` cần tổng hợp số liệu báo cáo thời gian thực khi Admin mở trang Dashboard. Việc dùng thư viện bất đồng bộ `httpx` (Async HTTP) cho phép gửi các request truy vấn song song (Parallel Requests) cực nhanh mà không làm nghẽn Event Loop.
  - Với tải trọng hiện tại của hệ thống, HTTP REST qua `httpx` hoàn toàn đáp ứng được hiệu năng mà không tốn chi phí vận hành thêm một hạ tầng Message Broker phức tạp như RabbitMQ hay Kafka. Trong định hướng nâng cấp khi scale hệ thống lớn hơn, phần Analytics sẽ được chuyển sang mô hình Event-Driven.

---

### 3️⃣ Câu 3 (Về Vai trò của API Gateway Layer):

> **Giáo viên hỏi:** *"FastAPI API Gateway (Port 8000) đóng vai trò gì ngoài việc định tuyến (Routing) sang các port 8001 - 8005? Em có triển khai xác thực (Authentication) hay Rate Limiting tại Gateway không?"*

#### 💡 Câu trả lời chi tiết:

- **Các chức năng cốt lõi của API Gateway Layer trong hệ thống:**
  1. **Định tuyến tập trung (Centralized Routing):** Nhận tất cả request từ Client (ReactJS) tại Port 8000 và điều hướng chính xác đến từng Microservice phía sau (`/auth/*` -> Auth Service 8004, `/exams/*` -> Exam Service 8001, `/ai/*` -> AI Service 8002...).
  2. **Xác thực và Giải mã Token (Authentication Gateway):** API Gateway đóng vai trò lớp bảo vệ vòng ngoài. Khi request gửi lên kèm Bearer Token, Gateway thực hiện kiểm tra tính hợp lệ (Verify Signature) của JWT. Nếu token hợp lệ, Gateway giải mã thông tin User (`user_id`, `role`) và forward header xuống các service nội bộ.
  3. **Cấu hình CORS & Security Headers tập trung:** Quản lý chia sẻ tài nguyên cross-origin (CORS) tại một nơi duy nhất thay vì phải cấu hình rải rác trên từng microservice.
  4. **Tách biệt hạ tầng nội bộ:** Giúp giấu toàn bộ danh sách port nội bộ (8001-8005) của các microservice phía sau Firewall, Client chỉ giao tiếp qua cổng 8000.

---

### 4️⃣ Câu 4 (Về Tích hợp AI Service & Xử lý Chịu lỗi với Gemini API):

> **Giáo viên hỏi:** *"AI Service gọi sang Google Gemini API thông qua google-genai SDK. Nếu Gemini API bị chậm (latency cao), nghẽn mạng hoặc vượt hạn ngạch (Rate Limit 429), hệ thống của em sẽ xử lý thế nào để không làm treo Exam Service?"*

#### 💡 Câu trả lời chi tiết:

- **Cơ chế Fault Tolerance & Resilience khi tích hợp AI bên thứ 3:**
  1. **Giao tiếp Non-blocking Async:** Trong `AI Service`, các lời gọi API tới Gemini được bọc trong hàm bất đồng bộ (Async I/O), đảm bảo không làm khóa thread xử lý của FastAPI.
  2. **Cấu hình Timeout chặt chẽ:** Thiết lập thời gian chờ tối đa (ví dụ 15-30 giây) cho các request sinh đề/câu hỏi bằng AI. Nếu quá thời gian này, hệ thống sẽ ngắt kết nối (Timeout Exception) thay vì treo vô thời hạn.
  3. **Xử lý Exception & Retry Mechanism:**
     - Nếu gặp lỗi Rate Limit (HTTP 429) hoặc lỗi tạm thời từ Google Server (HTTP 503), hệ thống áp dụng chiến lược **Exponential Backoff Retry** (thử lại sau 2s, 4s, 8s).
     - Nếu retry quá số lần cho phép, AI Service trả về Error Code rõ ràng cho Exam Service để hiển thị thông báo thân thiện cho giáo viên: *"Hệ thống AI hiện đang bận, vui lòng thử lại sau ít phút"*.
  4. **Caching kết quả AI:** Các đề thi/câu hỏi đã được AI sinh thành công sẽ được lưu vết ngay vào DB/Cache, tránh việc gọi lại Gemini API cho các nội dung trùng lặp.

---

### 5️⃣ Câu 5 (Về Phân chia Bounded Context giữa QuanLyThi Service và Exam Service):

> **Giáo viên hỏi:** *"Ranh giới nghiệp vụ (Bounded Context) giữa QuanLyThi Service (Port 8005) và Exam Service (Port 8001) khác nhau như thế nào mà em lại tách thành 2 service riêng biệt?"*

#### 💡 Câu trả lời chi tiết:

- **Phân định Ranh giới Nghiệp vụ (Domain Driven Design - DDD):**
  - **`QuanLyThi Service` (Management Context):** Phụ trách các tác vụ **quản trị hành chính ca thi**. Bao gồm: Tạo/chỉnh sửa ca thi, phân công giám thị, danh sách thí sinh dự thi, phòng thi, thời gian bắt đầu/kết thúc ca thi, trạng thái ca thi (Chờ thi, Đang thi, Đã kết thúc).
  - **`Exam Service` (Core Exam Context):** Phụ trách các tác vụ **lõi của đề thi và quá trình thi**. Bao gồm: Quản lý ngân hàng câu hỏi, sinh đề thi hoán vị, nhận bài làm của thí sinh, đếm ngược thời gian thi, tính điểm tự động (Auto-grading) và lưu trữ lịch sử chọn đáp án của từng câu hỏi.
- **Lý do tách biệt:** Đảm bảo nguyên tắc Single Responsibility. Quá trình tổ chức ca thi (hành chính) không làm ảnh hưởng đến hiệu năng của Server làm bài thi (lõi). Khi diễn ra ca thi lớn, ta có thể scale riêng `Exam Service` lên nhiều instance mà không cần scale `QuanLyThi Service`.

---

### 6️⃣ Câu 6 (Về Hiệu năng Async I/O với FastAPI và aiomysql):

> **Giáo viên hỏi:** *"Tại sao em chọn FastAPI và thư viện SQLAlchemy (aiomysql) cho tất cả các Microservice Backend? Việc dùng Async I/O mang lại lợi ích gì vượt trội?"*

#### 💡 Câu trả lời chi tiết:

- **Lợi ích của Async I/O (FastAPI + aiomysql):**
  1. **Non-blocking I/O Architecture:** Các ứng dụng Web quản lý thi có tỷ lệ tác vụ I/O-bound rất cao (đọc/ghi DB, nhận request mạng). Khi một request đang chờ MySQL trả về kết quả hoặc chờ Gemini API phản hồi, Event Loop của FastAPI lập tức chuyển sang xử lý các request khác thay vì đứng chờ (Blocking).
  2. **Tối ưu tài nguyên RAM/CPU:** So với mô hình Thread-per-request truyền thống (như Django/Flask hoặc Tomcat), kiến trúc Async cho phép một single process phục vụ hàng ngàn kết nối đồng thời (Concurrency) với lượng tiêu thụ RAM cực thấp.
  3. **aiomysql Driver:** Kết nối với MySQL theo cơ chế bất đồng bộ thuần túy, tích hợp Connection Pooling giúp quản lý hiệu quả các kết nối CSDL chung giữa các Microservices.

---

### 7️⃣ Câu 7 (Về Bảo mật API Key và Quản lý Biến môi trường):

> **Giáo viên hỏi:** *"API Key của Google Gemini và các chuỗi kết nối Database được quản lý và bảo mật như thế nào trong các Microservices?"*

#### 💡 Câu trả lời chi tiết:

- **Cơ chế quản lý bí mật (Secrets Management):**
  1. **Tuyệt đối không Hardcode trong Code:** Không bao giờ lưu API Key hay DB Password trực tiếp trong file mã nguồn Python hay Git repository.
  2. **Sử dụng Environment Variables (`.env`):** Mỗi Microservice quản lý cấu hình qua file `.env` riêng biệt (được khai báo trong `.gitignore`).
  3. **Pydantic BaseSettings / SecretStr:** Sử dụng thư viện `pydantic-settings` của FastAPI để parse và validate các biến môi trường khi ứng dụng khởi chạy. Các thông tin nhạy cảm như `GEMINI_API_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL` được định nghĩa dưới dạng `SecretStr` để tránh bị in ngẫu nhiên ra log hệ thống.
  4. **Triển khai Production:** Trên môi trường Docker/K8s hoặc VPS, các biến này được inject trực tiếp thông qua Docker Environment Variables hoặc Secret Management Tool (như HashiCorp Vault / AWS Secrets Manager).

---
