# Tài liệu Đặc tả: Quản lý Đề gốc (Base Exam Management)

## 1. Bảng Use Case chức năng

*Bảng 2.12. Bảng usecase chức năng quản lý đề gốc*

| Tên Use case                 | Tác nhân                                     | Giao dịch                                                                                                                                                | Độ phức tạp |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Quản lý đề gốc**            | **Giáo viên bộ môn (GVBM)**                  |                                                                                                                                                           | Phức tạp        |
|                               |                                              | Giáo viên bộ môn có thể yêu cầu hệ thống sinh đề gốc tự động. Hệ thống tạo đề gốc dựa trên thuật toán/AI và lưu vào cơ sở dữ liệu.                       |                 |
|                               |                                              | Giáo viên bộ môn có thể xem chi tiết danh sách câu hỏi, đáp án của đề gốc. Hệ thống hiển thị chi tiết đề gốc.                                            |                 |
|                               |                                              | Giáo viên bộ môn thực hiện cập nhật đề gốc (tìm và thay thế các câu hỏi không phù hợp bằng câu hỏi tương đương). Hệ thống cập nhật lại nội dung đề gốc.  |                 |
|                               |                                              | Giáo viên bộ môn gửi thẩm định đề gốc. Hệ thống chuyển trạng thái đề gốc sang Chờ duyệt.                                                                 |                 |
|                               |                                              | Giáo viên bộ môn thực hiện xóa đề gốc. Hệ thống xóa đề gốc khỏi cơ sở dữ liệu nếu đề chưa được dùng sinh gói đề.                                          |                 |
|                               | **Tổ trưởng bộ môn (TTBM)**                  |                                                                                                                                                           | Phức tạp        |
|                               |                                              | Tổ trưởng bộ môn thực hiện tìm kiếm và xem danh sách đề gốc thuộc phạm vi bộ môn quản lý. Hệ thống hiển thị danh sách.                                    |                 |
|                               |                                              | Tổ trưởng bộ môn kiểm duyệt nội dung chuyên môn và phê duyệt hoặc từ chối đề gốc. Hệ thống cập nhật trạng thái tương ứng.                                |                 |
|                               | **Trưởng phòng giáo vụ (TPGV)**               |                                                                                                                                                           | Dễ              |
|                               |                                              | Trưởng phòng giáo vụ thực hiện tìm kiếm và xem danh sách đề gốc trên toàn hệ thống để giám sát chất lượng đề thi.                                         |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ thể hiện các tương tác của Giáo viên bộ môn (GVBM), Tổ trưởng bộ môn (TTBM) và Trưởng phòng giáo vụ (TPGV) đối với phân hệ quản lý đề gốc. GVBM phụ trách sinh đề, cập nhật câu hỏi, gửi thẩm định và xóa đề gốc. TTBM thực hiện xem và duyệt đề gốc. TPGV có quyền xem và tra cứu danh sách đề gốc toàn cục.

**Mục tiêu:** Định hình quy trình nghiệp vụ phối hợp chuyên môn khép kín từ khâu sinh đề nháp cho đến thẩm định và lưu trữ giám sát đề thi.

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý đề gốc

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Tổ trưởng bộ môn" as TTBM
actor "Trưởng phòng giáo vụ" as TPGV

rectangle "Phân hệ: Quản lý đề gốc" {
  usecase "Quản lý đề gốc" as MainUC
  usecase "Sinh đề gốc từ Ma trận" as UC_Sinh
  usecase "Tìm kiếm và xem đề gốc" as UC_Xem
  usecase "Cập nhật đề gốc (Thay thế câu hỏi)" as UC_Sua
  usecase "Gửi thẩm định đề gốc" as UC_GuiDuyet
  usecase "Phê duyệt / Từ chối đề gốc" as UC_Duyet
  usecase "Xóa đề gốc" as UC_Xoa

  UC_Sinh ..> MainUC : <<extend>>
  UC_Xem ..> MainUC : <<extend>>
  UC_Sua ..> MainUC : <<extend>>
  UC_GuiDuyet ..> MainUC : <<extend>>
  UC_Duyet ..> MainUC : <<extend>>
  UC_Xoa ..> MainUC : <<extend>>
}

GVBM --> MainUC
TTBM --> UC_Xem
TTBM --> UC_Duyet
TPGV --> UC_Xem

note bottom of MainUC
  * Giáo viên bộ môn: Sinh đề, sửa đổi, gửi thẩm định và xóa đề gốc.
  * Tổ trưởng bộ môn: Xem danh sách và thẩm định (phê duyệt/từ chối) đề gốc.
  * Trưởng phòng giáo vụ: Tìm kiếm và xem danh sách đề gốc trên toàn hệ thống.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

### Biểu đồ trình tự 1: Tìm kiếm và xem đề gốc

**Mô tả:** Diễn giải luồng dữ liệu khi người dùng (GVBM, TTBM hoặc TPGV) thực hiện tìm kiếm và tra cứu danh sách đề gốc.

