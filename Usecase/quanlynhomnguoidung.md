# Tài liệu Đặc tả: Quản lý Nhóm người dùng (User Group Management)

## 1. Bảng Use Case chức năng

*Bảng 2.11. Bảng usecase chức năng quản lý nhóm người dùng*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý nhóm người dùng** | **Quản trị hệ thống (QTHT)** |                                                                                                                         | Trung bình     |
|                         |                               | Quản trị hệ thống xem danh sách các nhóm người dùng hiện có trong hệ thống. Hệ thống hiển thị bảng danh sách.            |                 |
|                         |                               | Quản trị hệ thống thực hiện tìm kiếm nhóm người dùng theo từ khóa. Hệ thống hiển thị kết quả lọc.                        |                 |
|                         |                               | Quản trị hệ thống tạo mới nhóm người dùng (nhập tên nhóm, mô tả). Hệ thống kiểm tra trùng lặp và tạo nhóm mới.           |                 |
|                         |                               | Quản trị hệ thống cập nhật tên và mô tả của nhóm người dùng. Hệ thống ghi nhận và lưu thay đổi.                         |                 |
|                         |                               | Quản trị hệ thống gán các quyền (Permissions) cụ thể cho nhóm người dùng. Hệ thống cập nhật bảng liên kết quyền.        |                 |
|                         |                               | Quản trị hệ thống thực hiện xóa nhóm người dùng. Hệ thống gỡ liên kết nhóm khỏi các tài khoản người dùng hiện tại và xóa nhóm khỏi cơ sở dữ liệu. |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa sự tương tác của Quản trị hệ thống (QTHT) đối với phân hệ quản lý nhóm người dùng. QTHT là tác nhân duy nhất thực thi toàn bộ các quyền xem, tìm kiếm, thêm mới, cập nhật, xóa nhóm và gán danh sách quyền cho nhóm.

**Mục tiêu:** Cung cấp giao diện quản lý vai trò và phân quyền tập trung, đảm bảo tính bảo mật và phân quyền chặt chẽ trên toàn hệ thống.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý nhóm người dùng

left to right direction
skinparam packageStyle rectangle

actor "Quản trị hệ thống\n(QTHT)" as Admin

rectangle "Phân hệ: Quản lý nhóm người dùng" {
  usecase "Quản lý nhóm người dùng" as MainUC
  usecase "Xem danh sách nhóm" as UC_Xem
  usecase "Tìm kiếm nhóm" as UC_TimKiem
  usecase "Thêm mới nhóm" as UC_Them
  usecase "Cập nhật thông tin nhóm" as UC_Sua
  usecase "Xóa nhóm" as UC_Xoa
  usecase "Gán quyền nhóm" as UC_GanQuyen

  UC_Xem ..> MainUC : <<extend>>
  UC_TimKiem ..> MainUC : <<extend>>
  UC_Them ..> MainUC : <<extend>>
  UC_Sua ..> MainUC : <<extend>>
  UC_Xoa ..> MainUC : <<extend>>
  UC_GanQuyen ..> MainUC : <<extend>>
}

Admin --> MainUC
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Tìm kiếm và xem nhóm người dùng

**Mô tả:** Diễn giải quy trình khi Quản trị hệ thống thực hiện tìm kiếm và tra cứu danh sách nhóm người dùng theo từ khóa.

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và xem nhóm người dùng

actor "Quản trị hệ thống" as Admin
participant "Giao diện Nhóm\n(Group View)" as View
participant "RoleService\n(API Xử lý)" as Service
database "Database\n(Roles)" as DB

Admin -> View : Nhập từ khóa tìm kiếm tại thanh tìm kiếm
View -> Service : GET /api/roles?search={keyword}
activate Service

Service -> DB : Truy vấn danh sách nhóm người dùng khớp từ khóa
activate DB
DB --> Service : Trả về danh sách nhóm (JSON)
deactivate DB

Service --> View : Phản hồi dữ liệu danh sách nhóm (JSON)
deactivate Service

