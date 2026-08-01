# Tài liệu Đặc tả: Quản lý Gói Đề (Package Management)

## 1. Bảng Use Case chức năng

*Bảng 2.4. Bảng usecase chức năng quản lý gói đề*

| Tên Use case       | Tác nhân                    | Giao dịch                                                                                                                   | Độ phức tạp |
| :------------------ | :---------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :-------------- |
| Quản lý gói đề | Giáo viên, Quản trị viên |                                                                                                                              | Phức tạp      |
|                     |                               | Giáo viên có thể tạo và gửi duyệt gói đề. Hệ thống cập nhật trạng thái gói đề chờ duyệt                |                 |
|                     |                               | Quản trị viên có thể phê duyệt gói đề. Hệ thống cập nhật trạng thái gói đề đã duyệt                    |                 |
|                     |                               | Quản trị viên có thể từ chối gói đề. Hệ thống cập nhật trạng thái gói đề bị từ chối                    |                 |
|                     |                               | Quản trị viên có thể xuất bản gói đề. Hệ thống cập nhật trạng thái gói đề sang đang hoạt động         |                 |
|                     |                               | Quản trị viên có thể ngừng xuất bản gói đề. Hệ thống cập nhật trạng thái gói đề sang ngưng hoạt động |                 |
|                     |                               | Người dùng có thể tra cứu danh sách gói đề. Hệ thống hiển thị kết quả tra cứu gói đề                     |                 |
|                     |                               | Người dùng có thể xem chi tiết mã đề hoán vị. Hệ thống hiển thị chi tiết nội dung mã đề                  |                 |
|                     |                               | Người dùng có thể xuất file Word đề thi. Hệ thống tạo và tải xuống file Word đề thi                          |                 |
|                     |                               | Quản trị viên có thể xóa gói đề. Hệ thống xóa gói đề                                                          |                 |

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ Use Case thể hiện sự tương tác của hai tác nhân chính (Giáo viên và Quản trị viên) với hệ thống trong quy trình quản lý gói đề thi. Các chức năng bao gồm xem danh sách, xem chi tiết mã đề hoán vị, thẩm định (duyệt/từ chối), xuất bản, xuất file Word đề thi và xóa gói đề.

**Mục tiêu:** Cung cấp cái nhìn tổng thể về phân quyền và các thao tác nghiệp vụ, giúp định hình rõ vai trò của Giáo viên (tạo và đề xuất) và Quản trị viên (kiểm duyệt và điều phối trạng thái) trong hệ thống.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý gói đề

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên" as GV
actor "Quản trị viên" as Admin

rectangle "Chức năng: Quản lý gói đề" {
  usecase "Quản lý gói đề" as MainUC
  usecase "Xem / Tìm kiếm danh sách gói đề" as UC_Xem
  usecase "Xem chi tiết mã đề hoán vị" as UC_ChiTiet
  usecase "Thẩm định (Duyệt/Từ chối) gói đề" as UC_Duyet
  usecase "Xuất bản gói đề" as UC_XuatBan
  usecase "Xuất file Word đề thi" as UC_XuatFile
  usecase "Xóa gói đề" as UC_Xoa

  MainUC <.. UC_Xem : <<extend>>
  MainUC <.. UC_ChiTiet : <<extend>>
  MainUC <.. UC_Duyet : <<extend>>
  MainUC <.. UC_XuatBan : <<extend>>
  MainUC <.. UC_XuatFile : <<extend>>
  MainUC <.. UC_Xoa : <<extend>>
}

GV --> MainUC
Admin --> MainUC

note bottom of MainUC
  * Giáo viên: Tạo gói đề (chưa duyệt), xem danh sách và xuất file.
  * Quản trị viên: Thẩm định (duyệt/từ chối), xuất bản gói đề và xóa.
end note
@enduml
```

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Biểu đồ trình diễn chi tiết quy trình giao tiếp giữa Quản trị viên, giao diện người dùng, tầng Service và Cơ sở dữ liệu trong nghiệp vụ Thẩm định và Xuất bản gói đề. Quá trình bao gồm tải dữ liệu chi tiết, thực hiện thao tác phê duyệt hoặc từ chối, và cập nhật trạng thái gói đề sang hoạt động (xuất bản).

**Mục tiêu:** Làm rõ luồng xử lý kỹ thuật và vòng đời trạng thái của gói đề ở tầng hệ thống, đảm bảo quy trình kiểm duyệt diễn ra minh bạch, lưu trữ kết quả chính xác và phản hồi trực quan.

*Biểu đồ trình tự mô tả nghiệp vụ **Thẩm định và Xuất bản gói đề**.*

```plantuml
@startuml
title Biểu đồ trình tự: Thẩm định và Xuất bản gói đề

