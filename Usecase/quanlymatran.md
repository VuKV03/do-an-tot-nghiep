# Tài liệu Đặc tả: Quản lý Ma trận đề (Exam Matrix Management)

## 1. Bảng Use Case chức năng

*Bảng 2.9. Bảng usecase chức năng quản lý ma trận đề*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý ma trận đề**  | **Giáo viên bộ môn (GVBM)**   |                                                                                                                         | Trung bình     |
|                         |                               | Giáo viên bộ môn xem danh sách các ma trận đề thuộc môn học phụ trách. Hệ thống hiển thị danh sách.                    |                 |
|                         |                               | Giáo viên bộ môn thực hiện tìm kiếm, lọc danh sách ma trận đề. Hệ thống lọc và hiển thị kết quả.                        |                 |
|                         |                               | Giáo viên bộ môn thiết lập thêm mới ma trận đề (tỉ lệ phân bố chủ đề, độ khó). Hệ thống lưu ma trận.                     |                 |
|                         |                               | Giáo viên bộ môn cập nhật cấu trúc ma trận đề. Hệ thống ghi nhận và lưu các thông số thay đổi.                          |                 |
|                         |                               | Giáo viên bộ môn thực hiện xóa ma trận đề. Hệ thống xác nhận và xóa khỏi cơ sở dữ liệu nếu ma trận chưa được dùng sinh đề. |                 |
|                         | **Tổ trưởng bộ môn (TTBM)**   |                                                                                                                         | Dễ             |
|                         |                               | Tổ trưởng bộ môn xem danh sách các ma trận đề của bộ môn mình quản lý. Hệ thống hiển thị danh sách.                     |                 |
|                         |                               | Tổ trưởng bộ môn tìm kiếm ma trận đề theo tên hoặc môn học. Hệ thống hiển thị kết quả lọc.                              |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa sự tương tác của Giáo viên bộ môn (GVBM) và Tổ trưởng bộ môn (TTBM) đối với phân hệ quản lý ma trận đề. Giáo viên bộ môn được thực hiện toàn bộ các chức năng tạo mới, chỉnh sửa, và xóa ma trận đề; trong khi Tổ trưởng bộ môn chỉ có quyền xem và tra cứu danh sách ma trận đề.

**Mục tiêu:** Thể hiện trực quan sự phân quyền quản trị ma trận cấu trúc đề thi giữa các tác nhân giảng dạy và quản lý tổ bộ môn.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý ma trận đề

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Tổ trưởng bộ môn" as TTBM

rectangle "Phân hệ: Quản lý ma trận đề" {
  usecase "Quản lý ma trận đề" as MainUC
  usecase "Xem danh sách ma trận đề" as UC_Xem
  usecase "Tìm kiếm / Lọc ma trận đề" as UC_TimKiem
  usecase "Thêm mới ma trận đề" as UC_Them
  usecase "Cập nhật ma trận đề" as UC_Sua
  usecase "Xóa ma trận đề" as UC_Xoa

  UC_Xem ..> MainUC : <<extend>>
  UC_TimKiem ..> MainUC : <<extend>>
  UC_Them ..> MainUC : <<extend>>
  UC_Sua ..> MainUC : <<extend>>
  UC_Xoa ..> MainUC : <<extend>>
}

GVBM --> MainUC
TTBM --> UC_Xem
TTBM --> UC_TimKiem

note bottom of MainUC
  * Giáo viên bộ môn: Xem, tìm kiếm, thêm mới, cập nhật và xóa ma trận đề thuộc môn học phụ trách.
  * Tổ trưởng bộ môn: Chỉ có quyền xem và tìm kiếm/lọc danh sách ma trận đề trong bộ môn quản lý.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Tìm kiếm và Xem ma trận đề

**Mô tả:** Diễn giải quy trình khi Giáo viên bộ môn hoặc Tổ trưởng bộ môn tìm kiếm và tra cứu danh sách ma trận đề theo các môn học hoặc từ khóa.

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và Xem ma trận đề

actor "GVBM / TTBM" as User
participant "Giao diện Ma trận\n(Matrix View)" as View
participant "MatrixService\n(API Xử lý)" as Service
database "Database\n(Matrices)" as DB

User -> View : Nhập từ khóa tìm kiếm hoặc lọc theo Môn học
View -> Service : GET /api/matrices?search={keyword}&subjectId={subjectId}
activate Service

Service -> DB : Truy vấn danh sách ma trận đề theo bộ lọc
activate DB
DB --> Service : Trả về danh sách ma trận đề (JSON)
deactivate DB

Service --> View : Phản hồi dữ liệu danh sách ma trận đề (JSON)
deactivate Service

