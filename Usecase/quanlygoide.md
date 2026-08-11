# Tài liệu Đặc tả: Quản lý Gói đề dành cho Trưởng phòng giáo vụ (Exam Package Management)

## 1. Bảng Use Case chức năng

*Bảng 2.4. Bảng usecase chức năng quản lý gói đề của Trưởng phòng giáo vụ*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý gói đề**      | **Trưởng phòng giáo vụ (TPGV)** |                                                                                                                         | Phức tạp        |
|                         |                               | Trưởng phòng giáo vụ xem danh sách và tìm kiếm các gói đề thi trên hệ thống (gói đề được tạo tự động ngay khi sinh hoán vị từ đề gốc). Hệ thống hiển thị danh sách. |                 |
|                         |                               | Trưởng phòng giáo vụ xem chi tiết cấu trúc gói đề (danh sách các đề thi hoán vị thuộc gói). Hệ thống hiển thị chi tiết. |                 |
|                         |                               | Trưởng phòng giáo vụ thực hiện Phát thi gói đề (Publish) để mang đi thi trực tiếp mà không cần qua khâu thẩm định. Hệ thống đổi trạng thái gói đề sang "active". |                 |
|                         |                               | Trưởng phòng giáo vụ thực hiện Tắt phát thi gói đề (Unpublish). Hệ thống đổi trạng thái sang "inactive".                |                 |
|                         |                               | Trưởng phòng giáo vụ chọn xuất file Word đề thi/đáp án. Hệ thống kết xuất dữ liệu và tải xuống tệp tin Word (.docx).     |                 |

---

**Mô tả:** Biểu đồ mô tả sự tương tác của Trưởng phòng giáo vụ (TPGV) đối với phân hệ quản lý gói đề thi. Gói đề thi được hệ thống tự động khởi tạo ngay khi người dùng thực hiện sinh hoán vị đề thi ở màn hình quản lý đề gốc. TPGV có quyền xem danh sách gói đề này và mang đi phát thi ngay mà không cần qua khâu thẩm định.

**Mục tiêu:** Thể hiện rõ vai trò điều phối kỳ thi của Trưởng phòng giáo vụ trong việc đưa các gói đề thi tự động sinh từ đề gốc vào hoạt động chính thức (Publish) hoặc đóng gói thi sau khi hoàn tất (Unpublish).

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý gói đề (Trưởng phòng giáo vụ)

left to right direction
skinparam packageStyle rectangle

actor "Trưởng phòng giáo vụ" as TPGV

rectangle "Phân hệ: Quản lý gói đề (TPGV)" {
  usecase "Quản lý gói đề" as MainUC
  usecase "Xem danh sách và tìm kiếm" as UC_Xem
  usecase "Xem chi tiết gói đề" as UC_ChiTiet
  usecase "Phát thi gói đề (Publish)" as UC_Publish
  usecase "Tắt phát thi gói đề (Unpublish)" as UC_Unpublish
  usecase "Xuất file Word đề thi" as UC_ExportWord

  UC_Xem ..> MainUC : <<extend>>
  UC_ChiTiet ..> MainUC : <<extend>>
  UC_Publish ..> MainUC : <<extend>>
  UC_Unpublish ..> MainUC : <<extend>>
  UC_ExportWord ..> MainUC : <<extend>>
}

TPGV --> MainUC
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Biểu đồ trình tự mô tả quy trình tương tác của Trưởng phòng giáo vụ đối với các gói đề thi đã được tạo tự động từ bước sinh hoán vị ở màn hình quản lý đề gốc. TPGV thực hiện phát thi/tắt phát thi trực tiếp và kết xuất file Word đề thi mà không cần qua khâu phê duyệt.

