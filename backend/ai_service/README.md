# 🤖  AI Service (Port 8002)

## 📌 Giới thiệu

**AI Service** chịu trách nhiệm tương tác trực tiếp với mô hình ngôn ngữ lớn **Google Gemini 3.5 Flash** (thông qua SDK Python chính thức `google-genai`). Dịch vụ này hỗ trợ giáo viên tự động hóa các tác vụ biên soạn học thuật và cấu hình tham số đề kiểm tra bằng cách phân tích chuyên đề và sinh câu hỏi trắc nghiệm thông minh.

---

## ⚙️ Các tính năng cốt lõi

1. **Đề xuất cấu hình kiểm tra (`/suggest`)**: Dựa trên môn học, khối lớp và từ khóa chuyên đề người dùng nhập vào, AI sẽ phân tích và đưa ra gợi ý:
   - Tiêu đề kiểm tra chuẩn hóa (ví dụ: *"Khảo sát Đại số & Giải tích 12 - Chuyên đề Nguyên hàm"*).
   - Thời gian làm bài tối ưu (15, 45, 60, 90 phút).
   - Mô tả tóm tắt nội dung kiểm tra khoa học.
2. **Sinh đề thi trắc nghiệm (`/generate`)**: Dựa trên cấu hình ma trận (tỉ lệ phần trăm độ khó Dễ/Vừa/Khó) và chủ đề, AI biên soạn bộ câu hỏi trắc nghiệm chất lượng cao bám sát chương trình học. Câu hỏi trả về định dạng JSON chuẩn hóa gồm: nội dung câu hỏi, 4 đáp án loại trừ và đáp án đúng.
3. **Cơ chế Retry thông minh**: Tự động thực hiện lại cuộc gọi (lên đến 3 lần với khoảng chờ tăng dần) khi gặp lỗi quá tải hoặc mất kết nối mạng tạm thời từ máy chủ Google API.

---

## 🛣️ Các điểm cuối API chính (Port 8002)

* **`POST /suggest`**: Gợi ý cấu hình đề thi.
  - *Tham số đầu vào*:
    ```json
    {
      "subject": "Toán học",
      "grade": "Khối 12",
      "topic": "Hình học Oxyz phương trình mặt phẳng"
    }
    ```
  - *Kết quả trả về*:
    ```json
    {
      "success": true,
      "suggestedTitle": "Kiểm tra chuyên đề Phương trình mặt phẳng trong không gian Oxyz",
      "suggestedDuration": 45,
      "suggestedDescription": "Đánh giá mức độ nhận thức của học sinh về khái niệm vectơ pháp tuyến, phương trình mặt phẳng và các bài toán khoảng cách, góc trong không gian."
    }
    ```
* **`POST /generate`**: Sinh gói câu hỏi trắc nghiệm.
  - *Tham số đầu vào*:
    ```json
    {
      "subject": "Tiếng Anh",
      "grade": "Khối 10",
      "topic": "Conditional Sentences Type 1 & 2",
      "count": 5,
      "easyPercent": 40,
      "mediumPercent": 40,
      "hardPercent": 20
    }
    ```
  - *Kết quả trả về*: Danh sách câu hỏi trắc nghiệm có cấu trúc chuẩn để đẩy trực tiếp vào ngân hàng dữ liệu.
* **`GET /health`**: Trả về trạng thái hoạt động của dịch vụ.

---

## 🚀 Khởi chạy độc lập

Yêu cầu đã cấu hình biến môi trường `GEMINI_API_KEY` trong file `.env` ở thư mục gốc. Chạy lệnh sau:

```bash
python -m backend.ai_service.main
```

Dịch vụ sẽ khởi động tại: `http://localhost:8002`
Tài liệu hướng dẫn API trực quan (Swagger UI): `http://localhost:8002/docs`