View --> User : Hiển thị danh sách ma trận đề đã lọc lên màn hình
@enduml
```

### Biểu đồ trình tự 2: Thêm mới ma trận đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn thêm mới một ma trận cấu trúc đề. Hệ thống sẽ kiểm tra tính hợp lệ của phân bổ tỉ lệ phần trăm trước khi lưu vào Database.

```plantuml
@startuml
title Biểu đồ trình tự: Thêm mới ma trận đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Ma trận\n(Matrix View)" as View
participant "MatrixService\n(API Xử lý)" as Service
database "Database\n(Matrices)" as DB

GVBM -> View : Nhấn nút "Thêm mới"
View --> GVBM : Hiển thị Form nhập thông tin ma trận đề
GVBM -> View : Thiết lập ma trận (Môn học, Số câu hỏi theo độ khó/chủ đề) và nhấn "Lưu"

View -> Service : POST /api/matrices (Dữ liệu ma trận)
activate Service

Service -> DB : Kiểm tra tổng tỉ lệ % / số câu hỏi có hợp lệ không
activate DB
DB --> Service : Hợp lệ
deactivate DB

Service -> DB : Lưu thông tin ma trận đề mới
activate DB
DB --> Service : Lưu thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (201 Created)
deactivate Service

View --> GVBM : Hiển thị thông báo "Thêm mới ma trận đề thành công"
View -> View : Tải lại danh sách ma trận đề
@enduml
```

### Biểu đồ trình tự 3: Cập nhật ma trận đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn cập nhật thông số một ma trận đề có sẵn.

```plantuml
@startuml
title Biểu đồ trình tự: Cập nhật ma trận đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Ma trận\n(Matrix View)" as View
participant "MatrixService\n(API Xử lý)" as Service
database "Database\n(Matrices)" as DB

GVBM -> View : Nhấn nút "Cập nhật" tại một ma trận
View -> Service : GET /api/matrices/{id}
activate Service

Service -> DB : Lấy chi tiết thông tin ma trận đề
activate DB
DB --> Service : Trả về dữ liệu ma trận đề
deactivate DB

Service --> View : Phản hồi chi tiết ma trận đề (JSON)
deactivate Service

View --> GVBM : Hiển thị Form chỉnh sửa điền sẵn thông tin ma trận đề
GVBM -> View : Điều chỉnh thông số ma trận và nhấn "Lưu"

View -> Service : PUT /api/matrices/{id} (Dữ liệu cập nhật)
activate Service

Service -> DB : Kiểm tra tính hợp lệ của cấu trúc ma trận mới
activate DB
DB --> Service : Hợp lệ
deactivate DB

Service -> DB : Cập nhật thông tin ma trận đề
activate DB
DB --> Service : Cập nhật thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (200 OK)
deactivate Service

View --> GVBM : Hiển thị thông báo "Cập nhật ma trận đề thành công"
View -> View : Tải lại danh sách ma trận đề
@enduml
```

### Biểu đồ trình tự 4: Xóa ma trận đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn thực hiện xóa ma trận đề. Hệ thống kiểm tra xem ma trận đề đã được dùng để sinh đề thi nào chưa trước khi xóa.

```plantuml
@startuml
title Biểu đồ trình tự: Xóa ma trận đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Ma trận\n(Matrix View)" as View
participant "MatrixService\n(API Xử lý)" as Service
database "Database\n(Matrices & Exams)" as DB

GVBM -> View : Nhấn chọn "Xóa" tại một ma trận
View --> GVBM : Hiển thị Popup xác nhận xóa
GVBM -> View : Xác nhận đồng ý xóa

View -> Service : DELETE /api/matrices/{id}
activate Service

Service -> DB : Kiểm tra xem ma trận đề có đang được dùng để sinh đề thi nào không
activate DB
DB --> Service : Trả về số lượng đề thi đang dùng ma trận này (count)
deactivate DB

alt Số lượng đề thi > 0 (Không hợp lệ)
  Service --> View : Phản hồi lỗi: "Ma trận đang được dùng để sinh đề thi, không thể xóa" (400 Bad Request)
else Số lượng đề thi = 0 (Hợp lệ)
  Service -> DB : Xóa ma trận đề khỏi cơ sở dữ liệu
  activate DB
  DB --> Service : Xóa thành công
  deactivate DB
  Service --> View : Phản hồi thành công (200 OK)
end

deactivate Service
View --> GVBM : Hiển thị thông báo kết quả tương ứng
View -> View : Tải lại danh sách ma trận đề (nếu xóa thành công)
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động 1: Tìm kiếm và xem ma trận đề