View --> Admin : Hiển thị danh sách nhóm đã lọc lên màn hình
@enduml
```

### Biểu đồ trình tự 2: Gán quyền cho nhóm người dùng

**Mô tả:** Diễn giải chi tiết luồng xử lý khi Quản trị hệ thống gán hoặc thu hồi các quyền hạn của một nhóm người dùng cụ thể thông qua giao diện Popup Checkbox.

```plantuml
@startuml
title Biểu đồ trình tự: Gán quyền cho nhóm người dùng

actor "Quản trị hệ thống" as Admin
participant "Giao diện Nhóm\n(Group View)" as View
participant "Popup Gán quyền\n(Permission Modal)" as Modal
participant "RoleService\n(API Xử lý)" as Service
database "Database\n(Roles & Permissions)" as DB

Admin -> View : Chọn nhóm và nhấn "Gán quyền"
View -> Modal : Khởi chạy Popup gán quyền
activate Modal

Modal -> Service : GET /api/roles/{roleId}/permissions (Lấy các quyền hiện tại và danh sách quyền hệ thống)
activate Service

Service -> DB : Lấy danh sách toàn bộ các quyền và quyền đã gán của nhóm
activate DB
DB --> Service : Trả về dữ liệu quyền (JSON)
deactivate DB

Service --> Modal : Phản hồi danh sách quyền (JSON)
deactivate Service

Modal --> Admin : Hiển thị danh sách quyền dạng Checkbox (được tích sẵn các quyền hiện có)
Admin -> Modal : Chọn/Bỏ chọn các quyền và nhấn "Lưu"

Modal -> Service : POST /api/roles/{roleId}/permissions (Danh sách permission_id mới)
activate Service

Service -> DB : Cập nhật lại các liên kết Role-Permission trong CSDL
activate DB
DB --> Service : Cập nhật thành công
deactivate DB

Service --> Modal : Phản hồi thành công (200 OK)
deactivate Service

Modal --> View : Đóng Popup và yêu cầu làm mới
deactivate Modal

View --> Admin : Hiển thị thông báo "Gán quyền cho nhóm thành công"
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động 1: Tìm kiếm và xem nhóm người dùng

**Mô tả:** Tiến trình tìm kiếm và duyệt danh sách các nhóm người dùng của Quản trị hệ thống.

```plantuml
@startuml
title Biểu đồ hoạt động: Tìm kiếm và xem nhóm người dùng

|Quản trị hệ thống|
start
:Truy cập phân hệ "Quản lý nhóm người dùng";
:Nhập từ khóa tìm kiếm (tên nhóm);

|Hệ thống|
:Truy vấn danh sách nhóm người dùng từ Database;
:Hiển thị danh sách các nhóm thỏa mãn điều kiện lên màn hình;

|Quản trị hệ thống|
:Xem danh sách nhóm và các mô tả quyền cơ bản;
stop
@enduml
```
### Biểu đồ hoạt động 2: Thêm mới nhóm người dùng

**Mô tả:** Tiến trình tạo mới một nhóm người dùng, tích hợp vòng lặp xác thực thông tin đầu vào và chống trùng lặp tên nhóm.

```plantuml
@startuml
title Biểu đồ hoạt động: Thêm mới nhóm người dùng

|Quản trị hệ thống|
start
:Truy cập phân hệ "Quản lý nhóm người dùng";
:Nhấn nút "Thêm mới";

|Hệ thống|
:Hiển thị Form nhập thông tin nhóm (Tên nhóm, Mô tả);

|Quản trị hệ thống|
repeat
  :Nhập thông tin nhóm người dùng mới;
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra dữ liệu (Không để trống tên nhóm, không trùng tên nhóm đã có);
backward:Hiển thị thông báo lỗi (Vd: Trùng tên nhóm người dùng);
repeat while (Dữ liệu không hợp lệ?) is (Có) not (Không)

:Lưu thông tin nhóm người dùng mới vào Database;
:Hiển thị thông báo "Thêm mới nhóm người dùng thành công";

|Quản trị hệ thống|
:Quan sát danh sách nhóm người dùng mới được cập nhật;
stop
@enduml
```

