# HƯỚNG DẪN TỐI ƯU CÀI ĐẶT & VẬN HÀNH HỆ THỐNG QUẢN LÝ SINH ĐỀ AI v2.0

> **Tài liệu hướng dẫn cài đặt siêu tốc dành cho máy tính mới**
> Hỗ trợ 2 phương pháp cài đặt nhanh (Auto 1-Click Script & Docker) cùng quy trình chi tiết từng bước.

---

## ⚡ PHƯƠNG PHÁP 1: CÀI ĐẶT VÀ KHỞI CHẠY TỰ ĐỘNG 1-CLICK (KHUYÊN DÙNG - NHANH NHẤT)

Phương pháp này sử dụng **Script tự động hóa thông minh 1-Click** (`setup.bat` trên Windows và `setup.sh` trên macOS/Linux). Bạn chỉ cần tải mã nguồn về và chạy script, mọi thao tác tạo file `.env`, cài đặt thư viện Node.js, khởi tạo môi trường виртуа Python `dev`, cài đặt thư viện Python đều được thực hiện tự động 100%.

---

### Bước 1: Yêu Cầu Chuẩn Bị Nền Tảng (Cài 1 lần duy nhất cho máy mới)

Đảm bảo máy tính của bạn đã cài đặt 3 công cụ cơ bản sau:

