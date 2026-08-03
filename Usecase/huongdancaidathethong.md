# HƯỚNG DẪN TỐI ƯU CÀI ĐẶT & VẬN HÀNH HỆ THỐNG QUẢN LÝ SINH ĐỀ AI v2.0

> **Tài liệu hướng dẫn cài đặt siêu tốc dành cho máy tính mới**
> Hỗ trợ 2 phương pháp cài đặt nhanh (Auto 1-Click Script & Docker) cùng quy trình chi tiết từng bước.

---

## ⚡ PHƯƠNG PHÁP 1: CÀI ĐẶT VÀ KHỞI CHẠY TỰ ĐỘNG 1-CLICK (KHUYÊN DÙNG - NHA NHẤT)

Dự án đã tích hợp sẵn **Script tự động hóa hoàn toàn** (`setup.bat` cho Windows và `setup.sh` cho macOS/Linux). Bạn không cần phải copy `.env` hay gõ từng lệnh cài đặt thủ công.

### Bước 1: Clone Mã Nguồn Dự Án (Dùng Token Tự Động)

Mở **PowerShell / Terminal** và chạy lệnh clone tích hợp sẵn token xác thực GitHub Private:

```bash
git clone https://CHEINNGUYEN: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@github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
cd quan-ly-sinh-de-ai-v2
```

#### Bước 2: Chạy Script Tự Động 1-Click

- **Trên Windows:** Double-click vào file `setup.bat` hoặc chạy lệnh trong PowerShell:

  ```powershell
  .\setup.bat
  ```
- **Trên macOS / Linux:**

  ```bash
  chmod +x setup.sh && ./setup.sh
  ```

#### ✨ Tiến trình Script tự động thực hiện hoàn toàn:

1. ✅ **Kiểm tra công cụ:** Đảm bảo Git, Node.js (`v18+`) và Python (`3.10+`) đã được cài trên máy.
2. ✅ **Khởi tạo `.env`:** Tự động tạo file `.env` chứa sẵn thông số kết nối Database TiDB Cloud & Gemini AI Keys.
3. ✅ **Cài Frontend Dependencies:** Tự động chạy `npm install`.
4. ✅ **Khởi tạo Python Virtualenv:** Tự động tạo thư mục môi trường ảo `dev` và chạy `pip install -r requirements.txt`.
5. 🚀 **Khởi chạy hệ thống:** Hỏi người dùng và tự động chạy `npm run dev` để bật toàn bộ Frontend & 6 Backend Microservices cùng lúc!

---

## 🐳 PHƯƠNG PHÁP 2: KHỞI CHẠY BẰNG DOCKER COMPOSE (ZERO CONFIG - KHÔNG CẦN CÀI PYTHON/NODE)

Nếu máy tính của bạn đã cài **Docker Desktop**, đây là cách tối ưu và sạch sẽ nhất vì không cần cài đặt Node.js, Python hay tạo môi trường ảo trên máy thật.

### Bước 1: Clone Mã Nguồn

```bash
git clone https://CHEINNGUYEN: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@github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
cd quan-ly-sinh-de-ai-v2
```

### Bước 2: Chạy Full Stack Hệ Thống Bằng Docker

```bash
docker compose up -d --build
```

#### Hệ thống Container tự động dựng lên:

- `smarttest-mysql`: Database MySQL 8.0
- `smarttest-gateway`: API Gateway (Port 8000)
- `smarttest-exam`: Exam Service (Port 8001)
- `smarttest-ai`: AI Service (Port 8002)
- `smarttest-analytics`: Analytics Service (Port 8003)
- `smarttest-auth`: Auth Service (Port 8004)
- `smarttest-quanlythi`: QuanLyThi Service (Port 8005)

---

## 🛠️ PHƯƠNG PHÁP 3: HƯỚNG DẪN CÀI ĐẶT THỦ CÔNG TỪNG BƯỚC (THAM KHẢO & DEBUG)

Nếu bạn muốn tự cài đặt và kiểm soát từng phần của hệ thống:

### 1. Yêu cầu công cụ cơ bản

