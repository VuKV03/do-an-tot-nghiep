# 📊 SmartTest Analytics Service (Port 8003)

## 📌 Giới thiệu
**Analytics Service** là dịch vụ xử lý dữ liệu thống kê và phân tích. Nhiệm vụ chính của dịch vụ này là quét trực tiếp cơ sở dữ liệu MySQL thông qua SQLAlchemy để tính toán các thông số hiệu năng học tập, tỷ lệ phân bố kiến thức, cơ cấu khối lớp và độ khó của đề thi, từ đó cung cấp số liệu hiển thị trực quan cho trang Dashboard.

---

## ⚙️ Các tính năng cốt lõi
1. **Phân tích tổng hợp**:
   - Tính toán tổng số lượng đề thi hiện có trong hệ thống.
   - Phân tích cơ cấu trạng thái của đề thi (Đang hoạt động, Chờ duyệt, Bản nháp, Đã khóa).
   - Tổng hợp số lượt thi (attempts) tích lũy trên toàn hệ thống.
   - Tính toán điểm số trung bình (average score) của tất cả đề thi có kết quả.
2. **Phân tích phân phối môn học (Subject Distribution)**:
   - Thống kê số lượng đề thi theo từng môn học (Toán học, Ngữ văn, Tiếng Anh, Vật lý, v.v.).
3. **Phân tích phân phối khối lớp (Grade Distribution)**:
   - Thống kê tỷ lệ phân bố đề thi theo các khối lớp học (Khối 10, Khối 11, Khối 12, v.v.).
4. **Kiểm tra trạng thái hệ thống**:
   - Trả về chỉ số sức khỏe của luồng xử lý dữ liệu nền tảng.

---

## 🛣️ Các điểm cuối API chính (Port 8003)
* **`GET /summary`**: Lấy thông tin phân tích thống kê.
  - *Tham số đầu vào*: Không có.
  - *Kết quả trả về*:
    ```json
    {
      "success": true,
      "data": {
        "totalExams": 3,
        "activeExams": 1,
        "pendingExams": 1,
        "draftExams": 1,
        "closedExams": 0,
        "totalAttempts": 412,
        "averageScore": 7.2,
        "totalQuestionsCount": 12,
        "subjectDistribution": {
          "Toán học": 1,
          "Ngữ văn": 1,
          "Tiếng Anh": 1
        },
        "gradeDistribution": {
          "Khối 12": 1,
          "Khối 11": 1,
          "Khối 10": 1
        },
        "systemHealth": "100%",
        "updatedAt": "2026-06-19T04:30:00.000Z"
      }
    }
    ```
* **`GET /health`**: Trả về trạng thái hoạt động của dịch vụ.

---

## 🚀 Khởi chạy độc lập
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
python -m backend.analytics_service.main
```
Dịch vụ sẽ khởi động tại: `http://localhost:8003`
Tài liệu hướng dẫn API trực quan (Swagger UI): `http://localhost:8003/docs`