```plantuml
@startuml
title Biểu đồ trình tự: Quy trình Quản lý gói đề (Trưởng phòng giáo vụ)

actor "Trưởng phòng giáo vụ" as TPGV
participant "Giao diện Gói đề\n(Package View)" as View
participant "PackageService\n(API Xử lý)" as Service
database "Database\n(Packages)" as DB

== 1. Tra cứu và Xem chi tiết gói đề ==
TPGV -> View : Tìm kiếm / Lọc danh sách gói đề
View -> Service : GET /api/packages?search={keyword}
activate Service
Service -> DB : Lấy danh sách gói đề thi
activate DB
DB --> Service : Danh sách gói đề (JSON)
deactivate DB
Service --> View : Phản hồi danh sách gói đề
deactivate Service
View --> TPGV : Hiển thị bảng danh sách gói đề

TPGV -> View : Chọn một gói đề để xem chi tiết
View --> TPGV : Hiển thị chi tiết cấu trúc gói đề (danh sách các đề hoán vị)

== 2. Phát thi / Tắt phát thi gói đề ==
TPGV -> View : Nhấn nút "Phát thi"
View -> Service : POST /api/packages/{id}/publish
activate Service
Service -> DB : Cập nhật trạng thái gói đề hiện tại = 'active'
activate DB
DB --> Service : Cập nhật thành công
deactivate DB
Service --> View : Phản hồi trạng thái thành công (200 OK)
deactivate Service
View --> TPGV : Cập nhật trạng thái "Hoạt động" và thông báo thành công

TPGV -> View : Nhấn nút "Tắt phát thi"
View -> Service : POST /api/packages/{id}/unpublish
activate Service
Service -> DB : Cập nhật trạng thái gói đề = 'inactive'
activate DB
DB --> Service : Cập nhật thành công
deactivate DB
Service --> View : Phản hồi thành công (200 OK)
deactivate Service
View --> TPGV : Cập nhật trạng thái "Ngưng hoạt động" và thông báo thành công

== 3. Xuất file Word đề thi ==
TPGV -> View : Nhấn nút "Xuất Word"
View -> Service : GET /api/packages/{id}/export-word
activate Service
Service -> DB : Truy xuất thông tin đề thi hoán vị
activate DB
DB --> Service : Trả về dữ liệu đề thi
deactivate DB
Service -> Service : Khởi tạo tiện ích WordExport và dựng file .docx
Service --> View : Phản hồi file Word đính kèm
deactivate Service
View --> TPGV : Tự động tải xuống file Word (.docx) đề thi
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

**Mô tả:** Biểu đồ hoạt động mô tả tiến trình lựa chọn của Trưởng phòng giáo vụ khi truy cập giao diện quản lý gói đề, phân nhánh qua các thao tác phát thi (Publish), dừng thi (Unpublish) và tải tệp tin đề thi về máy.

```plantuml
@startuml
title Biểu đồ hoạt động: Quy trình Quản lý gói đề (Trưởng phòng giáo vụ)

|Trưởng phòng giáo vụ|
start
:Truy cập phân hệ "Quản lý gói đề";
:Nhập từ khóa để tìm kiếm và xem danh sách gói đề;

|Hệ thống|
:Hiển thị danh sách gói đề thi tương ứng;

|Trưởng phòng giáo vụ|
:Chọn danh sách gói đề cụ thể để quản lý;

split
  :Nhấn nút "Phát thi";
  |Hệ thống|
  :Cập nhật trạng thái gói đề = "active";
  :Kích hoạt gói đề trên cổng thi của thí sinh;
  :Hiển thị thông báo "Phát thi gói đề thành công";
split again
  |Trưởng phòng giáo vụ|
  :Nhấn nút "Tắt phát thi";
  |Hệ thống|
  :Cập nhật trạng thái gói đề = "inactive";
  :Gỡ gói đề khỏi cổng thi của thí sinh;
  :Hiển thị thông báo "Tắt phát thi gói đề thành công";
split again
  |Trưởng phòng giáo vụ|
  :Nhấn nút "Xuất Word";
  |Hệ thống|
  :Truy vấn cấu trúc gói đề và đề thi hoán vị;
  :Kết xuất dữ liệu đề hoán vị thành file Word (.docx);
  :Tải xuống file Word đề thi về máy người dùng;
endsplit

|Trưởng phòng giáo vụ|
stop
@enduml
```

---

## 5. Biểu đồ Trạng thái (State Diagram)

**Mô tả:** Biểu đồ trạng thái mô tả vòng đời của một Gói đề thi dưới sự quản lý của Trưởng phòng giáo vụ. Gói đề thi được tự động tạo và đưa vào trạng thái ngưng phát thi (inactive) ngay khi sinh hoán vị từ đề gốc, sau đó TPGV có thể phát thi (active) trực tiếp mà không cần duyệt.

```plantuml
@startuml
title Biểu đồ trạng thái: Vòng đời của Gói đề thi

skinparam state {
  BackgroundColor LightBlue
  BorderColor Blue
}

[*] --> inactive : Khởi tạo/nhập gói đề thi

state active as "Đang phát thi\n(active)"
state inactive as "Ngưng phát thi\n(inactive)"

inactive --> active : TPGV phát thi (Publish)
active --> inactive : TPGV tắt phát thi (Unpublish)

inactive --> [*] : Xóa gói đề
@enduml
```
