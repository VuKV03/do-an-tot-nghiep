# Tài liệu Đặc tả: Quản lý Chủ Đề (Topic Management)

## 1. Bảng Use Case chức năng

*Bảng 2.7. Bảng usecase chức năng quản lý chủ đề*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý chủ đề**     | **Giáo viên bộ môn (GVBM)**   |                                                                                                                         | Trung bình     |
|                         |                               | Giáo viên bộ môn xem danh sách các chủ đề thuộc môn học phụ trách. Hệ thống hiển thị danh sách chủ đề.                 |                 |
|                         |                               | Giáo viên bộ môn thực hiện tìm kiếm, lọc danh sách chủ đề. Hệ thống lọc và hiển thị kết quả.                             |                 |
|                         |                               | Giáo viên bộ môn tạo mới chủ đề (nhập tên, mô tả). Hệ thống lưu trữ và tạo chủ đề mới.                                  |                 |
|                         |                               | Giáo viên bộ môn cập nhật thông tin chủ đề. Hệ thống ghi nhận và lưu các thay đổi.                                      |                 |
|                         |                               | Giáo viên bộ môn thực hiện xóa chủ đề. Hệ thống xác nhận và xóa khỏi cơ sở dữ liệu nếu hợp lệ.                         |                 |
|                         | **Tổ trưởng bộ môn (TTBM)**   |                                                                                                                         | Dễ             |
|                         |                               | Tổ trưởng bộ môn xem danh sách các chủ đề của bộ môn mình quản lý. Hệ thống hiển thị danh sách chủ đề.                  |                 |
|                         |                               | Tổ trưởng bộ môn tìm kiếm chủ đề theo tên hoặc môn học. Hệ thống hiển thị kết quả lọc.                                  |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa sự tương tác của Giáo viên bộ môn (GVBM) và Tổ trưởng bộ môn (TTBM) đối với phân hệ quản lý chủ đề. Giáo viên bộ môn được thực hiện toàn bộ các chức năng CRUD, trong khi Tổ trưởng bộ môn chỉ có quyền xem và tra cứu/tìm kiếm danh sách chủ đề.

**Mục tiêu:** Thể hiện trực quan sự phân quyền truy cập và thao tác đối với thực thể Chủ đề trong ngân hàng câu hỏi.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý chủ đề

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Tổ trưởng bộ môn" as TTBM

rectangle "Phân hệ: Quản lý chủ đề" {
  usecase "Quản lý chủ đề" as MainUC
  usecase "Xem danh sách chủ đề" as UC_Xem
  usecase "Thêm mới chủ đề" as UC_Them
  usecase "Cập nhật chủ đề" as UC_Sua
  usecase "Xóa chủ đề" as UC_Xoa

  UC_Xem ..> MainUC : <<extend>>
  UC_Them ..> MainUC : <<extend>>
  UC_Sua ..> MainUC : <<extend>>
  UC_Xoa ..> MainUC : <<extend>>
}

GVBM --> MainUC
TTBM --> UC_Xem

note bottom of MainUC
  * Giáo viên bộ môn: Toàn quyền CRUD các chủ đề thuộc môn học phụ trách.
  * Tổ trưởng bộ môn: Chỉ được phép xem và tìm kiếm danh sách các chủ đề.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Thêm mới chủ đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn thêm mới một chủ đề vào môn học. Hệ thống sẽ validate kiểm tra trùng lặp tên chủ đề trước khi lưu.

```plantuml
@startuml
title Biểu đồ trình tự: Thêm mới chủ đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Chủ đề\n(Topic View)" as View
participant "TopicService\n(API Xử lý)" as Service
database "Database\n(Topics)" as DB

GVBM -> View : Nhấn nút "Thêm mới"
View --> GVBM : Hiển thị Form nhập thông tin chủ đề
GVBM -> View : Nhập thông tin (Tên chủ đề, Mô tả, Môn học) và nhấn "Lưu"

View -> Service : POST /api/topics (Dữ liệu chủ đề)
activate Service

Service -> DB : Kiểm tra trùng lặp tên chủ đề trong môn học
activate DB
DB --> Service : Không trùng lặp
deactivate DB

Service -> DB : Lưu thông tin chủ đề mới
activate DB
DB --> Service : Lưu thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (201 Created)
deactivate Service

View --> GVBM : Hiển thị thông báo "Thêm mới chủ đề thành công"
View -> View : Tải lại danh sách chủ đề
@enduml
```