```plantuml
@startuml
title Biểu đồ trình tự: Tìm kiếm và xem đề gốc

actor "GVBM / TTBM / TPGV" as User
participant "Giao diện Đề gốc\n(Exam View)" as View
participant "ExamService\n(API Xử lý)" as Service
database "Database\n(Exams)" as DB

User -> View : Nhập từ khóa hoặc bộ lọc (Môn học / Trạng thái)
View -> Service : GET /api/exams?search={keyword}&subjectId={subjectId}
activate Service

Service -> DB : Lấy danh sách đề gốc thỏa mãn bộ lọc
activate DB
DB --> Service : Trả về danh sách đề gốc (JSON)
deactivate DB

Service --> View : Phản hồi dữ liệu đề gốc (JSON)
deactivate Service

View --> User : Hiển thị danh sách đề gốc lên màn hình
@enduml
```

### Biểu đồ trình tự 2: Cập nhật đề gốc (Thay thế câu hỏi)

**Mô tả:** Diễn giải luồng tương tác khi Giáo viên bộ môn chỉnh sửa cập nhật đề gốc bằng cách thay thế câu hỏi chưa phù hợp bằng một câu hỏi tương đương từ ngân hàng câu hỏi.

```plantuml
@startuml
title Biểu đồ trình tự: Cập nhật đề gốc (Thay thế câu hỏi)

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Đề gốc\n(Exam View)" as View
participant "ExamService\n(API Xử lý)" as Service
participant "QuestionService\n(API Câu hỏi)" as QService
database "Database\n(Exams & Questions)" as DB

GVBM -> View : Nhấn "Thay thế" tại một câu hỏi trong đề gốc
View -> QService : GET /api/questions/equivalent?questionId={id}
activate QService

QService -> DB : Lấy danh sách câu hỏi tương đương (cùng chủ đề/độ khó)
activate DB
DB --> QService : Danh sách câu hỏi tương đương
deactivate DB

QService --> View : Phản hồi danh sách câu hỏi thay thế (JSON)
deactivate QService

GVBM -> View : Chọn câu hỏi mới và nhấn "Xác nhận"
View -> Service : PUT /api/exams/{examId}/replace-question (oldQuestionId, newQuestionId)
activate Service

Service -> DB : Cập nhật lại câu hỏi của đề gốc trong Database
activate DB
DB --> Service : Cập nhật thành công
deactivate DB

Service --> View : Phản hồi trạng thái thành công (200 OK)
deactivate Service

View --> GVBM : Hiển thị đề gốc mới và thông báo cập nhật thành công
@enduml
```

### Biểu đồ trình tự 3: Xóa đề gốc

**Mô tả:** Quy trình Giáo viên bộ môn thực hiện xóa đề gốc nháp hoặc đề bị từ chối, có kiểm tra tính toàn vẹn dữ liệu đề thi.

```plantuml
@startuml
title Biểu đồ trình tự: Xóa đề gốc

actor "Giáo viên bộ môn" as GVBM
participant "Giao diện Đề gốc\n(Exam View)" as View
participant "ExamService\n(API Xử lý)" as Service
database "Database\n(Exams & Packages)" as DB

GVBM -> View : Nhấn nút "Xóa" tại đề gốc cần xóa
View --> GVBM : Hiển thị Popup xác nhận xóa
GVBM -> View : Xác nhận đồng ý xóa

View -> Service : DELETE /api/exams/{examId}
activate Service

Service -> DB : Kiểm tra xem đề gốc đã được dùng sinh gói đề chưa
activate DB
DB --> Service : Trả về số lượng gói đề đang sử dụng (count)
deactivate DB

alt Số lượng gói đề > 0 (Không hợp lệ)
  Service --> View : Phản hồi lỗi: "Đề gốc đã được dùng sinh gói đề, không thể xóa" (400 Bad Request)
else Số lượng gói đề = 0 (Hợp lệ)
  Service -> DB : Xóa đề gốc khỏi Database
  activate DB
  DB --> Service : Xóa thành công
  deactivate DB
  Service --> View : Phản hồi thành công (200 OK)
end

deactivate Service
View --> GVBM : Hiển thị thông báo kết quả tương ứng
View -> View : Tải lại danh sách đề gốc
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

### Biểu đồ hoạt động 1: Tìm kiếm và xem đề gốc

**Mô tả:** Tiến trình tra cứu và hiển thị chi tiết đề gốc của các tác nhân GVBM, TTBM, TPGV.

```plantuml
@startuml
title Biểu đồ hoạt động: Tìm kiếm và xem đề gốc

|GVBM / TTBM / TPGV|
start
:Truy cập phân hệ "Quản lý đề gốc";
:Lọc theo Môn học / trạng thái hoặc nhập từ khóa tìm kiếm;

|Hệ thống|
:Truy vấn CSDL lấy danh sách đề gốc tương ứng;
:Hiển thị danh sách đề gốc lên màn hình;

|GVBM / TTBM / TPGV|
:Chọn một đề gốc để xem chi tiết;

