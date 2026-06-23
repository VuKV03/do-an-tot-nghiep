# Hệ thống Quản lý & Sinh đề thi bằng AI (V2)

</div>

## 📌 Giới thiệu dự án

**Hệ thống Quản lý & Sinh đề thi bằng AI (V2)** là hệ thống quản lý ngân hàng câu hỏi, cấu hình ma trận đề thi và sinh đề kiểm tra tự động tích hợp Trí tuệ Nhân tạo (**Google Gemini AI**). Hệ thống được phát triển theo kiến trúc **Microservices** hiện đại, kết hợp giao diện tối giản, trực quan và các tương tác mượt mà, giúp giáo viên và nhà quản lý giáo dục tối ưu hóa quy trình ra đề thi chuẩn hóa chỉ trong vài giây.

---

## 🚀 Các phân hệ & Tính năng nổi bật

1. **Xác thực & Bảo mật (Authentication)**: Hệ thống đăng nhập an toàn, mã hóa thông tin xác thực bằng JWT Token, tích hợp kiểm soát truy cập phân quyền chặt chẽ.
2. **Bảng tổng quan điều khiển (Dashboard Overview)**: Phân tích kết quả học tập, phổ điểm, phân phối độ khó câu hỏi và mức độ khó ma trận đề trực quan bằng biểu đồ Recharts sinh động.
3. **Quản lý danh mục cốt lõi (Category Management)**: Cấu hình và quản lý linh hoạt danh mục Môn học, Khối lớp và các Chuyên đề kiến thức, làm nền tảng phân loại dữ liệu học thuật.
4. **Quản lý ngân hàng câu hỏi (Question Bank)**: Tổ chức câu hỏi theo cấu trúc cây chuyên đề, khối lượng lớn. Hỗ trợ đầy đủ các mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), kèm theo phân hệ Thẩm định & Phê duyệt câu hỏi.
5. **Xây dựng & Cấu hình ma trận đề thi (Matrix Config)**: Thiết lập tỉ lệ phần trăm phân bố kiến thức và số lượng câu hỏi chi tiết theo chuẩn khảo thí trước khi thực hiện tự động sinh đề.
6. **Sinh đề thi thông minh với AI (AI Exam Generator)**: Tích hợp mô hình ngôn ngữ lớn **Google Gemini 3.5 Flash** (qua AI Service) để tự động tạo câu hỏi trắc nghiệm chất lượng cao, có giải thích đáp án và gợi ý cấu trúc đề thi.
7. **Quản lý & Xuất bản gói đề (Exam Package)**: Quản lý chu trình sống của các gói đề thi, nhóm các đề thi thành đợt khảo sát, phân quyền (Free/Premium), xuất bản PDF/Word và theo dõi lượt tải.
8. **Quản trị hệ thống & An ninh (System Admin)**: Phân hệ quản trị nâng cao với 3 chức năng chính:
   - **Quản lý người dùng**: Thêm/sửa/xóa cán bộ, khóa tài khoản tạm thời.
   - **Nhóm & Phân quyền**: Quản lý ma trận quyền truy cập (RBAC) chi tiết đến từng thao tác (Xem, Thêm, Sửa, Duyệt).
   - **An toàn bảo mật**: Cài đặt các tiêu chuẩn mật khẩu, timeout, 2FA và giám sát theo dõi **Nhật ký bảo mật (Security Audit Logs)** theo thời gian thực.
9. **Bảng giám sát Microservices (Topology Monitor)**: Giám sát toàn bộ luồng lưu lượng truy cập qua Gateway, hiển thị nhật ký API thời gian thực và trạng thái hoạt động của các service độc lập.

---

## 🏗️ Kiến trúc hệ thống

Dự án được xây dựng dựa trên kiến trúc Microservices thuần túy sử dụng Python 3.11+ kết hợp FastAPI, kết nối trực tiếp với cơ sở dữ liệu MySQL/TiDB và trao đổi thông tin thông qua Gateway trung tâm.

- **API Gateway** (Port 8000): Trung tâm định tuyến, xử lý CORS và lưu vết cuộc gọi qua Middleware logging.
- **Exam Service** (Port 8001): CRUD Đề thi, cấu trúc ngân hàng câu hỏi thông qua SQLAlchemy.
- **AI Service** (Port 8002): Sinh đề thi thông minh thông qua Google Gemini Client SDK (`google-genai`).
- **Analytics Service** (Port 8003): Xử lý luồng tính toán thống kê số liệu và biểu đồ hệ thống.
- **Auth Service** (Port 8004): Quản lý người dùng, mã hóa mật khẩu, cấp phát JWT token, và quản lý các nhóm quyền truy cập.

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

- **Frontend**: React 19 (TypeScript), Vite 6, TailwindCSS v4, Ant Design v6, Lucide Icons, Recharts, Framer Motion.
- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2 (Asyncio), aiomysql, PyJWT, google-genai, Loguru.
- **Database**: TiDB Cloud / MySQL Server 8+.

---

## ⚙️ Cấu hình môi trường (`.env`)

Tạo tệp tin `.env` tại thư mục gốc của dự án dựa trên mẫu `.env.example`:

```env
# Cổng chạy API Gateway Python
GATEWAY_PORT=8000

# Google Gemini API Key (Lấy từ Google AI Studio)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# URL truy cập ứng dụng Frontend
APP_URL="http://localhost:5173"

# Cấu hình kết nối MySQL/TiDB Database
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD="your_mysql_password"
DB_NAME="quan_ly_sinh_de_ai_v2"
# DB_USE_SSL="true" # Bật true nếu dùng TiDB Serverless
```

---

## 🚀 Hướng dẫn cài đặt và vận hành

### Bước 1: Chuẩn bị môi trường Python (Backend)

1. Tạo môi trường ảo Python 3.11+ tại thư mục gốc:
   ```bash
   python -m venv venv

   # Kích hoạt trên Windows:
   .\venv\Scripts\activate
   ```
2. Cài đặt các thư viện phụ thuộc cho Backend:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Bước 2: Chuẩn bị môi trường Node.js (Frontend)

1. Cài đặt các gói thư viện React/Vite:
   ```bash
   npm install
   ```

### Bước 3: Khởi chạy toàn bộ hệ thống

Dự án đã được cấu hình tự động khởi chạy đồng thời cả **Vite Frontend** và **Python Microservices** thông qua một lệnh duy nhất:

```bash
npm run dev
```

*(Lệnh này sẽ gọi đồng thời `vite` và `python start_services.py`)*

Sau khi khởi chạy, hệ thống backend sẽ tự động kết nối và tạo cấu trúc bảng trong cơ sở dữ liệu nếu chưa có.

- **Giao diện người dùng**: Mở trình duyệt truy cập `http://localhost:5173`
- **Tài liệu API (Swagger UI)**:
  - **API Gateway**: `http://localhost:8000/docs`
  - **Auth Service**: `http://localhost:8004/docs`
  - **Exam Service**: `http://localhost:8001/docs`
  - **AI Service**: `http://localhost:8002/docs`
  - **Analytics Service**: `http://localhost:8003/docs`