| STT | Công cụ | Phiên bản khuyến nghị | Link tải trang chủ |
| :-: | :--- | :--- | :--- |
| 1 | **Git** | `2.40+` | [https://git-scm.com/downloads](https://git-scm.com/downloads) |
| 2 | **Node.js** | `v18.x` hoặc `v20.x LTS` | [https://nodejs.org/](https://nodejs.org/) |
| 3 | **Python** | `3.10` / `3.11` / `3.12` | [https://www.python.org/downloads/](https://www.python.org/downloads/) |

> ⚠️ **LƯU Ý CỰC KỲ QUAN TRỌNG KHI CÀI PYTHON TRÊN WINDOWS:**  
> Ở màn hình cài đặt đầu tiên của Python, bắt buộc tích chọn vào checkbox **"Add python.exe to PATH"** trước khi bấm **Install Now**.

---

### Bước 2: Tải Mã Nguồn Dự Án (Clone 1 Lệnh Tự Động)

Mở **PowerShell / Terminal** tại thư mục bạn muốn lưu dự án (ví dụ `C:\Projects` hoặc `D:\Code`), gõ lệnh clone tích hợp sẵn token xác thực GitHub Private:

```bash
git clone https://CHEINNGUYEN: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@github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
cd quan-ly-sinh-de-ai-v2
```

---

### Bước 3: Chạy Script Tự Động 1-Click

- **Nếu bạn dùng WINDOWS:**  
  Mở thư mục `quan-ly-sinh-de-ai-v2` và **Double-click** vào file `setup.bat`  
  *(hoặc chạy lệnh trong PowerShell: `.\setup.bat`)*

- **Nếu bạn dùng macOS / Linux:**  
  Mở Terminal tại thư mục dự án và chạy:
  ```bash
  chmod +x setup.sh && ./setup.sh
  ```

---

### 🔮 Tiến Trình Script Tự Động Thực Hiện Từng Bước:

1. 🔍 **[Kiểm tra môi trường]:** Tự động xác minh xem máy tính đã cài đặt sẵn Git, Node.js và Python chưa.
2. 📄 **[Tạo cấu hình `.env`]:** Tự động tạo file `.env` chứa sẵn toàn bộ thông số kết nối Database TiDB Cloud (`gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com`) và API Keys Gemini AI.
3. 📦 **[Cài đặt Frontend]:** Tự động thực thi `npm install` để tải các thư viện React, Vite, Ant Design, TailwindCSS.
4. 🐍 **[Tạo Virtualenv Python]:** Tự động tạo môi trường ảo `dev/` riêng biệt và cài đặt gói thư viện trong `requirements.txt` (FastAPI, Uvicorn, SQLAlchemy, PyMySQL...).
5. 🚀 **[Hỏi & Khởi chạy ngay]:** Script sẽ hỏi: `"Bạn có muốn khởi chạy hệ thống ngay bây giờ? (Y/N)"`. Nhập `Y` và nhấn `Enter`.

---

### 📱 Các Địa Chỉ Dịch Vụ Mở Tự Động Sau Khi Chạy:

Sau khi script hoàn tất, toàn bộ hệ thống (Frontend & 6 Backend Services) sẽ cùng bật lên đồng thời:

- **Hệ thống Quản trị & Biên soạn (Admin/Giáo viên):** [http://localhost:3000](http://localhost:3000)
- **Cổng Thi Trực tuyến (Dành cho Thí sinh):** [http://localhost:5174](http://localhost:5174)
- **API Gateway Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)

*Lần sau muốn khởi chạy lại hệ thống, bạn chỉ cần mở Terminal tại thư mục dự án và gõ lệnh:*
```bash
npm run dev
```

---

## 🐳 PHƯƠNG PHÁP 2: CÀI ĐẶT & CHẠY BẰNG DOCKER COMPOSE (CHI TIẾT TỪNG BƯỚC)

Phương pháp Docker Compose giúp khởi chạy toàn bộ 6 Microservices Python, Database MySQL 8.0 chỉ trong **1 containerized environment** lập trình cách ly hoàn toàn, không gây rác hệ thống và không cần tự cài Python/Node trên máy thật.

---

### Bước 1: Kiểm Tra và Chuẩn Bị Docker

1. **Cài đặt Docker Desktop:**
   - Tải và cài đặt Docker Desktop từ trang chủ: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Trên Windows: Đảm bảo tính năng **WSL 2 (Windows Subsystem for Linux)** đã được bật.
2. **Kiểm tra Docker trong Terminal / PowerShell:**
   ```bash
   docker --version
   docker compose version
   ```

   *(Đảm bảo Docker Desktop đã được bật và đang chạy)*

---

### Bước 2: Clone Mã Nguồn Dự Án (Nếủ chưa clone)

Mở **PowerShell / Terminal** và chạy lệnh clone repository private:

```bash
git clone https://CHEINNGUYEN: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@github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
cd quan-ly-sinh-de-ai-v2
```

---

### Bước 3: Tạo File Môi Trường Cho Docker (`.env.production` hoặc `.env`)

Tạo file có tên `.env.production` (hoặc `.env`) ngay tại thư mục gốc của dự án và dán cấu hình chuẩn dành cho Docker:

```env
# ─── Config Cổng & Ứng dụng ───
PORT=3000
APP_URL=http://localhost:3000

# ─── Gemini AI API Keys ───
GEMINI_API_KEY_SINGLE="AQ.Ab8RN6J62XFnsUT2jgqQ0J2nZay41dDmWVoknKQ74TCbtHNPMg"
GEMINI_API_KEY_TRUEFALSE="AQ.Ab8RN6KoPAP0aworCdylsXIB4dtBFEOSwDMTdjlhQ6CO-W2yPA"
GEMINI_API_KEY_SHORT="AQ.Ab8RN6LQkIeGFUFQdnWm4AgMUoFfLn1M3ttOL8AHTWGQLZ54Qg"
GEMINI_API_KEY_SPARE_1=""

# ─── JWT Authentication Key ───
JWT_SECRET_KEY=smarttest-change-this-to-random-string-2026
JWT_EXPIRE_MINUTES=60
JWT_REFRESH_DAYS=7

# ─── MySQL Database (Docker Container) ───
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=StrongPassword@2026
DB_NAME=quan_ly_sinh_de_ai_v2

# ─── URL Gọi Nội Bộ Giữa Các Microservices Trong Docker ───
EXAM_SERVICE_URL=http://exam:8001
AI_SERVICE_URL=http://ai:8002
ANALYTICS_SERVICE_URL=http://analytics:8003
AUTH_SERVICE_URL=http://auth:8004
QUANLYTHI_SERVICE_URL=http://quanlythi:8005
GATEWAY_PORT=8000
```

---

### Bước 4: Khởi Chạy Toàn Bộ Hệ Thống Docker Stack

Tại thư mục gốc dự án, chạy lệnh build image và khởi chạy tất cả các containers ở chế độ chạy ngầm (`-d`):

```bash
docker compose --env-file .env.production up -d --build
```

*(Hoặc ngắn gọn nếu file tên `.env`: `docker compose up -d --build`)*

#### 📋 Danh sách 7 Containers tự động được tạo & kết nối:

1. `smarttest-mysql`: Database MySQL 8.0 (Port `3306`)
2. `smarttest-gateway`: API Gateway Cổng chính (Port `8000`)
3. `smarttest-exam`: Quản lý Ngân hàng câu hỏi (Port `8001`)
4. `smarttest-ai`: Sinh câu hỏi bằng AI Gemini (Port `8002`)
5. `smarttest-analytics`: Thống kê & Phân tích (Port `8003`)
6. `smarttest-auth`: Xác thực người dùng & JWT (Port `8004`)
7. `smarttest-quanlythi`: Quản lý Ca thi & Kết quả (Port `8005`)

---

### Bước 5: Kiểm Tra Trạng Thái & Xem Logs System

1. **Xem danh sách các Container đang chạy:**

   ```bash
   docker compose ps
   ```

   *(Trạng thái tất cả các container cần ở mức `running` hoặc `healthy`)*
2. **Xem log hoạt động theo thời gian thực (Real-time Logs):**

   ```bash
   docker compose logs -f
   ```
3. **Xem log của duy nhất 1 service (Ví dụ Gateway hoặc AI):**

   ```bash
   docker compose logs -f gateway
   docker compose logs -f ai
   ```

---

### Bước 6: Khởi Chạy Frontend Nối Với Backend Docker

Vì Docker đang cung cấp toàn bộ 6 Backend Services trên các cổng `8000` - `8005`, bạn khởi chạy Frontend bằng lệnh:

```bash
npm install
npm run dev
```

Truy cập giao diện Admin tại: **[http://localhost:3000](http://localhost:3000)** và Cổng Thí Sinh tại: **[http://localhost:5174](http://localhost:5174)**.

---

### 🛠️ LỆNH QUẢN LÝ DOCKER HỮU ÍCH (CHEATSHEET)

| Thao tác                                      | Lệnh thực hiện                  |
| :--------------------------------------------- | :--------------------------------- |
| **Khởi động lại toàn bộ**          | `docker compose restart`         |
| **Restart riêng 1 Service**             | `docker compose restart gateway` |
| **Tạm dừng hệ thống**                | `docker compose stop`            |
| **Khởi động lại sau khi dừng**      | `docker compose start`           |
| **Dừng & Xóa sạch Containers**        | `docker compose down`            |
| **Xóa sạch Containers + Dữ liệu DB** | `docker compose down -v`         |
| **Build lại khi sửa code Backend**     | `docker compose up -d --build`   |

---

### 🚨 XỬ LÝ LỖI THƯỜNG GẶP KHI CHẠY DOCKER

1. **Lỗi `Cannot connect to the Docker daemon`:**

   - **Nguyên nhân:** Docker Desktop chưa được bật.
   - **Cách xử lý:** Mở ứng dụng Docker Desktop trên máy và chờ icon báo "Engine Running".
2. **Lỗi `Ports are not available: bind: address already in use (3306 hoặc 8000)`:**

   - **Nguyên nhân:** Cổng 3306 (MySQL local) hoặc cổng 8000 đang bị dịch vụ khác trên máy sử dụng.
   - **Cách xử lý:** Tắt MySQL local hoặc tắt ứng dụng đang dùng cổng 8000:
     - On Windows: `netstat -ano | findstr :3306` rồi `taskkill /F /PID <PID>`
3. **Lỗi Database Connection Refused khi container vừa bật:**

   - **Nguyên nhân:** Microservices khởi động nhanh hơn khi MySQL chưa khởi tạo xong DB.
   - **Cách xử lý:** Docker Compose đã cài sẵn `healthcheck` tự động đợi MySQL sẵn sàng. Bạn chỉ cần chạy `docker compose restart` nếu cần.

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
