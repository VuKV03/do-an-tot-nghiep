# 🔒 SmartTest Auth Service (Port 8004)

## 📌 Giới thiệu
**Auth Service** quản lý toàn bộ cơ chế bảo mật, đăng ký tài khoản, đăng nhập và ủy quyền truy cập cho người dùng. Dịch vụ này sử dụng cơ chế xác thực không trạng thái (stateless authentication) bằng mã thông báo **JWT (JSON Web Token)** kết hợp với mã hóa mật khẩu một chiều **Bcrypt** để đảm bảo an toàn tối đa cho thông tin người dùng.

---

## ⚙️ Các tính năng cốt lõi
1. **Đăng ký người dùng (`/register`)**: Tiếp nhận yêu cầu đăng ký, kiểm tra trùng lặp (username/email), băm mật khẩu bằng thuật toán Bcrypt và lưu trữ thông tin người dùng mới vào cơ sở dữ liệu MySQL.
2. **Đăng nhập hệ thống (`/login`)**: Kiểm tra thông tin đăng nhập, xác minh mật khẩu băm, và cấp bộ đôi Token:
   - `access_token` (Thời hạn ngắn: 30 phút): Dùng để xác thực các yêu cầu API thông thường.
   - `refresh_token` (Thời hạn dài: 7 ngày): Dùng để cấp lại access_token mới khi hết hạn mà không bắt người dùng đăng nhập lại.
3. **Phân quyền vai trò (Role-based Access)**: Gắn thông tin vai trò người dùng (`admin`, `teacher`, `student`) trực tiếp vào payload của token JWT.
4. **Quản lý danh sách thành viên (`/users`)**: API hỗ trợ quản trị viên truy vấn danh sách toàn bộ tài khoản đăng ký trên hệ thống.

---

## 💾 Cấu trúc thực thể Người dùng (Model)
* **`User` (Bảng `users`)**:
  - `id`: Khóa chính định dạng chuỗi ngẫu nhiên (ví dụ: `u-1718800000000`).
  - `username`: Tên đăng nhập (chuyển về viết thường, unique).
  - `email`: Địa chỉ thư điện tử (unique).
  - `fullName`: Họ và tên hiển thị.
  - `password_hash`: Chuỗi mật khẩu băm bảo mật bằng Bcrypt.
  - `role`: Vai trò người dùng (`admin`, `teacher`, `student`). Mặc định là `teacher`.
  - `status`: Trạng thái hoạt động (`active`, `inactive`, `suspended`).
  - `createdAt`: Thời điểm đăng ký.

---

## 🛣️ Các điểm cuối API chính (Port 8004)
* **`POST /register`**: Đăng ký tài khoản mới.
  - *Tham số truyền vào*: `username`, `email`, `password`, `fullName`, `role` (tùy chọn).
* **`POST /login`**: Đăng nhập và nhận Token JWT.
  - *Tham số truyền vào*: `username`, `password`.
  - *Kết quả trả về*: Bộ đôi token (`access_token`, `refresh_token`), cấu trúc thông tin người dùng và thời gian hết hạn.
* **`GET /users`**: Danh sách người dùng hệ thống.
* **`GET /health`**: Trạng thái hoạt động của dịch vụ.

---

## 🚀 Khởi chạy độc lập
Chạy lệnh sau tại thư mục gốc của dự án:
```bash
python -m backend.auth_service.main
```
Dịch vụ sẽ khởi động tại: `http://localhost:8004`
Tài liệu hướng dẫn API trực quan (Swagger UI): `http://localhost:8004/docs`