**Mô tả:** Luồng nghiệp vụ khi Giáo viên bộ môn hoặc Tổ trưởng bộ môn thực hiện tìm kiếm và tra cứu các ma trận cấu trúc đề thi.

```plantuml
@startuml
title Biểu đồ hoạt động: Tìm kiếm và xem ma trận đề

|GVBM / TTBM|
start
:Truy cập phân hệ "Quản lý ma trận đề";
:Nhập từ khóa tìm kiếm hoặc lọc theo Môn học;

|Hệ thống|
:Truy vấn danh sách ma trận đề từ Database;
:Hiển thị danh sách ma trận đề thỏa mãn điều kiện lên màn hình;

|GVBM / TTBM|
:Xem và phân tích thông số cấu trúc ma trận đề;
stop
@enduml
```

### Biểu đồ hoạt động 2: Thêm mới ma trận đề

**Mô tả:** Luồng nghiệp vụ thêm mới ma trận đề kèm kiểm tra định dạng và tổng tỷ lệ phần trăm (hoặc số câu hỏi) hợp lệ.

```plantuml
@startuml
title Biểu đồ hoạt động: Thêm mới ma trận đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý ma trận đề";
:Nhấn nút "Thêm mới";

|Hệ thống|
:Hiển thị Form thiết lập ma trận đề (lưới tỉ lệ chủ đề và mức độ nhận thức);

|Giáo viên bộ môn|
repeat
  :Chọn môn học, nhập thông tin chung;
  :Thiết lập tỷ lệ phần trăm / số câu hỏi cho từng chủ đề và độ khó;
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra tính hợp lệ (Tổng tỉ lệ phải bằng 100%, hoặc tổng số câu hỏi phải khớp);
backward:Hiển thị lỗi thiết lập ma trận không hợp lệ;
repeat while (Thiết lập không hợp lệ?) is (Có) not (Không)

:Lưu ma trận đề mới vào Database;
:Hiển thị thông báo "Thêm mới ma trận đề thành công";

|Giáo viên bộ môn|
:Quan sát danh sách ma trận đề được cập nhật;
stop
@enduml
```

### Biểu đồ hoạt động 3: Cập nhật ma trận đề

**Mô tả:** Luồng nghiệp vụ cập nhật ma trận đề đã có và xác thực lại cấu trúc ma trận mới.

```plantuml
@startuml
title Biểu đồ hoạt động: Cập nhật ma trận đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý ma trận đề";
:Chọn ma trận đề cần chỉnh sửa và nhấn "Cập nhật";

|Hệ thống|
:Truy xuất thông tin ma trận đề cũ từ Database;
:Hiển thị Form chỉnh sửa điền sẵn thông số ma trận;

|Giáo viên bộ môn|
repeat
  :Điều chỉnh lại tỉ lệ phần trăm / số lượng câu hỏi của ma trận;
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra tính hợp lệ và cân đối của ma trận đề mới;
backward:Hiển thị thông báo lỗi thiết lập ma trận;
repeat while (Cấu trúc ma trận mới không hợp lệ?) is (Có) not (Không)

:Cập nhật dữ liệu ma trận đề vào Database;
:Hiển thị thông báo "Cập nhật ma trận đề thành công";

|Giáo viên bộ môn|
:Quan sát danh sách ma trận đề đã thay đổi;
stop
@enduml
```

### Biểu đồ hoạt động 4: Xóa ma trận đề

**Mô tả:** Luồng nghiệp vụ xóa ma trận đề, có kiểm tra xem cấu trúc ma trận này đã được dùng sinh đề thi nào hay chưa trước khi tiến hành xóa.

```plantuml
@startuml
title Biểu đồ hoạt động: Xóa ma trận đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý ma trận đề";
:Chọn ma trận đề cần xóa và nhấn "Xóa";

|Hệ thống|
:Hiển thị Popup yêu cầu xác nhận xóa;

|Giáo viên bộ môn|
if (Xác nhận đồng ý xóa?) then (Có)
  |Hệ thống|
  :Kiểm tra xem ma trận đề đã được sử dụng để sinh đề thi nào chưa;
  if (Chưa được sử dụng?) then (Đúng)
    :Xóa ma trận đề khỏi Database;
    :Hiển thị thông báo "Xóa ma trận đề thành công";
  else (Sai)
    :Hiển thị thông báo lỗi "Không thể xóa ma trận đề đang được dùng sinh đề thi";
  endif
else (Không)
  |Hệ thống|
  :Hủy bỏ yêu cầu xóa;
endif

|Giáo viên bộ môn|
stop
@enduml
```
