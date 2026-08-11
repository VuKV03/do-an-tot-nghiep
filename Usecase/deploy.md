# Kế hoạch chi tiết Triển khai Hệ thống Quản lý thi (Kiến trúc phân tán)

Dưới đây là tài liệu hướng dẫn từng bước (Step-by-step) để cấu hình Backend trên VPS VNPT và deploy Frontend lên Vercel để tối ưu hiệu suất và giảm tải cho VPS.

---

## Kiến trúc Triển khai (Deployment Architecture)

- **Frontend (Vercel)**:
  - Cổng Quản trị (Admin): `quanlythi.site`
  - Cổng Thi trực tuyến (Thí sinh): `thi.quanlythi.site`
- **Backend (VPS VNPT - IP: 14.225.165.25)**:
  - API Gateway: `api.quanlythi.site` (Nginx Reverse Proxy)
  - Microservices: 6 services chạy nội bộ trên VPS (ports 8000-8005)

---

# Giai đoạn 1: Chuẩn bị Domain & DNS

1. Cấu hình DNS cho Backend (VPS):
   - Trên trang quản lý tên miền, cấu hình bản ghi **Type A**:
     - Host: `api`
     - Value: `14.225.165.25`
2. Cấu hình DNS cho Frontend (Vercel):
   - Đăng nhập Vercel, cấu hình domain trên Vercel project. Vercel sẽ yêu cầu bạn thêm các bản ghi (thường là CNAME cho `www` và `thi`, A record cho `@` trỏ về IP của Vercel). Thực hiện cấu hình này tương ứng trên trang quản lý tên miền.

---

## Giai đoạn 2: Cài đặt và Cấu hình Backend trên VPS VNPT

### 1. Truy cập và thiết lập VPS cơ bản

1. SSH vào VPS:
   ```bash
   ssh root@14.225.165.25
   ```

   *(Lưu ý: Bạn nên thay đổi mật khẩu mặc định của VPS ngay sau khi kết nối thành công để đảm bảo bảo mật).*
2. Cập nhật hệ thống và cài đặt công cụ cần thiết:
   ```bash
   apt update && apt upgrade -y
   apt install nginx certbot python3-certbot-nginx python3-venv git htop -y
   ```
3. Tạo Swap (RAM ảo 2GB) để chống treo máy khi thiếu RAM (OOM):
   ```bash
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
   ```

### 2. Triển khai Source Code Backend

1. Clone dự án về VPS (đảm bảo không bị lỗi thư mục đã tồn tại):
   ```bash
   mkdir -p /www/wwwroot/quanlythi_project
   cd /www/wwwroot/quanlythi_project
   # Xóa thư mục cũ nếu có trước khi clone
   rm -rf quan-ly-sinh-de-ai-v2
   git clone https://github.com/CHEINNGUYEN/quan-ly-sinh-de-ai-v2.git
   cd quan-ly-sinh-de-ai-v2
   ```
2. Thiết lập môi trường Python ảo (venv) và cài thư viện:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Cấu hình CORS cho Backend (FastAPI):
   - Trong code backend, cấu hình `CORSMiddleware` cần cho phép nguồn (origins): `https://quanlythi.site`, `https://thi.quanlythi.site`, `http://localhost:5173`, `http://localhost:5174`.
4. Chạy các dịch vụ (Microservices):
   ```bash
   nohup python start_services.py > backend.log 2>&1 &
   ```

   - *Để dừng tất cả dịch vụ:* `pkill -f "uvicorn"`
   - *Để xem log trực tiếp:* `tail -f backend.log`

---

## Giai đoạn 3: Cấu hình API Gateway (Nginx) & SSL trên VPS

### 1. Cấu hình Nginx Reverse Proxy

1. Tạo file cấu hình Nginx cho API:
   ```bash
   nano /etc/nginx/sites-available/api.quanlythi.site
   ```
2. Thêm cấu hình sau (Routing cho các microservices):
   *(Điều chỉnh URL proxy_pass cho phù hợp với logic router của backend)*
   ```nginx
   server {
       listen 80;
       server_name api.quanlythi.site;

       # Ví dụ chuyển hướng tới Service chính (Port 8000)
       location / {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Cấu hình cụ thể thêm các location khác dựa vào port (8001-8005) nếu cần thiết
   }
   ```
3. Kích hoạt Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/api.quanlythi.site /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

### 2. Cài đặt SSL (HTTPS) cho API

Sử dụng Certbot để tự động đăng ký và cài đặt chứng chỉ SSL miễn phí:

```bash
certbot --nginx -d api.quanlythi.site
```

---

## Giai đoạn 4: Cấu hình và Deploy Frontend lên Vercel

### 1. Cập nhật Code Frontend (Local)

1. Cấu hình gọi API: Đảm bảo biến môi trường hoặc cấu hình baseUrl gọi API trỏ về API Gateway: `https://api.quanlythi.site`.
2. Logic cổng Quản trị/Thí sinh (Đã được thực hiện trong `App.tsx`):
   Sử dụng điều kiện `window.location.hostname.startsWith('thi.')` để tự động render giao diện cổng thi.

### 2. Đẩy Code lên GitHub

Commit và push code mới nhất chứa các thay đổi trên lên repository GitHub:

```bash
git add .
git commit -m "Update routing and configurations for Vercel & VPS decoupled deployment"
git push origin main
```

### 3. Deploy trên Vercel

1. Đăng nhập [Vercel](https://vercel.com) bằng tài khoản GitHub của bạn.
2. Tạo project mới (**Add New -> Project**) và import repository `quan-ly-sinh-de-ai-v2`.
3. Giữ cấu hình mặc định:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Ấn **Deploy**.
5. Gán Custom Domains (trong phần **Settings -> Domains** của Project):
   - Thêm `quanlythi.site` cho Admin.
   - Thêm `thi.quanlythi.site` cho Học viên.
6. Quay lại trình quản lý tên miền (nơi mua DNS) và cấu hình các bản ghi theo yêu cầu của Vercel cho đến khi trạng thái domain báo Valid.

---

## Giai đoạn 5: Kiểm tra và Troubleshooting

1. **Kiểm tra Frontend:**
   - Truy cập `https://quanlythi.site`: Cổng Quản trị viên (Admin).
   - Truy cập `https://thi.quanlythi.site`: Cổng Thí sinh (Exam portal).
2. **Kiểm tra luồng Data:**
   - Đăng nhập và thực hiện thao tác cơ bản. Mở tab Network (F12) để chắc chắn Frontend gọi đúng về `https://api.quanlythi.site/...`.
   - Nếu xuất hiện lỗi `CORS Blocked`, bạn cần SSH vào VPS và kiểm tra lại danh sách các origin được cho phép trong code FastAPI, sau đó restart lại backend.
3. **Xử lý sự cố máy chủ:**
   - Nếu có lỗi kết nối, xem log Nginx: `tail -f /var/log/nginx/error.log`
   - Nếu hệ thống có dấu hiệu quá tải RAM: `dmesg -T | grep -i oom`
   - Nếu mất kết nối SSH do đơ VPS, thực hiện Reset Hard qua portal của nhà cung cấp VNPT.