### Biểu đồ hoạt động 3: Cập nhật nhóm người dùng

**Mô tả:** Tiến trình sửa thông tin nhóm người dùng hiện có và kiểm tra tính hợp lệ của tên nhóm mới được thay đổi.

```plantuml
@startuml
title Biểu đồ hoạt động: Cập nhật nhóm người dùng

|Quản trị hệ thống|
start
:Truy cập phân hệ "Quản lý nhóm người dùng";
:Chọn một nhóm cần chỉnh sửa và nhấn "Cập nhật";

|Hệ thống|
:Truy xuất thông tin nhóm cũ từ Database;
:Hiển thị Form chỉnh sửa điền sẵn dữ liệu;

|Quản trị hệ thống|
repeat
  :Chỉnh sửa Tên nhóm, Mô tả;
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra trùng lặp tên nhóm mới với các nhóm khác;
backward:Hiển thị thông báo lỗi trùng tên;
repeat while (Tên nhóm mới bị trùng lặp?) is (Có) not (Không)

:Cập nhật thông tin nhóm vào Database;
:Hiển thị thông báo "Cập nhật nhóm người dùng thành công";

|Quản trị hệ thống|
:Quan sát danh sách nhóm người dùng đã thay đổi;
stop
@enduml
```

### Biểu đồ hoạt động 4: Gán quyền cho nhóm người dùng

**Mô tả:** Tiến trình gán các quyền hệ thống cho nhóm thông qua tương tác giao diện Popup Checkbox.

```plantuml
@startuml
title Biểu đồ hoạt động: Gán quyền cho nhóm người dùng

|Quản trị hệ thống|
start
:Truy cập phân hệ "Quản lý nhóm người dùng";
:Chọn một nhóm cần gán quyền và nhấn "Gán quyền";

|Hệ thống|
:Truy xuất danh sách tất cả các quyền của hệ thống;
:Truy xuất danh sách các quyền hiện tại của nhóm đó;
:Hiển thị Popup Gán quyền với các quyền hiện tại được chọn sẵn;

|Quản trị hệ thống|
:Tích chọn thêm hoặc bỏ chọn các quyền trên lưới;
:Nhấn nút "Lưu";

|Hệ thống|
:Cập nhật bảng liên kết quyền (Role_Permissions) của nhóm trong Database;
:Hiển thị thông báo "Gán quyền cho nhóm thành công";

|Quản trị hệ thống|
stop
@enduml
```

### Biểu đồ hoạt động 5: Xóa nhóm người dùng

**Mô tả:** Tiến trình xóa nhóm người dùng. Hệ thống tiến hành gỡ liên kết nhóm khỏi các tài khoản người dùng hiện tại, xóa toàn bộ phân quyền liên kết của nhóm và xóa nhóm khỏi cơ sở dữ liệu.

```plantuml
@startuml
title Biểu đồ hoạt động: Xóa nhóm người dùng

|Quản trị hệ thống|
start
:Truy cập phân hệ "Quản lý nhóm người dùng";
:Chọn nhóm cần xóa và nhấn "Xóa";

|Hệ thống|
:Hiển thị Popup yêu cầu xác nhận xóa;

|Quản trị hệ thống|
if (Xác nhận đồng ý xóa?) then (Có)
  |Hệ thống|
  :Gỡ liên kết nhóm khỏi các tài khoản người dùng hiện tại;
  :Xóa tất cả liên kết quyền của nhóm (Role_Permissions);
  :Xóa nhóm khỏi bảng Roles trong Database;
  :Hiển thị thông báo "Xóa nhóm người dùng thành công";
else (Không)
  |Hệ thống|
  :Hủy bỏ yêu cầu xóa nhóm;
endif

|Quản trị hệ thống|
stop
@enduml
```
