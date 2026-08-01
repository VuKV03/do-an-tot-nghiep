# Tài liệu Đặc tả: Quản lý Kết Quả Thi (Exam Result Management)

## 1. Bảng Use Case chức năng

*Bảng 2.6. Bảng usecase chức năng quản lý kết quả thi*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| Quản lý kết quả thi | Giáo viên, Quản trị viên |                                                                                                                         | Trung bình     |
|                         |                               | Người dùng có thể tìm kiếm, tra cứu danh sách kết quả thi. Hệ thống hiển thị bảng điểm                |                 |
|                         |                               | Người dùng có thể xem chi tiết bài làm. Hệ thống hiển thị chi tiết lịch sử câu trả lời của thí sinh |                 |
|                         |                               | Người dùng có thể xuất dữ liệu bảng điểm. Hệ thống tạo và tải xuống file Excel báo cáo               |                 |

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa tương tác của Giáo viên và Quản trị viên đối với phân hệ quản lý kết quả thi. Từ chức năng gốc "Quản lý kết quả thi", người dùng có thể thực hiện các thao tác mở rộng (`<<extend>>`) như xem tra cứu bảng điểm, xem chi tiết bài làm của từng thí sinh, hoặc kết xuất báo cáo ra file Excel.

**Mục tiêu:** Định hình rõ các chức năng thống kê điểm số, đồng thời làm nổi bật phân định quyền truy cập dữ liệu giữa các vai trò (Giáo viên quản lý lớp của mình, Quản trị viên quản lý toàn bộ hệ thống).

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý kết quả thi

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên" as GV
actor "Quản trị viên" as Admin

rectangle "Chức năng: Quản lý kết quả thi" {
  usecase "Quản lý kết quả thi" as MainUC
  usecase "Xem / Tra cứu bảng điểm" as UC_Xem
  usecase "Xem chi tiết bài làm" as UC_ChiTiet
  usecase "Xuất báo cáo Excel" as UC_Export

  MainUC <.. UC_Xem : <<extend>>
  MainUC <.. UC_ChiTiet : <<extend>>
  MainUC <.. UC_Export : <<extend>>
}

GV --> MainUC
Admin --> MainUC

note bottom of MainUC
  * Giáo viên: Chỉ xem và xuất điểm của các lớp/môn mình phụ trách.
  * Quản trị viên: Có quyền xem và xuất toàn bộ dữ liệu bảng điểm trên hệ thống.
  * Xuất báo cáo Excel hỗ trợ cho việc lưu trữ hồ sơ và báo cáo lên cấp trên.
end note
@enduml
```

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

*Biểu đồ trình tự mô tả nghiệp vụ **Xuất báo cáo bảng điểm (Export Excel)**.*

**Mô tả:** Biểu đồ diễn giải chuỗi tương tác theo thời gian khi người dùng yêu cầu xuất bảng điểm. Lớp Giao diện gửi các tiêu chí lọc xuống Service. Service thực hiện truy vấn Database để lấy danh sách kết quả, sau đó gọi dịch vụ tiện ích (`ExcelExportService`) để chuyển đổi khối dữ liệu thành file `.xlsx` và phản hồi về cho trình duyệt tải xuống.

**Mục tiêu:** Làm rõ quy trình gọi hàm và luân chuyển dữ liệu giữa các thành phần phần mềm (UI, Service, Utility, Database) nhằm thực thi tính năng kết xuất báo cáo, đảm bảo ứng dụng xử lý trơn tru các luồng dữ liệu thống kê.

```plantuml
@startuml
title Biểu đồ trình tự: Xuất báo cáo bảng điểm Excel

actor "Quản trị viên / Giáo viên" as User
participant "Giao diện Bảng điểm\n(Result View)" as View
participant "ResultService\n(API Xử lý)" as Service
participant "ExcelExportService\n(Tiện ích)" as Utility
database "Database\n(ExamResults & Candidates)" as DB

User -> View : Thiết lập bộ lọc và nhấn "Xuất Excel"
View -> Service : GET /api/results/export kèm tham số lọc (filters)
activate Service

Service -> DB : Truy vấn danh sách kết quả thi thỏa mãn điều kiện
activate DB
DB --> Service : Trả về danh sách dữ liệu (JSON)
deactivate DB

Service -> Utility : Chuyển đổi dữ liệu JSON sang định dạng Excel
activate Utility
Utility --> Service : Trả về file định dạng Blob / Buffer (.xlsx)
deactivate Utility

Service --> View : Phản hồi file đính kèm (Attachment)
deactivate Service

View --> User : Trình duyệt tự động tải xuống file Excel
@enduml
```

## 4. Biểu đồ Hoạt động (Activity Diagram)

*Biểu đồ hoạt động mô tả luồng **Xem chi tiết bài làm của thí sinh**.*

```plantuml
@startuml
title Biểu đồ hoạt động: Xem chi tiết bài làm

|Giáo viên / Quản trị viên|
start
:Truy cập "Quản lý kết quả thi";
:Nhập thông tin tìm kiếm thí sinh;

|Hệ thống|
:Truy vấn và hiển thị danh sách kết quả;

|Giáo viên / Quản trị viên|
:Nhấn chọn nút "Xem chi tiết" trên một bài thi;

|Hệ thống|
:Gửi yêu cầu lấy chi tiết bài làm;
:Truy xuất lịch sử làm bài (Câu hỏi, đáp án đã chọn, đáp án đúng);

if (Tồn tại chi tiết bài làm?) then (Có)
  :Render giao diện Modal chi tiết;
  :Đối chiếu đáp án:
  - Đúng: Bôi màu Xanh
  - Sai: Bôi màu Đỏ;
  :Hiển thị chi tiết thống kê lên màn hình;
else (Lỗi / Không tìm thấy)
  :Hiển thị thông báo "Dữ liệu không tồn tại";
endif

|Giáo viên / Quản trị viên|
:Xem và phân tích kết quả bài làm;
:Nhấn nút Đóng (Close) form chi tiết;

|Hệ thống|
:Ẩn giao diện Modal;

|Giáo viên / Quản trị viên|
:Quay lại xem danh sách bảng điểm;
stop
@enduml
```
