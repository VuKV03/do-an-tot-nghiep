# Tài liệu Đặc tả: Quản lý Kết Quả Thi (Exam Result Management)

## 1. Bảng Use Case chức năng

*Bảng 2.6. Bảng usecase chức năng quản lý kết quả thi*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý kết quả thi** | **Giáo viên bộ môn (GVBM)**   |                                                                                                                         | Trung bình     |
|                         |                               | Giáo viên bộ môn xem danh sách kết quả thi của các môn học/lớp học được phân công. Hệ thống hiển thị bảng điểm. |                 |
|                         |                               | Giáo viên bộ môn thực hiện tìm kiếm, lọc kết quả theo tên hoặc số báo danh. Hệ thống lọc và hiển thị danh sách khớp. |                 |
|                         |                               | Giáo viên bộ môn xuất dữ liệu bảng điểm lớp phụ trách. Hệ thống tạo và tải xuống file Excel báo cáo. |                 |
|                         | **Trưởng phòng giáo vụ (TPGV)**|                                                                                                                         | Trung bình     |
|                         |                               | Trưởng phòng giáo vụ xem danh sách bảng điểm của tất cả kỳ thi/môn học trên hệ thống. Hệ thống hiển thị bảng điểm. |                 |
|                         |                               | Trưởng phòng giáo vụ thực hiện tìm kiếm, lọc kết quả trên toàn hệ thống. Hệ thống lọc và hiển thị danh sách khớp. |                 |
|                         |                               | Trưởng phòng giáo vụ xuất file Excel bảng điểm toàn cục của kỳ thi/môn học. Hệ thống tạo và tải xuống file Excel báo cáo. |                 |
|                         | **Quản trị viên (Admin)**     |                                                                                                                         | Trung bình     |
|                         |                               | Quản trị viên xem danh sách bảng điểm của mọi kỳ thi trên hệ thống. Hệ thống hiển thị bảng điểm. |                 |
|                         |                               | Quản trị viên thực hiện tìm kiếm, lọc kết quả. Hệ thống lọc và hiển thị danh sách khớp. |                 |
|                         |                               | Quản trị viên xuất báo cáo Excel kết quả thi phục vụ công tác quản trị và lưu trữ dữ liệu. |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa tương tác của Giáo viên bộ môn (GVBM), Trưởng phòng giáo vụ (TPGV) và Quản trị viên (Admin) đối với phân hệ quản lý kết quả thi. Người dùng có thể xem danh sách kết quả thi, thực hiện tìm kiếm/lọc kết quả và kết xuất dữ liệu ra file Excel.

**Mục tiêu:** Thể hiện rõ các chức năng cơ bản của phân hệ và sự khác biệt về phạm vi dữ liệu truy cập của từng tác nhân (GVBM bị giới hạn trong lớp/môn học phân công, TPGV và Admin có quyền xem và xuất Excel toàn cục).

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý kết quả thi

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Trưởng phòng giáo vụ" as TPGV
actor "Quản trị viên" as Admin

rectangle "Phân hệ: Quản lý kết quả thi" {
  usecase "Quản lý kết quả thi" as MainUC
  usecase "Xem danh sách kết quả" as UC_Xem
  usecase "Tìm kiếm / Lọc kết quả" as UC_TimKiem
  usecase "Xuất báo cáo Excel" as UC_Export

  UC_Xem ..> MainUC : <<extend>>
  UC_TimKiem ..> MainUC : <<extend>>
  UC_Export ..> MainUC : <<extend>>
}

GVBM --> MainUC
TPGV --> MainUC
Admin --> MainUC

note bottom of MainUC
  * Giáo viên bộ môn: Xem, tìm kiếm và xuất điểm lớp được phân công.
  * Trưởng phòng giáo vụ: Xem, tìm kiếm và xuất Excel toàn bộ các kỳ thi trên hệ thống.
  * Quản trị viên: Có toàn quyền xem, tìm kiếm và xuất Excel dữ liệu kết quả thi.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Tìm kiếm và Tra cứu kết quả thi

