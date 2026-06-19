# 🌐 SmartTest API Gateway Service (Port 8000)

## 📌 Giới thiệu
**API Gateway** là cổng nối trung tâm (Reverse Proxy) được xây dựng trên nền tảng **FastAPI**. Nhiệm vụ chính của Gateway là tiếp nhận toàn bộ các yêu cầu `/api/*` từ Client Browser, định tuyến chính xác đến các dịch vụ vi mô (downstream microservices), đồng thời ghi lại nhật ký cuộc gọi hệ thống phục vụ cho việc giám sát hiệu năng.

---

## ⚙️ Các tính năng cốt lõi
1. **Định tuyến ngược (Reverse Proxy)**: Chuyển hướng các yêu cầu HTTP (GET, POST, PUT, DELETE) đến các cổng dịch vụ đích tương ứng mà không làm lộ địa chỉ IP nội bộ của dịch vụ.
2. **Quản lý Replica ảo (Replica State Management)**: Lưu trữ trạng thái số lượng bản sao hoạt động của mỗi microservice (phục vụ hiển thị trên giao diện giám sát).
3. **Cân bằng tải & Cấu hình CORS**: Mở cấu hình CORS để giao tiếp thông suốt với giao diện Frontend.
4. **Log Hệ thống Cuộc gọi (Gateway Logging)**: Sử dụng Middleware ghi lại lịch sử gọi API trong bộ nhớ tạm (rolling log tối đa 50 phần tử) thời gian thực.

---

## 🗺️ Bản đồ định tuyến dịch vụ (Port 8000)
| Đường dẫn API | Dịch vụ đích | Cổng đích | Mô tả |
| :--- | :--- | :---: | :--- |
| `/api/v1/exams/*` | Exam Service | `8001` | Quản lý Đề thi / Câu hỏi |
| `/api/exams/packages/*` | Exam Service | `8001` | Quản lý Gói đề |
| `/api/generate-questions` | AI Service | `8002` | Sinh đề thi tự động với Gemini |
| `/api/suggest-exam-info` | AI Service | `8002` | Gợi ý cấu hình đề thi |
| `/api/analytics/summary` | Analytics Service | `8003` | Thống kê số liệu học tập |
| `/api/auth/*` | Auth Service | `8004` | Xác thực đăng ký / đăng nhập |

---

## 🛠️ API điều khiển & Giám sát của Gateway
* **`GET /api/microservices/status`**: Trả về thông tin trạng thái hoạt động (Health status, CPU, Memory, Latency, Số replica) của toàn bộ hệ thống.
* **`POST /api/microservices/scale`**: Nhận lệnh nâng/hạ cấp số lượng replica của một service (từ 1 đến 8 replica).
  - *Tham số truyền vào*: `{"serviceId": "exam", "newCount": 3}`
* **`GET /api/microservices/logs`**: Lấy danh sách nhật ký các cuộc gọi API đi qua Gateway.
* **`GET /health`**: Kiểm tra trạng thái hoạt động của API Gateway.

---

## 🚀 Khởi chạy độc lập
Đảm bảo bạn đã cài đặt các thư viện tại thư mục gốc backend. Chạy lệnh sau tại thư mục dự án:
```bash
python -m backend.gateway.main
```
Dịch vụ sẽ khởi động tại địa chỉ: `http://localhost:8000`
Tài liệu hướng dẫn API trực quan (Swagger UI): `http://localhost:8000/docs`
