# Hệ thống Quản lý & Sinh đề thi bằng AI (V2)

</div>

## 📌 Giới thiệu dự án

**SmartTest v2** là hệ thống quản lý ngân hàng câu hỏi, cấu hình ma trận đề thi và sinh đề kiểm tra tự động tích hợp Trí tuệ Nhân tạo (**Google Gemini AI**). Hệ thống được phát triển theo kiến trúc **Microservices** hiện đại, kết hợp giao diện tối giản, trực quan và các tương tác mượt mà, giúp giáo viên và nhà quản lý giáo dục tối ưu hóa quy trình ra đề thi chuẩn hóa chỉ trong vài giây.

---

## 🚀 Tính năng nổi bật

1. **Bảng tổng quan điều khiển (Dashboard Overview)**: Phân tích kết quả học tập, phổ điểm, phân phối độ khó câu hỏi và mức độ khó ma trận đề trực quan bằng biểu đồ Recharts sinh động.
2. **Quản lý ngân hàng câu hỏi (Question Bank)**: Phân loại câu hỏi theo môn học, chuyên đề, khối lớp, mức độ tư duy (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
3. **Cấu hình ma trận đề thi (Matrix Config)**: Thiết lập tỉ lệ phần trăm phân bố kiến thức và số lượng câu hỏi chi tiết theo ma trận chuyên đề trước khi sinh đề.
4. **Sinh đề thi thông minh với AI (AI Exam Generator)**: Tích hợp mô hình ngôn ngữ lớn **Google Gemini 3.5 Flash** để tự động tạo câu hỏi trắc nghiệm chất lượng cao và gợi ý tiêu đề, mô tả đề thi dựa trên ma trận cấu hình sẵn.
5. **Quản lý & Xuất bản gói đề (Exam Package)**: Nhóm các đề thi thành đợt khảo sát, phân quyền truy cập (Free/Premium), theo dõi lượt tải và hỗ trợ xuất bản hàng loạt.
6. **Bảng quản trị hệ thống ảo (Microservices Topology Monitor)**: Giám sát toàn bộ luồng lưu lượng truy cập qua Gateway, hiển thị nhật ký API thời gian thực và cho phép nâng cấp/hạ cấp (scale) số lượng replica container trực tiếp trên giao diện.

---

## 🏗️ Kiến trúc hệ thống

Dự án hỗ trợ chạy ở hai chế độ linh hoạt để tối ưu hóa quá trình phát triển lẫn vận hành thực tế:

### Chế độ 1: Virtual Microservices (Express Mode - Phát triển nhanh)

Một máy chủ Node.js chạy Express tích hợp sẵn Vite middleware để phục vụ giao diện và đóng vai trò như một API Gateway ảo. Máy chủ này chứa các Router giả lập luồng gọi của 4 microservice:

- **API Gateway (Port 3000)**: Quản lý định tuyến và lưu vết cuộc gọi hệ thống.
- **Exam Service**: Xử lý dữ liệu CRUD Đề thi, Câu hỏi và Gói đề trực tiếp xuống database MySQL.
- **AI Service**: Gọi API SDK Google Gemini trực tiếp từ Node backend.
- **Analytics Service**: Tính toán trực tiếp phổ điểm và thống kê đề thi trực tiếp từ cơ sở dữ liệu.

### Chế độ 2: Real Python Microservices (FastAPI Production Mode)

Hệ thống microservices thực tế chạy bằng Python 3.11+ kết hợp FastAPI kết nối trực tiếp cơ sở dữ liệu MySQL và trao đổi thông tin qua Gateway trung tâm.

- **API Gateway** (Port 8000): Trung tâm định tuyến, xử lý CORS và lưu vết cuộc gọi qua Middleware logging.
- **Exam Service** (Port 8001): CRUD Đề thi, gói đề, cơ sở dữ liệu MySQL thông qua SQLAlchemy (Asyncio).
- **AI Service** (Port 8002): Sinh đề thi thông qua Google Gemini Client SDK (`google-genai`).
- **Analytics Service** (Port 8003): Xử lý luồng stream tính toán số liệu học tập.
- **Auth Service** (Port 8004): Quản lý đăng ký, đăng nhập và phân quyền bảo mật mã hóa JWT token.

```
               [ Client Browser ]
                       │
                       ▼ (Port 8000)
               ┌───────────────┐
               │  API Gateway  │
               └───────┬───────┘
                       │ Định tuyến cuộc gọi
        ┌──────────────┼──────────────┬──────────────┐
        ▼ (Port 8004)  ▼ (Port 8001)  ▼ (Port 8002)  ▼ (Port 8003)
  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
  │   Auth    │  │   Exam    │  │    AI     │  │ Analytics │
  │  Service  │  │  Service  │  │  Service  │  │  Service  │
  └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19 (TypeScript), Vite 6, TailwindCSS v4, Ant Design v6, Lucide Icons, Recharts, Motion.
- **Backend (Node.js)**: Express 4, MySQL2, TSX, ESBuild.
- **Backend (Python)**: FastAPI, Uvicorn, SQLAlchemy 2 (Asyncio), aiomysql, PyJWT, google-genai, Loguru.
- **Database**: MySQL Server 8+.

---

## ⚙️ Cấu hình môi trường (`.env`)

Tạo tệp tin `.env` tại thư mục gốc của dự án dựa trên mẫu `.env.example`:

```env
# Cổng chạy API Gateway Node.js
PORT=3000

# Google Gemini API Key (Lấy từ Google AI Studio)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# URL truy cập ứng dụng
APP_URL="http://localhost:3000"

# Cấu hình kết nối MySQL Database
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="your_mysql_password"
DB_NAME="quan_ly_sinh_de_ai_v2"
```

---

## 🚀 Hướng dẫn cài đặt và vận hành

### Bước 1: Khởi tạo MySQL Database

Đảm bảo máy tính của bạn đã cài đặt MySQL Server và đang chạy dịch vụ. Hệ thống Express sẽ tự động tạo cơ sở dữ liệu `quan_ly_sinh_de_ai_v2`, các bảng liên quan và nạp dữ liệu mẫu khi khởi chạy lần đầu tiên.

### Bước 2: Khởi động chế độ Virtual Microservices (Express & Vite)

1. Cài đặt các gói thư viện Node.js:
   ```bash
   npm install
   ```
2. Khởi chạy dự án ở chế độ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt và truy cập: `http://localhost:3000`

### Bước 3: Vận hành hệ thống Python Microservices thực tế

1. Truy cập vào thư mục backend, tạo môi trường ảo Python 3.11+:
   ```bash
   # Tạo môi trường ảo
   python -m venv venv

   # Kích hoạt trên Windows:
   .\venv\Scripts\activate
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Khởi chạy đồng thời cả 5 dịch vụ microservices bằng script tự động:
   ```bash
   python start_services.py
   ```
4. Kiểm tra tài liệu API tự động (Swagger UI) tại các địa chỉ:
   - **API Gateway**: `http://localhost:8000/docs`
   - **Auth Service**: `http://localhost:8004/docs`
   - **Exam Service**: `http://localhost:8001/docs`
   - **AI Service**: `http://localhost:8002/docs`
   - **Analytics Service**: `http://localhost:8003/docs`

---