**Mô tả:** Biểu đồ mô tả quá trình người dùng lọc kết quả thi theo môn học hoặc gói đề. Hệ thống tiếp nhận bộ lọc, truy vấn trong cơ sở dữ liệu và trả về danh sách kết quả thi phù hợp để hiển thị lên màn hình.

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và Tra cứu kết quả thi

actor "QTHT, GVBM, TPGV" as User
participant "Giao diện Kết quả\n(Result View)" as View
participant "ResultService\n(API Xử lý)" as Service
database "Database\n(ExamResults)" as DB

User -> View : Chọn theo bộ lọc (Môn học / Gói đề)
View -> Service : GET /api/results?subjectId={subjectId}&packageId={packageId}
activate Service

Service -> DB : Lấy danh sách kết quả thi theo bộ lọc
activate DB
DB --> Service : Trả về dữ liệu kết quả khớp (JSON)
deactivate DB

Service --> View : Phản hồi dữ liệu kết quả (JSON)
deactivate Service

View --> User : Hiển thị danh sách kết quả đã lọc lên giao diện
@enduml
```

### Biểu đồ trình tự 2: Xuất báo cáo bảng điểm Excel

**Mô tả:** Biểu đồ mô tả luồng xử lý khi người dùng yêu cầu tải xuống bảng điểm định dạng Excel (.xlsx) sau khi đã thiết lập bộ lọc phù hợp.

```plantuml
@startuml
title Biểu đồ trình tự: Xuất báo cáo bảng điểm Excel

actor "QTHT, GVBM, TPGV" as User
participant "Giao diện Kết quả\n(Result View)" as View
participant "ResultService\n(API Xử lý)" as Service
participant "ExcelExportService\n(Tiện ích)" as Utility
database "Database\n(ExamResults)" as DB

User -> View : Thiết lập bộ lọc và nhấn "Xuất Excel"
View -> Service : GET /api/results/export?filters=...
activate Service

Service -> DB : Truy vấn danh sách kết quả thi thỏa mãn bộ lọc
activate DB
DB --> Service : Trả về danh sách kết quả thi (JSON)
deactivate DB

Service -> Utility : Chuyển đổi danh sách kết quả thi thành tệp Excel (.xlsx)
activate Utility
Utility --> Service : Trả về tệp tin dưới dạng Blob / Buffer
deactivate Utility

Service --> View : Phản hồi tệp Excel (Content-Disposition: attachment)
deactivate Service

View --> User : Trình duyệt tự động tải xuống file Excel
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động: Tìm kiếm kết quả và xuất Excel

**Mô tả:** Biểu đồ hoạt động mô tả các bước người dùng thực hiện tra cứu thông tin kết quả thi bằng bộ lọc/tìm kiếm, xem kết quả trực tiếp và tùy chọn tải về file Excel báo cáo.

```plantuml
@startuml
title Biểu đồ hoạt động: Tìm kiếm kết quả và xuất Excel

|Người dùng|
start
:Truy cập phân hệ "Quản lý kết quả thi";
:Nhập từ khóa tìm kiếm (Tên/SBD) hoặc lọc theo Lớp/Kỳ thi;

|Hệ thống|
:Truy vấn dữ liệu từ Database;
:Hiển thị danh sách kết quả thi thỏa mãn điều kiện;

|Người dùng|
if (Muốn xuất dữ liệu ra file Excel?) then (Có)
  :Nhấn nút "Xuất Excel";
  |Hệ thống|
  :Xử lý xuất dữ liệu ra file định dạng (.xlsx);
  :Tải xuống file Excel về máy người dùng;
else (Không)
  |Người dùng|
  :Xem thông tin trực tiếp trên giao diện;
endif

|Người dùng|
stop
@enduml
```