actor "Quản trị viên" as Admin
participant "Giao diện danh sách gói đề\n(Package List View)" as View
participant "Giao diện chi tiết gói đề\n(Exam Content Display)" as Detail
participant "PackageService\n(Xử lý nghiệp vụ)" as Service
database "Database\n(ExamPackages)" as DB

== Khởi tạo thẩm định ==
Admin -> View : Chọn "Xem chi tiết" gói đề chờ duyệt
View -> Service : Lấy chi tiết gói đề và các mã đề hoán vị
Service -> DB : Truy vấn gói đề và danh sách mã đề
DB --> Service : Trả về dữ liệu
Service --> View : Trả về dữ liệu chi tiết
View -> Detail : Hiển thị form chi tiết và nội dung các mã đề

== Thẩm định gói đề ==
alt Thẩm định Đạt
    Admin -> Detail : Chọn "Phê duyệt gói đề"
    Detail -> Service : Gửi yêu cầu cập nhật trạng thái (Approved)
    Service -> DB : Lưu trạng thái gói đề = 'Approved'
    DB --> Service : Phản hồi thành công
    Service --> Detail : Trả về kết quả thành công
    Detail --> Admin : Hiển thị thông báo "Phê duyệt thành công"
else Thẩm định Không Đạt
    Admin -> Detail : Chọn "Từ chối gói đề"
    Detail -> Service : Gửi yêu cầu cập nhật trạng thái (Rejected) kèm lý do
    Service -> DB : Lưu trạng thái gói đề = 'Rejected'
    DB --> Service : Phản hồi thành công
    Service --> Detail : Trả về kết quả thành công
    Detail --> Admin : Hiển thị thông báo "Đã từ chối gói đề"
end

== Xuất bản gói đề (Nếu đã duyệt) ==
Admin -> View : Chọn nút "Xuất bản" trên gói đề đã duyệt
View -> Service : Gửi yêu cầu xuất bản
Service -> DB : Cập nhật trạng thái = 'Active'
DB --> Service : Phản hồi thành công
Service --> View : Trả về kết quả thành công
View --> Admin : Hiển thị thông báo "Xuất bản gói đề thành công"
@enduml
```

## 4. Biểu đồ Hoạt động (Activity Diagram)

```plantuml
@startuml
title Biểu đồ hoạt động: Thẩm định và Xuất bản gói đề

|Quản trị viên|
start
:Truy cập chức năng "Quản lý gói đề";
:Chọn một gói đề ở trạng thái "Chờ duyệt";

|Hệ thống|
:Truy vấn chi tiết gói đề và các mã đề hoán vị;
:Hiển thị giao diện chi tiết nội dung gói đề;

|Quản trị viên|
:Xem và kiểm tra nội dung các mã đề;

if (Nội dung đạt yêu cầu?) then (Đạt)
  :Nhấn "Phê duyệt";
  |Hệ thống|
  :Lưu trạng thái gói đề là "Đã duyệt";
  :Hiển thị thông báo thành công;
  
  |Quản trị viên|
  if (Tiến hành tổ chức thi?) then (Có)
    :Nhấn nút "Xuất bản";
    |Hệ thống|
    :Lưu trạng thái gói đề là "Đang hoạt động (Active)";
    :Cập nhật danh sách đề trên cổng thi trực tuyến;
    :Hiển thị thông báo "Xuất bản thành công";
  else (Không)
    :Giữ ở trạng thái "Đã duyệt";
  endif

else (Không đạt)
  |Quản trị viên|
  :Nhấn "Từ chối" và nhập lý do;
  |Hệ thống|
  :Lưu trạng thái gói đề là "Bị từ chối";
  :Gửi thông báo cho Giáo viên tạo đề;
  :Hiển thị thông báo đã từ chối;
endif

|Quản trị viên|
:Quan sát thông báo kết quả;
:Kết thúc thao tác;
stop
@enduml
```

## 5. Biểu đồ Trạng thái (State Diagram)

```plantuml
@startuml
title Biểu đồ trạng thái tổng quát: Gói đề thi

state "Draft (Nháp)" as Draft
state "Pending (Chờ duyệt)" as Pending
state "Approved (Đã duyệt)" as Approved
state "Rejected (Bị từ chối)" as Rejected
state "Active (Đang hoạt động)" as Active
state "Inactive (Ngừng hoạt động)" as Inactive

[*] --> Draft : Giáo viên tạo mới
Draft --> Pending : Giáo viên gửi thẩm định
Pending --> Approved : Quản trị viên duyệt "Đạt"
Pending --> Rejected : Quản trị viên duyệt "Không đạt"
Rejected --> Draft : Giáo viên chỉnh sửa lại
Approved --> Active : Quản trị viên chọn "Xuất bản"
Active --> Inactive : Hết hạn thi / Hủy xuất bản
Inactive --> Active : Kích hoạt lại
Draft --> [*] : Xóa gói đề
Rejected --> [*] : Xóa gói đề
@enduml
```
