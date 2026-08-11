# Tài liệu Đặc tả: Quản lý Thí Sinh (Candidate Management)

## 1. Bảng Use Case chức năng

*Bảng 2.5. Bảng usecase chức năng quản lý thí sinh*

| Tên Use case       | Tác nhân                    | Giao dịch                                                                                                               | Độ phức tạp |
| :------------------ | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý thí sinh**| **Trưởng phòng giáo vụ (TPGV)**|                                                                                                                          | Trung bình     |
|                     |                              | Trưởng phòng giáo vụ có thể thêm mới thí sinh. Hệ thống tạo số báo danh tự động và lưu thông tin thí sinh.               |                 |
|                     |                              | Trưởng phòng giáo vụ có thể cập nhật thông tin hồ sơ thí sinh. Hệ thống lưu thay đổi thông tin.                          |                 |
|                     |                              | Trưởng phòng giáo vụ có thể xóa hồ sơ thí sinh. Hệ thống xóa thông tin thí sinh khỏi cơ sở dữ liệu.                       |                 |
|                     |                              | Trưởng phòng giáo vụ có thể tìm kiếm, tra cứu danh sách thí sinh. Hệ thống hiển thị kết quả tìm kiếm.                     |                 |
|                     |                              | Trưởng phòng giáo vụ có thể cấp quyền "Thi lại" cho thí sinh. Hệ thống xóa kết quả thi cũ và mở khóa môn thi.            |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ mô tả sự tương tác giữa Trưởng phòng giáo vụ (TPGV) và hệ thống trong phân hệ quản lý thông tin thí sinh. Bao gồm các chức năng cốt lõi: xem danh sách, thêm mới (kèm tạo tự động số báo danh), cập nhật thông tin, xóa thí sinh và đặc biệt là tính năng cấp quyền thi lại.

**Mục tiêu:** Cung cấp cái nhìn tổng quan về quyền hạn của tác nhân Trưởng phòng giáo vụ đối với hồ sơ thí sinh, đảm bảo mọi thao tác từ khi tạo mới đến khi xử lý sự cố thi cử đều được minh họa rõ ràng và đầy đủ.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý Thí sinh

left to right direction
skinparam packageStyle rectangle

actor "Trưởng phòng giáo vụ" as TPGV

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

TPGV --> MainUC

note bottom of MainUC
  * Trưởng phòng giáo vụ (TPGV): Thao tác toàn bộ quyền CRUD trên danh sách thí sinh.
  * Số Báo Danh (SBD) được hệ thống tự động sinh khi tạo mới học viên.
  * Tính năng cấp quyền "Thi lại" dùng khi có sự cố, cho phép thí sinh thi lại từ đầu.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Biểu đồ trình tự mô tả quy trình tương tác của Trưởng phòng giáo vụ, từ việc tìm kiếm xem danh sách, thêm mới, cập nhật/xóa cho đến xử lý sự cố thi cử bằng tính năng cấp quyền "Thi lại" (xóa kết quả thi cũ và cập nhật lại trạng thái).

