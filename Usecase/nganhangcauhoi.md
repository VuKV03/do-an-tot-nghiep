# Tài liệu Đặc tả: Quản lý Ngân hàng Câu hỏi (Question Bank Management)

## 1. Bảng Use Case chức năng

*Bảng 2.8. Bảng usecase chức năng quản lý ngân hàng câu hỏi*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý câu hỏi**     | **Giáo viên bộ môn (GVBM)**   |                                                                                                                         | Phức tạp        |
|                         |                               | Giáo viên bộ môn xem danh sách các câu hỏi trong ngân hàng câu hỏi. Hệ thống hiển thị danh sách.                        |                 |
|                         |                               | Giáo viên bộ môn tìm kiếm và lọc câu hỏi theo môn học, chủ đề, mức độ nhận thức. Hệ thống hiển thị danh sách khớp.       |                 |
|                         |                               | Giáo viên bộ môn cập nhật nội dung câu hỏi, các phương án lựa chọn và đáp án đúng. Hệ thống lưu lại các thay đổi.       |                 |
|                         |                               | Giáo viên bộ môn thực hiện xóa câu hỏi. Hệ thống xác nhận và xóa khỏi cơ sở dữ liệu nếu câu hỏi chưa nằm trong đề thi. |                 |
|                         | **Tổ trưởng bộ môn (TTBM)**   |                                                                                                                         | Dễ             |
|                         |                               | Tổ trưởng bộ môn xem danh sách các câu hỏi thuộc bộ môn phụ trách. Hệ thống hiển thị danh sách.                         |                 |
|                         |                               | Tổ trưởng bộ môn tìm kiếm và lọc câu hỏi theo môn học, chủ đề, mức độ nhận thức. Hệ thống hiển thị danh sách khớp.       |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ minh họa sự tương tác của Giáo viên bộ môn (GVBM) và Tổ trưởng bộ môn (TTBM) đối với phân hệ quản lý câu hỏi trong ngân hàng câu hỏi. Giáo viên bộ môn được thực hiện toàn bộ các chức năng tra cứu, cập nhật và xóa, trong khi Tổ trưởng bộ môn chỉ có quyền xem và tra cứu/lọc danh sách câu hỏi.

**Mục tiêu:** Thể hiện phân quyền rõ ràng giữa GVBM (người quản lý trực tiếp nội dung câu hỏi) và TTBM (người duyệt, giám sát chất lượng ngân hàng câu hỏi).

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý câu hỏi

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Tổ trưởng bộ môn" as TTBM

rectangle "Phân hệ: Quản lý câu hỏi" {
  usecase "Quản lý câu hỏi" as MainUC
  usecase "Xem danh sách câu hỏi" as UC_Xem
  usecase "Tìm kiếm / Lọc câu hỏi" as UC_TimKiem
  usecase "Cập nhật câu hỏi" as UC_Sua
  usecase "Xóa câu hỏi" as UC_Xoa

  UC_Xem ..> MainUC : <<extend>>
  UC_TimKiem ..> MainUC : <<extend>>
  UC_Sua ..> MainUC : <<extend>>
  UC_Xoa ..> MainUC : <<extend>>
}

GVBM --> MainUC
TTBM --> UC_Xem
TTBM --> UC_TimKiem

note bottom of MainUC
  * Giáo viên bộ môn: Xem, tìm kiếm, cập nhật và xóa câu hỏi thuộc môn học được phân công.
  * Tổ trưởng bộ môn: Chỉ có quyền xem và tìm kiếm/lọc các câu hỏi trong bộ môn quản lý.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Tìm kiếm và Xem câu hỏi

**Mô tả:** Diễn giải quy trình tương tác khi Giáo viên bộ môn hoặc Tổ trưởng bộ môn thực hiện tìm kiếm và lọc danh sách câu hỏi theo các tiêu chí (môn học, chủ đề, từ khóa).

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và Xem câu hỏi

actor "GVBM / TTBM" as User
participant "Giao diện Câu hỏi\n(Question View)" as View
participant "QuestionService\n(API Xử lý)" as Service
database "Database\n(Questions)" as DB

User -> View : Lọc theo Môn học / Chủ đề hoặc nhập từ khóa tìm kiếm
View -> Service : GET /api/results?subjectId={subId}&topicId={topicId}&search={keyword}
activate Service

Service -> DB : Truy vấn danh sách câu hỏi và các phương án trả lời tương ứng
activate DB
DB --> Service : Trả về dữ liệu danh sách câu hỏi (JSON)
deactivate DB

Service --> View : Phản hồi danh sách câu hỏi dạng JSON
deactivate Service

View --> User : Hiển thị danh sách câu hỏi đã lọc lên giao diện
@enduml
```

### Biểu đồ trình tự 2: Cập nhật câu hỏi

**Mô tả:** Diễn giải quy trình Giáo viên bộ môn thực hiện chỉnh sửa nội dung câu hỏi, các phương án trả lời và đáp án đúng. Hệ thống hiển thị lại dữ liệu cũ và cập nhật thông tin mới vào cơ sở dữ liệu.

```plantuml
@startuml
title Biểu đồ trình tự: Cập nhật câu hỏi

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Câu hỏi\n(Question View)" as View
participant "QuestionService\n(API Xử lý)" as Service
database "Database\n(Questions)" as DB

GVBM -> View : Nhấn "Cập nhật" tại một câu hỏi
View -> Service : GET /api/questions/{id}
activate Service

Service -> DB : Lấy chi tiết nội dung câu hỏi và các đáp án
activate DB
DB --> Service : Trả về chi tiết câu hỏi
deactivate DB

Service --> View : Phản hồi chi tiết câu hỏi (JSON)
deactivate Service

