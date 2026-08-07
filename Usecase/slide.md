# KỊCH BẢN VÀ NỘI DUNG SLIDE BẢO VỆ ĐỒ ÁN TỐT NGHIỆP
**Đề tài:** Nghiên cứu ứng dụng kiến trúc Microservices và Trí tuệ nhân tạo xây dựng hệ thống quản lý và tạo sinh đề thi trắc nghiệm cho học sinh THPT.

---

## PHẦN 1: MỞ ĐẦU & CƠ SỞ LÝ THUYẾT (20% - 5 Slides)

### Slide 1: Trang bìa
- **Tiêu đề:** Nghiên cứu ứng dụng kiến trúc Microservices và Trí tuệ nhân tạo xây dựng hệ thống quản lý và tạo sinh đề thi trắc nghiệm cho học sinh THPT.
- **Giảng viên hướng dẫn:** ThS. Nguyễn Hoàng Anh
- **Sinh viên thực hiện:** 
  - Nguyễn Văn Chiến (B21DVCN029)
  - Khuất Văn Vũ (B21DVCN199)
  - Đào Hà Ngân (B21DVCN118)
- **📸 Hướng dẫn chèn ảnh:** Chèn Logo chuẩn của PTIT (Học viện Công nghệ Bưu chính Viễn thông) ở góc trái hoặc chính giữa phía trên. Link tải logo chuẩn: [Tại đây](https://portal.ptit.edu.vn/wp-content/uploads/2016/04/ptit-logo.png)

### Slide 2: Tổng quan nội dung trình bày
- **Nội dung:**
  1. Mở đầu & Cơ sở lý thuyết
  2. Phân tích & Thiết kế hệ thống
  3. Tích hợp Trí tuệ nhân tạo (AI)
  4. Triển khai, Kết quả & Hướng phát triển
- **📸 Hướng dẫn chèn ảnh:** Sử dụng tính năng **SmartArt** trong PowerPoint (Insert > SmartArt > List hoặc Process) để tạo 4 ô quy trình đẹp mắt. Bạn có thể chèn các icon nhỏ như: Hình quyển sách (1), Hình bánh răng (2), Hình Robot AI (3), Hình tên lửa/biểu đồ (4). (Tải icon miễn phí tại [Flaticon](https://www.flaticon.com/)).

### Slide 3: Đặt vấn đề & Lý do chọn đề tài
- **Thực trạng:** Việc quản lý ngân hàng câu hỏi thủ công, tạo đề thi và trộn đề mất nhiều thời gian, dễ sai sót.
- **Nhu cầu:** Cần một hệ thống số hóa, tự động hóa toàn diện quy trình đánh giá, kiểm tra năng lực học sinh THPT.
- **Giải pháp đề xuất:** Ứng dụng công nghệ mới (AI, Microservices) để giải quyết bài toán trên.
- **📸 Hướng dẫn chèn ảnh:** Chèn một hình minh họa sự vất vả của giáo viên khi chấm bài/trộn đề (có thể tìm trên Freepik với từ khóa "teacher marking exam illustration") và mũi tên chỉ sang một hệ thống máy tính tự động.

### Slide 4: Mục tiêu hệ thống
- Xây dựng hệ thống quản lý ngân hàng câu hỏi đa dạng (phân loại theo độ khó, chủ đề, thành phần năng lực).
- Hỗ trợ tạo đề thi tự động/thủ công, sinh mã đề hoán vị và thi trực tuyến.
- Tích hợp Trí tuệ nhân tạo (AI) hỗ trợ sinh câu hỏi và tự động tạo đề thi theo ma trận.
- **📸 Hướng dẫn chèn ảnh:** Tạo sơ đồ Mindmap 3 nhánh (bằng SmartArt). Mỗi nhánh gắn với 1 icon nhỏ: Icon Cơ sở dữ liệu (Quản lý), Icon Đề thi (Tạo đề), Icon Ngôi sao thần kỳ (AI).

### Slide 5: Công nghệ & Nền tảng
- **Kiến trúc:** Microservices.
- **Backend:** Python, FastAPI.
- **Frontend:** React, TypeScript.
- **Cơ sở dữ liệu:** MySQL, TiDB (Phân tán).
- **Trí tuệ nhân tạo (AI):** Google Gemini.
- **📸 Hướng dẫn chèn ảnh:** **Tuyệt đối không dùng chữ text dài.** Hãy lên Google tải các Logo chuẩn (có đuôi .png nền trong suốt) của: FastAPI, React, TypeScript, MySQL, TiDB, Google Gemini. Xếp thành 3 cụm: Frontend, Backend, AI.

---

## PHẦN 2: PHÂN TÍCH & THIẾT KẾ HỆ THỐNG (35% - 8 Slides)

### Slide 6: Kiến trúc hệ thống tổng thể
- **Nội dung trình bày:** Giới thiệu mô hình Microservices, luồng giao tiếp qua API Gateway. Sự độc lập giữa các services (Users, Exams, AI, v.v.).
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Chèn trực tiếp **Hình 2.1: Kiến trúc hệ thống tổng thể** (Nằm trong Mục 2.1.1 của báo cáo docx).

### Slide 7: Các tác nhân & Phân quyền (RBAC)
- **Các vai trò chính:** Quản trị viên, Trưởng phòng giáo vụ, Tổ trưởng bộ môn, Giảng viên, Thí sinh.
- **Cơ chế bảo mật:** Xác thực JWT và Phân quyền Role-Based Access Control (RBAC).
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Chèn **Hình 2.3: Biểu đồ usecase tổng quát** (Nếu hình quá to thì cắt gọn lại chỉ để lại các hình nhân vật Actor đứng bên ngoài hệ thống).

### Slide 8: Quy trình nghiệp vụ cốt lõi
- **Luồng công việc chính:** 
  1. Tạo/Duyệt câu hỏi -> 2. Thiết lập ma trận đề -> 3. Sinh đề thi -> 4. Hoán vị mã đề -> 5. Tổ chức thi.
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Chèn trực tiếp **Hình 2.2: Quy trình nghiệp vụ hệ thống** (Nằm trong Mục 2.2.1 của báo cáo docx).

### Slide 9: Thiết kế Cơ sở dữ liệu (ERD)
- **Nội dung:** Giải pháp lưu trữ dữ liệu ngân hàng câu hỏi lớn bằng CSDL phân tán TiDB kết hợp MySQL. Nhấn mạnh việc bóc tách CSDL cho từng service.
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Chèn trực tiếp **Hình 2.3.1.3: Biểu đồ thực thể liên kết (ERD)**. (Chỉ cần hình tổng quát, hội đồng không cần đọc quá rõ từng field nhỏ).

### Slide 10: Quản lý Ngân hàng câu hỏi
- **Tính năng:** Phân loại câu hỏi sâu theo (Cấp độ tư duy, Thành phần năng lực, Khối lớp, Chủ đề, Loại câu hỏi).
- **📸 Hướng dẫn chèn ảnh:** Mở trực tiếp hệ thống đang chạy của bạn trên trình duyệt web -> **Chụp ảnh màn hình (Screenshot)** giao diện danh sách Câu hỏi. (Hoặc lấy từ chương 4 trong báo cáo). Nên khoanh đỏ vào các ô bộ lọc (filter) để thấy rõ tính năng phân loại.

### Slide 11: Quy trình Thẩm định câu hỏi
- **Luồng duyệt:** Giảng viên soạn thảo -> Gửi duyệt -> Tổ trưởng bộ môn (Phê duyệt/Từ chối).
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Chèn **Hình 2.89: Biểu đồ hoạt động chức năng thẩm định** (hoặc dùng SmartArt tự vẽ 3 khối trạng thái: Nháp -> Đang chờ duyệt -> Đã duyệt).

### Slide 12: Quản lý Ma trận đề thi
- **Tính năng:** Thiết lập ma trận đề thi linh hoạt, quy định chi tiết số lượng câu, điểm số tương ứng với mức độ khó dễ và chủ đề.
- **📸 Hướng dẫn chèn ảnh:** Mở trực tiếp hệ thống -> **Chụp ảnh màn hình (Screenshot)** giao diện tạo/cấu hình Ma trận đề thi. (Bắt buộc phải có ảnh để hội đồng thấy được sự tiện dụng của UI).

### Slide 13: Quản lý Đề gốc & Hoán vị Đề thi
- **Luồng xử lý:** Từ Đề gốc (chọn tay hoặc AI) -> Trộn sinh ra nhiều mã đề hoán vị -> Nhóm thành Gói đề -> Xuất file Word.
- **📸 Hướng dẫn chèn ảnh:** Mở trực tiếp hệ thống -> **Chụp ảnh màn hình (Screenshot)** chức năng đang tải file Word đề thi về hoặc danh sách các mã đề đã được trộn.

---

## PHẦN 3: TÍCH HỢP TRÍ TUỆ NHÂN TẠO - AI (25% - 5 Slides)

### Slide 14: Mô hình AI & Kiến trúc tích hợp
- **Mô hình sử dụng:** Google Gemini AI.
- **Luồng xử lý phía server:** Nhận request -> Ráp Prompt -> Gửi API tới LLM -> Xử lý chuỗi JSON trả về -> Lưu vào DB.
- **📸 Hướng dẫn chèn ảnh:** **CẮT TỪ BÁO CÁO:** Tìm và chèn **Hình 3.3: Quy trình xử lý phía máy chủ** (Chương 3).

### Slide 15: Kỹ thuật Prompt Engineering
- **Mục tiêu:** Định hướng cho AI hiểu bối cảnh giáo dục THPT và trả về định dạng JSON chuẩn xác 100%.
- **📸 Hướng dẫn chèn ảnh:** Thay vì dùng ảnh, hãy copy một đoạn Text ngắn về cấu trúc Prompt của bạn cho vào hộp (Code Box) trên slide. Ví dụ: `"Bạn là một chuyên gia giáo dục THPT. Hãy tạo 5 câu hỏi... Yêu cầu trả về định dạng JSON: [{'câu hỏi': '...', 'đáp án': '...'}]"`. Dùng màu sắc nổi bật phần JSON.

### Slide 16: AI - Sinh câu hỏi tự động
- **Tính năng:** Sinh đa dạng các loại câu hỏi: Trắc nghiệm 1 lựa chọn, Đúng/Sai, Trả lời ngắn. Dựa trên chủ đề và mức độ khó yêu cầu.
- **📸 Hướng dẫn chèn ảnh:** Mở hệ thống -> **Chụp ảnh màn hình (Screenshot)** form nhập liệu (input) để tạo câu hỏi bằng AI và kết quả (output) AI vừa tạo ra trên giao diện web.

### Slide 17: AI - Sinh đề thi tự động theo Ma trận
- **Tính năng:** AI tự động phân tích cấu trúc Ma trận đề (ví dụ: cần 5 câu dễ Toán, 2 câu khó Hình) để tự động bốc/sinh câu hỏi lấp đầy ma trận.
- **📸 Hướng dẫn chèn ảnh:** Mở hệ thống -> **Chụp ảnh màn hình (Screenshot)** lúc bấm nút "Tạo đề bằng AI" (Hoặc màn hình Load chờ sinh đề). Khoanh đỏ vào số lượng câu hỏi đã sinh ra khớp với ma trận.

### Slide 18: Đánh giá hiệu quả của AI
- **Ưu điểm:** Tiết kiệm hàng giờ soạn đề, ngân hàng câu hỏi đa dạng, ý tưởng mới mẻ.
- **Nhược điểm/Thách thức:** Hallucination (AI có thể bịa đáp án) -> Bắt buộc phải qua bước Thẩm định.
- **📸 Hướng dẫn chèn ảnh:** Bạn có thể tự kẻ một bảng Table trong PowerPoint (Cột 1: Tạo thủ công, Cột 2: Tạo bằng AI). So sánh về: Thời gian tạo 50 câu hỏi, Tính đa dạng, Tỉ lệ lỗi.

---

## PHẦN 4: TRIỂN KHAI, THỬ NGHIỆM & KẾT LUẬN (20% - 3 Slides)

### Slide 19: Phân hệ Thi Trực tuyến
- **Tính năng:** Màn hình làm bài thi của thí sinh, đồng hồ đếm ngược, tự động chấm điểm và thống kê kết quả.
- **📸 Hướng dẫn chèn ảnh:** Mở hệ thống (Đăng nhập vai trò Thí sinh) -> **Chụp ảnh màn hình (Screenshot)** màn hình đang làm bài kiểm tra trắc nghiệm (có bộ đếm thời gian). Hoặc lấy từ Chương 4 trong báo cáo.

### Slide 20: Kết quả vận hành & Thống kê
- **Hoàn thiện:** Triển khai thành công toàn bộ nghiệp vụ, đáp ứng tốt yêu cầu chức năng, giao diện thân thiện (Figma).
- **📸 Hướng dẫn chèn ảnh:** Mở hệ thống (Đăng nhập vai trò Admin) -> **Chụp ảnh màn hình (Screenshot)** trang Dashboard thống kê (có biểu đồ số lượng câu hỏi, số lượng học sinh, đề thi). 

### Slide 21: Hạn chế, Hướng phát triển & Lời cảm ơn
- **Hạn chế:** Giới hạn API của Google Gemini, cần tối ưu chịu tải khi lượng thí sinh thi trực tuyến tăng đột biến.
- **Hướng phát triển:** Áp dụng Load balancing mạnh hơn, fine-tune mô hình AI riêng (Local LLM) thay vì dùng API trả phí.
- **Lời kết:** Cảm ơn Quý Thầy/Cô trong hội đồng đã lắng nghe!
- **📸 Hướng dẫn chèn ảnh:** Chèn một icon "Cúi chào" hoặc để trống, background đơn giản. Dòng chữ lớn "THANK YOU" hoặc "XIN TRÂN TRỌNG CẢM ƠN".
