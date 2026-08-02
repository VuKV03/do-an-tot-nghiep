# Kế hoạch chi tiết Triển khai Hệ thống Quản lý thi lên VPS VNPT

Dưới đây là tài liệu hướng dẫn từng bước (Step-by-step) để cấu hình VPS và deploy dự án (gồm Frontend React/Vite, Backend Python, và Database) lên tên miền `quanlythi.site`.

---

## Giai đoạn 1: Chuẩn bị Domain & VPS

### 1. Trỏ tên miền (DNS)
1. Truy cập trang quản trị tên miền của nhà cung cấp (nơi bạn mua `quanlythi.site`).
2. Cấu hình các bản ghi (DNS Records) trỏ về địa chỉ IP public của VPS VNPT:
   - **Type A**: Host: `@`, Value: `[IP_VPS_VNPT]`
   - **Type A**: Host: `www`, Value: `[IP_VPS_VNPT]`
   - *(Tuỳ chọn)* **Type A**: Host: `api`, Value: `[IP_VPS_VNPT]` (nếu bạn muốn tách subdomain cho backend API).

### 2. Cập nhật và bảo mật cơ bản cho VPS
1. SSH vào VPS VNPT qua terminal (sử dụng PuTTY hoặc CMD/Powershell):
   ```bash
   ssh root@[IP_VPS_VNPT]
   ```
2. Cập nhật hệ điều hành (giả sử VPS dùng Ubuntu 22.04/24.04):
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. Cài đặt các công cụ cơ bản cần thiết:
   ```bash
   sudo apt install curl git nano unzip build-essential nginx certbot python3-certbot-nginx -y
   ```

---

## Giai đoạn 2: Cài đặt Môi trường chạy (Docker & Docker Compose)
*Khuyến nghị sử dụng Docker để deploy vì dự án có nhiều thành phần (microservices, database).*

1. Cài đặt Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```
2. Cài đặt Docker Compose (nếu Docker chưa tích hợp sẵn):
   ```bash
   sudo apt-get install docker-compose-plugin -y
   ```
3. Cho phép Docker khởi động cùng hệ thống:
   ```bash
   sudo systemctl enable docker
   sudo systemctl start docker
   ```

---

## Giai đoạn 3: Triển khai Cơ sở dữ liệu (Database)

1. Tạo thư mục chứa source code và database trên VPS:
   ```bash
   mkdir -p /opt/quanlythi
   cd /opt/quanlythi
   ```
2. Cấu hình chạy Database bằng Docker. Tạo file `docker-compose.yml` (hoặc chạy lệnh cài đặt MySQL/PostgreSQL/MongoDB tuỳ hệ thống).
3. Import dữ liệu khởi tạo (seed data/migrations) vào database mới. Đảm bảo cấu hình mật khẩu an toàn.

---

## Giai đoạn 4: Triển khai Backend (Python API)

1. Upload mã nguồn Backend lên VPS:
   - Có thể dùng lệnh `git clone` từ repo GitHub/Gitlab.
   - Hoặc copy file bằng SCP/FileZilla.
2. Thiết lập biến môi trường (`.env`):
   - Đổi `DB_HOST`, `DB_USER`, `DB_PASS` để kết nối vào Database vừa tạo.
   - Cập nhật các secret key, API URL, đường dẫn upload file.
   - Cấu hình port (ví dụ chạy trên port `8000`).
3. Build và chạy Backend:
   - Nếu dùng Docker: Cấu hình `Dockerfile` cho Python (uvicorn/gunicorn) và đưa vào file `docker-compose.yml`. Sau đó chạy:
     ```bash
     docker compose up -d backend
     ```
   - Nếu chạy trực tiếp (không khuyến nghị): Dùng `venv`, cài `requirements.txt` và chạy qua `gunicorn` cùng `supervisor`/`systemd`.

---

## Giai đoạn 5: Triển khai Frontend (React/Vite)

1. Build ứng dụng trên local (máy tính của bạn):
   - Mở terminal tại thư mục frontend của dự án.
   - Kiểm tra file `.env` (hoặc `.env.production`), đảm bảo `VITE_API_URL` trỏ đến `https://quanlythi.site/api` (hoặc subdomain).
   - Chạy lệnh build:
     ```bash
     npm run build
     ```
2. Đưa code frontend lên VPS:
   - Sau khi build, bạn sẽ có thư mục `dist` (hoặc `build`).
   - Copy toàn bộ nội dung thư mục này lên VPS vào đường dẫn phục vụ web của Nginx:
     ```bash
     sudo mkdir -p /var/www/quanlythi/html
     # (Upload file vào đây thông qua SCP hoặc SFTP)
     sudo chown -R www-data:www-data /var/www/quanlythi/html
     ```

---

## Giai đoạn 6: Cấu hình Nginx (Reverse Proxy)

1. Tạo file cấu hình Nginx cho domain `quanlythi.site`:
   ```bash
   sudo nano /etc/nginx/sites-available/quanlythi.site
   ```
2. Dán nội dung cấu hình cơ bản sau:
   ```nginx
   server {
       listen 80;
       server_name quanlythi.site www.quanlythi.site;

       # Phục vụ Frontend
       location / {
           root /var/www/quanlythi/html;
           index index.html index.htm;
           try_files $uri $uri/ /index.html; # Rất quan trọng cho React/Vite Router
       }

       # Reverse proxy cho Backend API (Giả sử backend chạy ở localhost:8000)
       location /api/ {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Kích hoạt cấu hình Nginx và khởi động lại dịch vụ:
   ```bash
   sudo ln -s /etc/nginx/sites-available/quanlythi.site /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## Giai đoạn 7: Cài đặt Chứng chỉ bảo mật (SSL/HTTPS)

1. Sử dụng Certbot để tự động đăng ký SSL miễn phí với Let's Encrypt:
   ```bash
   sudo certbot --nginx -d quanlythi.site -d www.quanlythi.site
   ```
2. Làm theo hướng dẫn trên màn hình, điền email và đồng ý điều khoản. Certbot sẽ tự động sửa file cấu hình Nginx của bạn để áp dụng chứng chỉ HTTPS.

---

## Giai đoạn 8: Kiểm thử & Nghiệm thu (Testing)

1. Mở trình duyệt và truy cập `https://quanlythi.site`. Đảm bảo trang web tải lên an toàn (có biểu tượng ổ khoá HTTPS).
2. Kiểm tra các chức năng:
   - Đăng nhập/Đăng ký.
   - Thao tác API (giao tiếp với backend).
   - Tải lên/Tải xuống file ảnh hoặc tài liệu.
3. Kiểm tra log hệ thống:
   - Log Nginx: `sudo tail -f /var/log/nginx/error.log`
   - Log Backend (nếu dùng docker): `docker logs [container_id] -f`

## Các lưu ý bảo mật (Security Checklist)
- Cấu hình Firewall (UFW): Chỉ mở port `22` (SSH), `80` (HTTP) và `443` (HTTPS).
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  ```
- Thường xuyên sao lưu Database theo lịch trình (cronjob) để đề phòng sự cố trên VPS.