|Hệ thống|
:Hiển thị chi tiết đề gốc (cơ cấu câu hỏi, đáp án);
stop
@enduml
```

### Biểu đồ hoạt động 2: Cập nhật đề gốc (Thay thế câu hỏi)

**Mô tả:** Tiến trình Giáo viên bộ môn thay thế câu hỏi trong đề gốc để cập nhật lại nội dung.

```plantuml
@startuml
title Biểu đồ hoạt động: Cập nhật đề gốc (Thay thế câu hỏi)

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý đề gốc";
:Chọn đề gốc (ở trạng thái Nháp hoặc Bị từ chối) cần cập nhật;
:Nhấn "Chi tiết" và chọn câu hỏi cần thay thế;

|Hệ thống|
:Truy xuất ngân hàng câu hỏi lấy các câu hỏi tương đương (cùng độ khó và chủ đề);
:Hiển thị danh sách câu hỏi thay thế;

|Giáo viên bộ môn|
:Chọn câu hỏi mới và nhấn "Xác nhận";

|Hệ thống|
:Cập nhật nội dung câu hỏi mới vào đề gốc;
:Lưu thay đổi vào Database;
:Hiển thị thông báo "Cập nhật đề gốc thành công";

|Giáo viên bộ môn|
stop
@enduml
```

### Biểu đồ hoạt động 3: Phê duyệt hoặc Từ chối đề gốc

**Mô tả:** Tiến trình thẩm định và duyệt đề gốc của Tổ trưởng bộ môn.

```plantuml
@startuml
title Biểu đồ hoạt động: Phê duyệt hoặc Từ chối đề gốc

|Tổ trưởng bộ môn|
start
:Truy cập danh sách đề gốc cần thẩm định;
:Chọn đề gốc ở trạng thái "Chờ duyệt" và xem chi tiết;
:Kiểm duyệt chất lượng câu hỏi trong đề gốc;

if (Đề gốc đạt yêu cầu?) then (Có)
  :Nhấn nút "Phê duyệt";
  |Hệ thống|
  :Cập nhật trạng thái đề gốc = "Đã duyệt";
  :Hiển thị thông báo phê duyệt thành công;
else (Không)
  |Tổ trưởng bộ môn|
  :Nhập ý kiến/lý do từ chối;
  :Nhấn nút "Từ chối";
  |Hệ thống|
  :Cập nhật trạng thái đề gốc = "Bị từ chối";
  :Lưu lý do từ chối vào hệ thống;
  :Hiển thị thông báo từ chối thành công;
endif

|Tổ trưởng bộ môn|
stop
@enduml
```

### Biểu đồ hoạt động 4: Xóa đề gốc

**Mô tả:** Tiến trình Giáo viên bộ môn thực hiện xóa đề gốc khi không còn sử dụng.

```plantuml
@startuml
title Biểu đồ hoạt động: Xóa đề gốc

|Giáo viên bộ môn|
start
:Truy cập phân hệ "Quản lý đề gốc";
:Chọn đề gốc cần xóa và nhấn "Xóa";

|Hệ thống|
:Hiển thị Popup yêu cầu xác nhận xóa;

|Giáo viên bộ môn|
if (Xác nhận đồng ý xóa?) then (Có)
  |Hệ thống|
  :Kiểm tra xem đề gốc đã được dùng để sinh gói đề nào chưa;
  if (Chưa được sử dụng?) then (Đúng)
    :Xóa đề gốc khỏi Database;
    :Hiển thị thông báo "Xóa đề gốc thành công";
  else (Sai)
    :Hiển thị thông báo lỗi "Không thể xóa đề gốc đã sử dụng trong gói đề";
  endif
else (Không)
  |Hệ thống|
  :Hủy bỏ yêu cầu xóa đề gốc;
endif

|Giáo viên bộ môn|
stop
@enduml
```

---

## 5. Biểu đồ Trạng thái (State Diagram)

**Mô tả:** Biểu đồ mô tả vòng đời trạng thái của một Đề gốc kể từ khi được khởi tạo tự động dưới dạng Nháp đến khi được Phê duyệt và chuyển tiếp cho các khâu tiếp theo.

```plantuml
@startuml
skinparam state {
  BackgroundColor LightBlue
  BorderColor Blue
}

[*] --> Nháp : Sinh đề gốc thành công

state Nháp {
}
state "Chờ duyệt" as ChoDuyet {
}
state "Đã duyệt" as DaDuyet {
}
state "Bị từ chối" as TuChoi {
}

Nháp --> ChoDuyet : Giáo viên Gửi duyệt
ChoDuyet --> DaDuyet : Tổ trưởng bộ môn Phê duyệt
ChoDuyet --> TuChoi : Tổ trưởng bộ môn Từ chối
TuChoi --> ChoDuyet : Giáo viên sửa và Gửi duyệt lại

TuChoi --> [*] : Xóa đề gốc
Nháp --> [*] : Xóa đề gốc
DaDuyet --> [*] : Sử dụng để sinh ra các "Gói đề"
@enduml
```