### Biểu đồ trình tự 2: Tìm kiếm và Xem danh sách chủ đề

**Mô tả:** Diễn giải quy trình khi Giáo viên bộ môn hoặc Tổ trưởng bộ môn thực hiện tìm kiếm và tra cứu danh sách chủ đề trên hệ thống.

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và Xem danh sách chủ đề

actor "Giáo viên bộ môn / Tổ trưởng bộ môn" as User
participant "Giao diện Chủ đề\n(Topic View)" as View
participant "TopicService\n(API Xử lý)" as Service
database "Database\n(Topics)" as DB

User -> View : Nhập từ khóa tìm kiếm hoặc lọc theo Môn học
View -> Service : GET /api/topics?search={keyword}&subjectId={subjectId}
activate Service

Service -> DB : Truy vấn danh sách chủ đề theo tiêu chí lọc
activate DB
DB --> Service : Trả về danh sách chủ đề (JSON)
deactivate DB

Service --> View : Phản hồi dữ liệu danh sách chủ đề (JSON)
deactivate Service

View --> User : Hiển thị danh sách chủ đề đã lọc lên màn hình
@enduml
```

### Biểu đồ trình tự 3: Cập nhật chủ đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn cập nhật thông tin một chủ đề đã tồn tại. Hệ thống hiển thị form điền sẵn dữ liệu cũ, kiểm tra trùng lặp tên chủ đề mới và lưu các thay đổi.

```plantuml
@startuml
title Biểu đồ trình tự: Cập nhật chủ đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Chủ đề\n(Topic View)" as View
participant "TopicService\n(API Xử lý)" as Service
database "Database\n(Topics)" as DB

GVBM -> View : Nhấn nút "Cập nhật" tại một chủ đề
View -> Service : GET /api/topics/{id}
activate Service

Service -> DB : Lấy chi tiết thông tin chủ đề
activate DB
DB --> Service : Trả về dữ liệu chủ đề
deactivate DB

Service --> View : Phản hồi chi tiết chủ đề (JSON)
deactivate Service

View --> GVBM : Hiển thị Form chỉnh sửa điền sẵn thông tin
GVBM -> View : Thay đổi thông tin và nhấn "Lưu"

View -> Service : PUT /api/topics/{id} (Dữ liệu thay đổi)
activate Service

Service -> DB : Kiểm tra trùng tên chủ đề mới trong môn học
activate DB
DB --> Service : Không trùng lặp
deactivate DB

Service -> DB : Cập nhật thông tin chủ đề
activate DB
DB --> Service : Cập nhật thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (200 OK)
deactivate Service

View --> GVBM : Hiển thị thông báo "Cập nhật chủ đề thành công"
View -> View : Tải lại danh sách chủ đề
@enduml
```

### Biểu đồ trình tự 4: Xóa chủ đề

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn thực hiện xóa chủ đề. Hệ thống tiến hành kiểm tra xem chủ đề có đang chứa câu hỏi nào không để đảm bảo tính nhất quán dữ liệu trước khi thực hiện xóa.

```plantuml
@startuml
title Biểu đồ trình tự: Xóa chủ đề

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Chủ đề\n(Topic View)" as View
participant "TopicService\n(API Xử lý)" as Service
database "Database\n(Topics & Questions)" as DB

GVBM -> View : Nhấn chọn "Xóa" tại một chủ đề
View --> GVBM : Hiển thị Popup xác nhận xóa
GVBM -> View : Xác nhận đồng ý xóa

View -> Service : DELETE /api/topics/{id}
activate Service

Service -> DB : Kiểm tra xem chủ đề có chứa câu hỏi nào không
activate DB
DB --> Service : Trả về số lượng câu hỏi thuộc chủ đề (count)
deactivate DB

