# Tài liệu Đặc tả: Chức năng Đăng nhập (Authentication)

## 1. Bảng Use Case chức năng

*Bảng 2.10. Bảng usecase chức năng đăng nhập*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Đăng nhập**           | **Mọi người dùng (GVBM, TTBM, TPGV, Admin, Thí sinh)** |                                                                                                                         | Dễ             |
|                         |                               | Người dùng nhập thông tin Tên đăng nhập và Mật khẩu để xác thực tài khoản. Hệ thống kiểm tra thông tin đăng nhập.        |                 |
|                         |                               | Hệ thống kiểm tra trạng thái tài khoản. Nếu tài khoản bị khóa, hệ thống hiển thị thông báo lỗi.                          |                 |
|                         |                               | Hệ thống phân loại vai trò (Role) của người dùng để chuyển hướng đến giao diện tương ứng (Dashboard quản trị hoặc Cổng thi). |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ mô tả tương tác đăng nhập của mọi vai trò người dùng trong hệ thống (Giáo viên bộ môn, Tổ trưởng bộ môn, Trưởng phòng giáo vụ, Quản trị viên, Thí sinh). Người dùng thực hiện đăng nhập và hệ thống cung cấp tính năng mở rộng là Lấy lại mật khẩu khi quên.

**Mục tiêu:** Thể hiện cổng đăng nhập thống nhất, đảm bảo tính an toàn dữ liệu và cơ chế chuyển hướng người dùng theo phân quyền.

```plantuml
@startuml
title Biểu đồ Use Case: Đăng nhập hệ thống

left to right direction

actor "Người dùng\n(GVBM / TTBM / TPGV / Admin / Thí sinh)" as User

rectangle "Phân hệ: Xác thực" {
  usecase "Đăng nhập hệ thống" as UC_Login
  
}

User --> UC_Login
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Quy trình tương tác diễn giải các bước từ khi người dùng điền thông tin biểu mẫu đăng nhập, hệ thống tiến hành kiểm tra thông tin dưới Database, mã hóa xác thực, sinh mã Token JWT và phản hồi trạng thái đăng nhập thành công hay thất bại.

```plantuml
@startuml
title Biểu đồ trình tự: Đăng nhập hệ thống

actor "Người dùng" as User
participant "Giao diện Đăng nhập\n(Login View)" as View
participant "AuthService\n(API Xử lý)" as Service
database "Database\n(Users)" as DB

User -> View : Nhập Tên đăng nhập và Mật khẩu, nhấn "Đăng nhập"
View -> View : Kiểm tra định dạng dữ liệu (Client-side validation)

View -> Service : POST /api/auth/login (username, password)
activate Service

Service -> DB : Tìm kiếm thông tin người dùng theo username/email
activate DB
DB --> Service : Trả về thông tin tài khoản (Mật khẩu mã hóa, vai trò, trạng thái)
deactivate DB

alt Tài khoản không tồn tại hoặc Mật khẩu sai
  Service --> View : Phản hồi lỗi: "Tên đăng nhập hoặc mật khẩu không chính xác" (401 Unauthorized)
  View --> User : Cảnh báo lỗi trên giao diện đăng nhập
else Tài khoản đang bị khóa (status = Locked)
  Service --> View : Phản hồi lỗi: "Tài khoản đã bị khóa" (403 Forbidden)
  View --> User : Cảnh báo tài khoản đã bị vô hiệu hóa
else Thông tin hợp lệ
  Service -> Service : Tạo Token xác thực (JWT Token)
  Service --> View : Phản hồi Token + Thông tin người dùng (200 OK)
  deactivate Service
  
  View -> View : Lưu JWT Token vào bộ nhớ (LocalStorage/Cookie)
  View --> User : Đăng nhập thành công và chuyển hướng đến trang tương ứng với vai trò (Role)
end
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

**Mô tả:** Biểu đồ hoạt động mô tả tiến trình đăng nhập của người dùng qua các bộ lọc xác thực (điền đầy đủ thông tin, kiểm tra tính đúng đắn tài khoản, kiểm tra trạng thái tài khoản) và điều phối về giao diện làm việc phù hợp với vai trò của mình.

```plantuml
@startuml
title Biểu đồ hoạt động: Đăng nhập hệ thống

|Người dùng|
start
:Truy cập trang đăng nhập;
:Nhập Tên đăng nhập và Mật khẩu;
:Nhấn nút "Đăng nhập";

|Hệ thống|
:Kiểm tra thông tin đầu vào (không để trống);
if (Có trường thông tin nào trống?) then (Có)
  :Hiển thị lỗi: "Vui lòng nhập đầy đủ thông tin";
  stop
else (Không)
  :Truy vấn thông tin tài khoản từ Database;
  if (Tài khoản tồn tại và Mật khẩu chính xác?) then (Đúng)
    if (Tài khoản đang hoạt động?) then (Có)
      :Tạo phiên đăng nhập (JWT Token);
      :Kiểm tra vai trò (Role) của tài khoản;
      if (Vai trò là Thí sinh?) then (Đúng)
        :Chuyển hướng đến Cổng thi trực tuyến;
      else (Sai)
        :Chuyển hướng đến Giao diện quản trị;
      endif
      stop
    else (Không)
      :Hiển thị lỗi: "Tài khoản đang bị khóa";
      stop
    endif
  else (Sai)
    :Hiển thị lỗi: "Tên đăng nhập hoặc mật khẩu không đúng";
    stop
  endif
endif
@enduml
```
