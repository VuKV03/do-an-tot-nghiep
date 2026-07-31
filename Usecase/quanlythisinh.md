# Tài liệu Đặc tả: Quản lý Thí Sinh (Candidate Management)

## 1. Bảng Use Case chức năng

*Bảng 2.5. Bảng usecase chức năng quản lý thí sinh*

| Tên Use case | Tác nhân | Giao dịch | Độ phức tạp |
| :--- | :--- | :--- | :--- |
| Quản lý thí sinh | Quản trị viên | | Trung bình |
| | | Quản trị viên có thể thêm mới thí sinh. Hệ thống tạo số báo danh tự động và lưu thông tin thí sinh | |
| | | Quản trị viên có thể cập nhật thông tin hồ sơ thí sinh. Hệ thống lưu thay đổi thông tin | |
| | | Quản trị viên có thể xóa hồ sơ thí sinh. Hệ thống xóa thông tin thí sinh khỏi cơ sở dữ liệu | |
| | | Quản trị viên có thể tìm kiếm, tra cứu danh sách thí sinh. Hệ thống hiển thị kết quả tìm kiếm | |
| | | Quản trị viên có thể cấp quyền "Thi lại" cho thí sinh. Hệ thống xóa kết quả thi cũ và mở khóa môn thi | |

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ mô tả sự tương tác giữa Quản trị viên và hệ thống trong phân hệ quản lý thông tin thí sinh. Bao gồm các chức năng cốt lõi: xem danh sách, thêm mới (kèm tạo tự động số báo danh), cập nhật thông tin, xóa thí sinh và đặc biệt là tính năng cấp quyền thi lại.

**Mục tiêu:** Cung cấp cái nhìn tổng quan về quyền hạn của tác nhân Quản trị viên đối với hồ sơ thí sinh, đảm bảo mọi thao tác từ khi tạo mới đến khi xử lý sự cố thi cử đều được minh họa rõ ràng và đầy đủ.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý Thí sinh

left to right direction
skinparam packageStyle rectangle

actor "Quản trị viên" as Admin

rectangle "Chức năng: Quản lý thí sinh" {
  usecase "Quản lý thí sinh" as MainUC
  usecase "Xem / Tra cứu danh sách" as UC_Xem
  usecase "Thêm mới (Tạo SBD tự động)" as UC_Them
  usecase "Cập nhật thông tin" as UC_Sua
  usecase "Xóa thí sinh" as UC_Xoa
  usecase "Cấp quyền Thi lại (Reset kết quả)" as UC_Reset

  MainUC <.. UC_Xem : <<extend>>
  MainUC <.. UC_Them : <<extend>>
  MainUC <.. UC_Sua : <<extend>>
  MainUC <.. UC_Xoa : <<extend>>
  MainUC <.. UC_Reset : <<extend>>
}

Admin --> MainUC

note bottom of MainUC
  * Quản trị viên (Admin/Examiner): Thao tác toàn bộ quyền CRUD trên danh sách thí sinh.
  * Số Báo Danh (SBD) được hệ thống tự động sinh khi tạo mới học viên.
  * Tính năng cấp quyền "Thi lại" dùng khi có sự cố, cho phép thí sinh thi lại từ đầu.
end note
@enduml
```

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Biểu đồ trình diễn chuỗi tương tác hệ thống khi Quản trị viên cấp quyền "Thi lại" cho một thí sinh. Luồng hoạt động bắt đầu từ giao diện người dùng (tìm kiếm, xác nhận), gọi API tới Service để tương tác với cơ sở dữ liệu (xóa/vô hiệu hóa kết quả thi cũ, đặt lại trạng thái), và cuối cùng phản hồi kết quả cập nhật về giao diện.

**Mục tiêu:** Làm rõ quy trình kỹ thuật và các bước thao tác dữ liệu an toàn để xử lý trường hợp thí sinh cần thi lại, đảm bảo hệ thống duy trì tính nhất quán khi reset trạng thái bài thi.

*Biểu đồ trình tự mô tả nghiệp vụ **Cấp quyền "Thi lại" (Reset Result)** cho thí sinh.*

```plantuml
@startuml
title Biểu đồ trình tự: Cấp quyền "Thi lại" cho thí sinh

actor "Quản trị viên" as Admin
participant "Giao diện Quản lý TS\n(View)" as View
participant "CandidateService\n(API & Xử lý logic)" as Service
database "Database\n(ExamResults & Candidates)" as DB

Admin -> View : Tìm kiếm và chọn Thí sinh
View --> Admin : Hiển thị chi tiết thí sinh và các môn thi
Admin -> View : Chọn môn thi và nhấn nút "Thi lại"

View -> View : Hiển thị cảnh báo xác nhận xóa kết quả cũ
Admin -> View : Xác nhận đồng ý

View -> Service : Gửi yêu cầu reset kết quả\n(resetCandidateExamResult)
activate Service

Service -> DB : Truy vấn lịch sử bài làm (ExamResults) của thí sinh ở môn học
activate DB
DB --> Service : Trả về bản ghi kết quả
deactivate DB

alt Tồn tại kết quả cũ
    Service -> DB : Lệnh xóa / vô hiệu hóa kết quả bài làm cũ
    activate DB
    DB --> Service : Xóa thành công
    deactivate DB
    
    Service -> DB : Cập nhật trạng thái môn thi của thí sinh = "Chưa thi"
    activate DB
    DB --> Service : Cập nhật thành công
    deactivate DB
    
    Service --> View : Phản hồi mã 200 OK
else Không tìm thấy kết quả
    Service --> View : Phản hồi mã lỗi hoặc "Chưa thi"
end
deactivate Service

View --> Admin : Hiển thị thông báo "Cấp quyền thi lại thành công"
View -> View : Tải lại danh sách (fetch data)
@enduml
```

## 4. Biểu đồ Hoạt động (Activity Diagram)
*Biểu đồ hoạt động mô tả luồng **Thêm mới thí sinh và tạo SBD tự động**.*

```plantuml
@startuml
title Biểu đồ hoạt động: Thêm mới thí sinh (Tạo SBD tự động)

|Quản trị viên|
start
:Truy cập trang "Quản lý thí sinh";
:Nhấn nút "Thêm mới";

|Hệ thống|
:Hiển thị Form nhập liệu thí sinh;

|Quản trị viên|
:Nhập thông tin (Họ tên, Ngày sinh, Lớp...);
:Nhấn nút "Lưu";

|Hệ thống|
:Tiếp nhận dữ liệu;
:Xử lý chuỗi Họ tên và Ngày sinh;
:Tự động sinh Số báo danh (SBD) định dạng chuẩn;

:Kiểm tra tính hợp lệ và chống trùng lặp SBD;
if (Dữ liệu hợp lệ và không trùng?) then (Hợp lệ)
  :Lưu thông tin thí sinh (kèm SBD) vào Database;
  :Hiển thị thông báo "Thêm mới thành công";
else (Không hợp lệ / Trùng lặp)
  :Hiển thị thông báo lỗi (Vd: Thiếu thông tin, Trùng SBD);
  |Quản trị viên|
  :Điều chỉnh lại thông tin;
  :Nhấn "Lưu" lần nữa;
endif

|Quản trị viên|
:Quan sát kết quả trên danh sách;
stop
@enduml
```