alt Số lượng câu hỏi > 0 (Không hợp lệ)
  Service --> View : Phản hồi lỗi: "Chủ đề đang chứa câu hỏi, không thể xóa" (400 Bad Request)
else Số lượng câu hỏi = 0 (Hợp lệ)
  Service -> DB : Xóa chủ đề khỏi cơ sở dữ liệu
  activate DB
  DB --> Service : Xóa thành công
  deactivate DB
  Service --> View : Phản hồi thành công (200 OK)
end

deactivate Service
View --> GVBM : Hiển thị thông báo kết quả tương ứng
View -> View : Tải lại danh sách chủ đề (nếu xóa thành công)
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động 1: Thêm mới chủ đề

**Mô tả:** Luồng nghiệp vụ thêm mới một chủ đề kèm theo vòng lặp kiểm tra tính hợp lệ và cảnh báo lỗi nếu trùng tên.

```plantuml
@startuml
title Biểu đồ hoạt động: Thêm mới chủ đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý chủ đề";
:Nhấn nút "Thêm mới";

|Hệ thống|
:Hiển thị Form nhập liệu chủ đề;

|Giáo viên bộ môn|
repeat
  :Nhập thông tin chủ đề (Tên chủ đề, Mô tả, Môn học);
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra tính hợp lệ (Không trống, không trùng tên);
backward:Hiển thị thông báo lỗi;
repeat while (Dữ liệu không hợp lệ?) is (Có) not (Không)

:Lưu thông tin chủ đề mới vào Database;
:Hiển thị thông báo "Thêm mới chủ đề thành công";

|Giáo viên bộ môn|
:Quan sát danh sách chủ đề được cập nhật;
stop
@enduml
```

### Biểu đồ hoạt động 2: Cập nhật chủ đề

**Mô tả:** Luồng nghiệp vụ cập nhật thông tin chủ đề hiện có và kiểm tra trùng tên khi thay đổi.

```plantuml
@startuml
title Biểu đồ hoạt động: Cập nhật chủ đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý chủ đề";
:Chọn một chủ đề cần chỉnh sửa và nhấn "Cập nhật";

|Hệ thống|
:Truy xuất thông tin chủ đề cũ;
:Hiển thị Form chỉnh sửa điền sẵn thông tin;

|Giáo viên bộ môn|
repeat
  :Thay đổi thông tin (Tên chủ đề, Mô tả);
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra trùng lặp tên chủ đề trong môn học;
backward:Hiển thị thông báo lỗi trùng tên;
repeat while (Tên chủ đề bị trùng lặp?) is (Có) not (Không)

:Cập nhật dữ liệu chủ đề vào Database;
:Hiển thị thông báo "Cập nhật chủ đề thành công";

|Giáo viên bộ môn|
:Quan sát danh sách chủ đề đã thay đổi;
stop
@enduml
```

### Biểu đồ hoạt động 3: Xóa chủ đề

**Mô tả:** Luồng nghiệp vụ xóa chủ đề, có kiểm tra ràng buộc xem chủ đề đó đã được sử dụng cho câu hỏi nào chưa để ngăn chặn lỗi toàn vẹn dữ liệu.

```plantuml
@startuml
title Biểu đồ hoạt động: Xóa chủ đề

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý chủ đề";
:Chọn chủ đề cần xóa và nhấn "Xóa";

|Hệ thống|
:Hiển thị Popup yêu cầu xác nhận xóa;

|Giáo viên bộ môn|
if (Xác nhận đồng ý xóa?) then (Có)
  |Hệ thống|
  :Kiểm tra xem chủ đề có chứa câu hỏi nào không;
  if (Chủ đề trống?) then (Có)
    :Xóa chủ đề khỏi Database;
    :Hiển thị thông báo "Xóa chủ đề thành công";
  else (Không)
    :Hiển thị thông báo lỗi "Không thể xóa chủ đề đã có câu hỏi";
  endif
else (Không)
  |Hệ thống|
  :Hủy bỏ yêu cầu xóa;
endif

|Giáo viên bộ môn|
stop
@enduml
```