View --> GVBM : Hiển thị Form chỉnh sửa điền sẵn thông tin câu hỏi
GVBM -> View : Chỉnh sửa nội dung, đáp án và nhấn "Lưu"

View -> Service : PUT /api/questions/{id} (Dữ liệu cập nhật)
activate Service

Service -> DB : Cập nhật nội dung câu hỏi và đáp án mới
activate DB
DB --> Service : Cập nhật thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (200 OK)
deactivate Service

View --> GVBM : Hiển thị thông báo "Cập nhật câu hỏi thành công"
View -> View : Tải lại danh sách câu hỏi
@enduml
```

### Biểu đồ trình tự 3: Xóa câu hỏi

**Mô tả:** Quy trình Giáo viên bộ môn yêu cầu xóa câu hỏi. Hệ thống kiểm tra xem câu hỏi có thuộc đề thi nào chưa trước khi tiến hành xóa để tránh phá vỡ tính toàn vẹn dữ liệu.

```plantuml
@startuml
title Biểu đồ trình tự: Xóa câu hỏi

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Câu hỏi\n(Question View)" as View
participant "QuestionService\n(API Xử lý)" as Service
database "Database\n(Questions & Exams)" as DB

GVBM -> View : Nhấn nút "Xóa" tại câu hỏi cần xóa
View --> GVBM : Hiển thị Popup xác nhận xóa câu hỏi
GVBM -> View : Xác nhận đồng ý xóa

View -> Service : DELETE /api/questions/{id}
activate Service

Service -> DB : Kiểm tra câu hỏi đã có trong đề thi/lượt thi nào chưa
activate DB
DB --> Service : Trả về số lượng đề thi đang chứa câu hỏi (count)
deactivate DB

alt Số lượng đề thi > 0 (Không hợp lệ)
  Service --> View : Phản hồi lỗi: "Câu hỏi đã được dùng trong đề thi, không thể xóa" (400 Bad Request)
else Số lượng đề thi = 0 (Hợp lệ)
  Service -> DB : Xóa câu hỏi và các phương án liên quan
  activate DB
  DB --> Service : Xóa thành công
  deactivate DB
  Service --> View : Phản hồi thành công (200 OK)
end

deactivate Service
View --> GVBM : Hiển thị thông báo kết quả tương ứng
View -> View : Tải lại danh sách câu hỏi (nếu xóa thành công)
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động 1: Tìm kiếm và Xem câu hỏi

**Mô tả:** Luồng hoạt động tìm kiếm và duyệt danh sách các câu hỏi trong ngân hàng.

```plantuml
@startuml
title Biểu đồ hoạt động: Tìm kiếm và Xem câu hỏi

|GVBM / TTBM|
start
:Truy cập phân hệ "Quản lý câu hỏi";
:Lọc theo Môn học / Chủ đề hoặc nhập từ khóa tìm kiếm;

|Hệ thống|
:Truy vấn danh sách câu hỏi theo bộ lọc từ Database;
:Hiển thị danh sách câu hỏi kèm các phương án trả lời lên màn hình;

|GVBM / TTBM|
:Xem và rà soát nội dung câu hỏi;
stop
@enduml
```

### Biểu đồ hoạt động 2: Cập nhật câu hỏi

**Mô tả:** Luồng hoạt động chỉnh sửa câu hỏi hiện tại, tích hợp vòng lặp kiểm tra tính hợp lệ dữ liệu.

```plantuml
@startuml
title Biểu đồ hoạt động: Cập nhật câu hỏi

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý câu hỏi";
:Chọn câu hỏi cần chỉnh sửa và nhấn "Cập nhật";

|Hệ thống|
:Truy xuất chi tiết câu hỏi và đáp án từ Database;
:Hiển thị Form chỉnh sửa điền sẵn dữ liệu cũ;

|Giáo viên bộ môn|
repeat
  :Thay đổi nội dung câu hỏi, phương án trả lời, đáp án đúng hoặc độ khó;
  :Nhấn nút "Lưu";
  
  |Hệ thống|
  :Kiểm tra tính hợp lệ (Không để trống nội dung, có ít nhất một đáp án đúng);
backward:Hiển thị thông báo lỗi dữ liệu không hợp lệ;
repeat while (Dữ liệu không hợp lệ?) is (Có) not (Không)

:Lưu thông tin cập nhật vào Database;
:Hiển thị thông báo "Cập nhật câu hỏi thành công";

|Giáo viên bộ môn|
:Quan sát danh sách câu hỏi đã thay đổi;
stop
@enduml
```

### Biểu đồ hoạt động 3: Xóa câu hỏi

**Mô tả:** Luồng hoạt động xóa câu hỏi, có kiểm tra xem câu hỏi đó đã được dùng trong đề thi nào hay chưa trước khi tiến hành xóa.

```plantuml
@startuml
title Biểu đồ hoạt động: Xóa câu hỏi

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý câu hỏi";
:Chọn câu hỏi cần xóa và nhấn nút "Xóa";

|Hệ thống|
:Hiển thị Popup yêu cầu xác nhận xóa;

|Giáo viên bộ môn|
if (Xác nhận đồng ý xóa?) then (Có)
  |Hệ thống|
  :Kiểm tra xem câu hỏi có thuộc đề thi nào không;
  if (Câu hỏi chưa được sử dụng?) then (Đúng)
    :Xóa câu hỏi và các lựa chọn đáp án tương ứng khỏi Database;
    :Hiển thị thông báo "Xóa câu hỏi thành công";
  else (Sai)
    :Hiển thị thông báo lỗi "Không thể xóa câu hỏi đã có trong đề thi";
  endif
else (Không)
  |Hệ thống|
  :Hủy bỏ yêu cầu xóa;
endif

|Giáo viên bộ môn|
stop
@enduml
```