```plantuml
@startuml
title Biểu đồ trình tự: Quy trình Quản lý thí sinh (Trưởng phòng giáo vụ)

actor "Trưởng phòng giáo vụ" as TPGV
participant "Giao diện Quản lý TS\n(View)" as View
participant "CandidateService\n(API & Xử lý logic)" as Service
database "Database\n(Candidates & Results)" as DB

== 1. Tra cứu và Xem danh sách ==
TPGV -> View : Tìm kiếm / Lọc danh sách thí sinh
View -> Service : GET /api/candidates?search={keyword}
activate Service
Service -> DB : Truy vấn danh sách thí sinh
activate DB
DB --> Service : Danh sách thí sinh (JSON)
deactivate DB
Service --> View : Phản hồi danh sách thí sinh
deactivate Service
View --> TPGV : Hiển thị bảng danh sách thí sinh

== 2. Thêm mới thí sinh (Tạo SBD tự động) ==
TPGV -> View : Nhập thông tin thí sinh và nhấn "Lưu"
View -> Service : POST /api/candidates
activate Service
Service -> Service : Xử lý tên/ngày sinh và sinh Số báo danh (SBD) tự động
Service -> DB : Lưu thí sinh mới kèm SBD
activate DB
DB --> Service : Lưu thành công
deactivate DB
Service --> View : Phản hồi thành công (201 Created)
deactivate Service
View --> TPGV : Thông báo thêm mới thành công

== 3. Cập nhật / Xóa thông tin thí sinh ==
TPGV -> View : Chỉnh sửa hồ sơ hoặc nhấn "Xóa thí sinh"
View -> Service : PUT hoặc DELETE /api/candidates/{id}
activate Service
Service -> DB : Cập nhật / Xóa bản ghi thí sinh tương ứng
activate DB
DB --> Service : Thành công
deactivate DB
Service --> View : Phản hồi thành công (200 OK)
deactivate Service
View --> TPGV : Thông báo cập nhật/xóa thành công

== 4. Cấp quyền thi lại (Reset kết quả) ==
TPGV -> View : Chọn thí sinh, chọn môn học và nhấn "Thi lại"
View -> View : Hiển thị cảnh báo xác nhận
TPGV -> View : Xác nhận đồng ý
View -> Service : POST /api/candidates/{id}/reset-result?subjectId={subjectId}
activate Service
Service -> DB : Xóa kết quả bài làm cũ trong bảng ExamResults
activate DB
DB --> Service : Xóa thành công
deactivate DB
Service -> DB : Đặt lại trạng thái môn thi của thí sinh = "Chưa thi"
activate DB
DB --> Service : Cập nhật thành công
deactivate DB
Service --> View : Phản hồi thành công (200 OK)
deactivate Service
View --> TPGV : Thông báo cấp quyền thi lại thành công và tải lại bảng
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

**Mô tả:** Biểu đồ hoạt động mô tả tiến trình lựa chọn của Trưởng phòng giáo vụ đối với việc quản trị hồ sơ học viên, bao gồm các quy trình nghiệp vụ: Thêm mới (sinh SBD tự động), Chỉnh sửa thông tin, Xóa tài khoản, và Cấp quyền thi lại.

```plantuml
@startuml
title Biểu đồ hoạt động: Quy trình Quản lý thí sinh (Trưởng phòng giáo vụ)

|Trưởng phòng giáo vụ|
start
:Truy cập phân hệ "Quản lý thí sinh";
:Tìm kiếm và xem danh sách thí sinh;

|Hệ thống|
:Hiển thị danh sách thí sinh;

|Trưởng phòng giáo vụ|
:Chọn hành động muốn thực hiện;

split
  :Nhấn nút "Thêm mới";
  |Hệ thống|
  :Hiển thị Form nhập liệu;
  |Trưởng phòng giáo vụ|
  :Nhập thông tin cá nhân thí sinh và nhấn "Lưu";
  |Hệ thống|
  :Tự động sinh Số báo danh (SBD);
  :Kiểm tra trùng lặp SBD;
  if (Dữ liệu hợp lệ?) then (Hợp lệ)
    :Lưu thông tin thí sinh vào Database;
    :Hiển thị thông báo "Thêm mới thành công";
  else (Lỗi)
    :Hiển thị thông báo lỗi;
  endif
split again
  |Trưởng phòng giáo vụ|
  :Chọn một thí sinh và nhấn "Chỉnh sửa";
  :Cập nhật thông tin mới và nhấn "Lưu";
  |Hệ thống|
  :Cập nhật thông tin thí sinh vào CSDL;
  :Hiển thị thông báo "Cập nhật thành công";
split again
  |Trưởng phòng giáo vụ|
  :Chọn thí sinh và nhấn "Xóa";
  |Hệ thống|
  :Xóa bản ghi thí sinh khỏi cơ sở dữ liệu;
  :Hiển thị thông báo "Xóa thí sinh thành công";
split again
  |Trưởng phòng giáo vụ|
  :Chọn thí sinh cần cấp quyền thi lại;
  :Chọn môn học và nhấn nút "Thi lại";
  :Xác nhận hộp thoại cảnh báo xóa kết quả cũ;
  |Hệ thống|
  :Truy vấn và xóa các bản ghi ExamResults cũ;
  :Đặt lại trạng thái môn thi thành "Chưa thi";
  :Hiển thị thông báo "Cấp quyền thi lại thành công";
endsplit

|Trưởng phòng giáo vụ|
stop
@enduml
```
