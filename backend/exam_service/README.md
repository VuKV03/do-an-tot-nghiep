# 📝 SmartTest Exam Service (Port 8001)

## 📌 Giới thiệu
**Exam Service** là dịch vụ lõi quản lý dữ liệu trong hệ thống SmartTest. Dịch vụ này xử lý toàn bộ các tác vụ CRUD (Thêm, Đọc, Sửa, Xóa) liên quan đến ngân hàng câu hỏi, ma trận cấu hình đề thi và xuất bản gói đề. Dịch vụ kết nối trực tiếp với cơ sở dữ liệu **MySQL** thông qua thư viện ORM **SQLAlchemy (AsyncIO)**.

---

## ⚙️ Các tính năng cốt lõi
1. **Quản lý Đề thi (Exams)**: Lưu trữ mã đề, tên đề, môn học, khối lớp, thời gian làm bài, số lượng câu hỏi và điểm số trung bình.
2. **Quản lý Câu hỏi (Questions)**: Lưu trữ các câu hỏi trắc nghiệm liên kết với từng đề thi, bao gồm nội dung câu hỏi, độ khó (easy, medium, hard), danh sách 4 lựa chọn và đáp án đúng.
3. **Quản lý Gói đề (Packages)**: Nhóm các đề thi thành đợt khảo sát, quản lý lượt tải xuống, phân loại quyền truy cập (free, premium) và mô tả chuyên đề.
4. **Tự động Khởi tạo & Gieo dữ liệu (Database Seeding)**: Tự động chạy migration tạo bảng MySQL và nạp dữ liệu mẫu (Toán, Văn, Anh) khi phát hiện cơ sở dữ liệu trống lúc khởi động.

---

## 💾 Cấu trúc thực thể cơ sở dữ liệu (Models)
* **`Exam` (Bảng `exams`)**:
  - `id`: Mã định danh đề (String, Khóa chính)
  - `code`: Mã đề thi (String, Unique)
  - `name`: Tên đề thi (String)
  - `subject`, `grade`: Môn học, khối lớp
  - `status`: Trạng thái (`active`, `pending`, `draft`, `closed`)
  - `duration`: Thời gian làm bài (phút)
  - `avgScore`: Điểm số trung bình
  - `attempts`: Lượt thi
  - `source`: Nguồn tạo (`manual`, `matrix`, `ai`)

* **`Question` (Bảng `questions`)**:
  - `id`: Khóa chính
  - `examId`: Khóa ngoại liên kết bảng `exams`
  - `text`: Nội dung câu hỏi
  - `options`: Mảng JSON chứa 4 lựa chọn đáp án
  - `correctAnswer`: Ký tự đáp án đúng (`A`, `B`, `C`, `D`)
  - `level`: Độ khó (`easy`, `medium`, `hard`)

* **`Package` (Bảng `packages`)**:
  - `id`: Khóa chính
  - `code`, `name`, `subject`, `grade`, `status`, `description`
  - `examsCount`: Số đề trong gói
  - `examIds`: Mảng JSON chứa các ID đề thuộc gói
  - `accessType`: Quyền truy cập (`free`, `premium`)
  - `downloadsCount`: Số lượt tải về

---

## 🛣️ Các điểm cuối API chính (Port 8001)
* **Quản lý Đề thi**:
  - `GET /exams/`: Lấy toàn bộ danh sách đề thi.
  - `GET /exams/{id}`: Xem chi tiết một đề thi cùng danh sách câu hỏi.
  - `POST /exams/`: Tạo mới một đề thi kèm câu hỏi.
  - `PUT /exams/{id}`: Cập nhật thông tin đề thi.
  - `DELETE /exams/{id}`: Xóa đề thi (xóa cascade câu hỏi liên quan).
* **Quản lý Gói đề**:
  - `GET /packages/`: Lấy danh sách gói đề.
  - `GET /packages/{id}`: Xem chi tiết một gói đề.
  - `POST /packages/`: Tạo mới gói đề thi.
  - `PUT /packages/{id}`: Cập nhật thông tin gói đề.
  - `DELETE /packages/{id}`: Xóa gói đề thi.
* **Kiểm tra**:
  - `GET /health`: Trả về trạng thái hoạt động của dịch vụ.

---

## 🚀 Khởi chạy độc lập
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
python -m backend.exam_service.main
```
Dịch vụ sẽ khởi động tại: `http://localhost:8001`
Tài liệu hướng dẫn API trực quan (Swagger UI): `http://localhost:8001/docs`