- **Git** (`2.40+`): [https://git-scm.com/](https://git-scm.com/)
- **Node.js** (`v18.x` / `v20.x LTS`): [https://nodejs.org/](https://nodejs.org/)
- **Python** (`3.10+` - *Nhớ tích chọn "Add Python to PATH"*): [https://www.python.org/](https://www.python.org/)

### 2. Clone Repository Private

```bash
git clone https://CHEINNGUYEN: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@github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
cd quan-ly-sinh-de-ai-v2
```

### 3. Tạo File Biến Môi Trường `.env`

Tạo file `.env` tại thư mục gốc với nội dung:

```env
PORT=3000
GEMINI_API_KEY_SINGLE="AQ.Ab8RN6J62XFnsUT2jgqQ0J2nZay41dDmWVoknKQ74TCbtHNPMg"
GEMINI_API_KEY_TRUEFALSE="AQ.Ab8RN6KoPAP0aworCdylsXIB4dtBFEOSwDMTdjlhQ6CO-W2yPA"
GEMINI_API_KEY_SHORT="AQ.Ab8RN6LQkIeGFUFQdnWm4AgMUoFfLn1M3ttOL8AHTWGQLZ54Qg"
GEMINI_API_KEY_SPARE_1=""
APP_URL="http://localhost:3000"
DB_HOST=gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com
DB_PORT=4000
DB_USER=338z5oDUxdCvTYx.root
DB_PASSWORD=zXdZ5bfA39P5Rr8r
DB_NAME=quan_ly_sinh_de_ai_v2
DB_SSL=true
```

### 4. Cài Đặt Dependencies

```bash
# Cài đặt Frontend Node modules
npm install

# Tạo venv Python và cài đặt Backend libraries
python -m venv dev
dev\Scripts\pip install -r requirements.txt   # Windows
# dev/bin/pip install -r requirements.txt    # macOS/Linux
```

### 5. Khởi Chạy

```bash
npm run dev
```

---

## 🌐 DANH SÁCH CÁC CỔNG DỊCH VỤ

Sau khi hệ thống khởi chạy thành công, truy cập các địa chỉ sau:

| Dịch vụ                        | Địa chỉ URL                                          | Mô tả                                    |
| :------------------------------- | :------------------------------------------------------ | :----------------------------------------- |
| **Admin Portal**           | [http://localhost:3000](http://localhost:3000)           | Giao diện Quản trị & Biên soạn đề   |
| **Student Portal**         | [http://localhost:5174](http://localhost:5174)           | Cổng làm bài thi dành cho Thí sinh    |
| **API Gateway Docs**       | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI của API Gateway                |
| **Exam Service Docs**      | [http://localhost:8001/docs](http://localhost:8001/docs) | Swagger UI Quản lý Ngân hàng câu hỏi |
| **AI Service Docs**        | [http://localhost:8002/docs](http://localhost:8002/docs) | Swagger UI Dịch vụ AI Gemini             |
| **Analytics Service Docs** | [http://localhost:8003/docs](http://localhost:8003/docs) | Swagger UI Thống kê & Phân tích        |
| **Auth Service Docs**      | [http://localhost:8004/docs](http://localhost:8004/docs) | Swagger UI Xác thực & Phân quyền       |
| **QuanLyThi Service Docs** | [http://localhost:8005/docs](http://localhost:8005/docs) | Swagger UI Quản lý ca thi & kết quả    |

---

## ❓ XỬ LÝ CÁC SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi `'python' is not recognized`:**
   - Chưa tích chọn "Add Python to PATH" khi cài Python. Hãy cài lại Python và tích chọn ô này.
2. **Lỗi Script Execution Policy trên PowerShell:**
   - Mở PowerShell quyền Admin và chạy: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. **Lỗi Trùng Cổng (Port Conflict):**
   - Chạy lệnh giải phóng port (ví dụ 8000): `netstat -ano | findstr :8000` rồi `taskkill /F /PID <PID>`

---

*Tài liệu hướng dẫn tối ưu được biên soạn hoàn chỉnh cho phiên bản Quản lý Sinh đề & Thi Trắc nghiệm AI v2.0.*
