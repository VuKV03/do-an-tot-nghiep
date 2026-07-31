# Phân tích thiết kế phân hệ Quản lý Đề gốc

## 1. Tác nhân (Actors)

Phân hệ Quản lý Đề gốc bao gồm 2 tác nhân chính tham gia:

- **Giáo viên / Người ra đề (Teacher)**: Là người thao tác chọn ma trận để sinh ra Đề gốc. Giáo viên có quyền xem trước, thay thế các câu hỏi không phù hợp và gửi đề gốc lên hệ thống để xin duyệt.
- **Quản trị viên / Trưởng bộ môn (Admin)**: Là người chịu trách nhiệm về chuyên môn, thực hiện việc kiểm duyệt nội dung của Đề gốc. Có quyền quyết định Phê duyệt (Approve) hoặc Từ chối (Reject) đề gốc.

## 2. Bảng mô tả Use Case chức năng

| Tên Use case                 | Tác nhân                    | Giao dịch                                                                                                                                                | Độ phức tạp |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Quản lý đề gốc** | Giáo viên, Quản trị viên |                                                                                                                                                           | Cao             |
|                               |                               | Giáo viên có thể yêu cầu hệ thống sinh đề gốc tự động. Hệ thống tạo đề gốc dựa trên thuật toán/AI và lưu vào cơ sở dữ liệu |                 |
|                               |                               | Giáo viên, Quản trị viên có thể xem chi tiết danh sách câu hỏi, đáp án của đề gốc. Hệ thống hiển thị chi tiết đề gốc            |                 |
|                               |                               | Giáo viên có thể thay thế câu hỏi trong đề gốc. Hệ thống cập nhật lại nội dung đề gốc trong cơ sở dữ liệu                          |                 |
|                               |                               | Giáo viên có thể gửi duyệt đề gốc. Hệ thống chuyển trạng thái đề sang chờ duyệt                                                         |                 |
|                               |                               | Quản trị viên có thể phê duyệt hoặc từ chối đề gốc. Hệ thống cập nhật trạng thái đề gốc tương ứng                                |                 |
|                               |                               | Giáo viên, Quản trị viên có thể xóa đề gốc (nếu chưa dùng sinh gói đề). Hệ thống xóa đề gốc khỏi cơ sở dữ liệu                |                 |

---

## 3. Biểu đồ Use Case (Use Case Diagram)

```plantuml
@startuml
title Biểu đồ Use Case: Quản lý đề gốc
left to right direction
skinparam packageStyle rectangle

actor "Giáo viên" as GV
actor "Quản trị viên" as QTV

rectangle "Quản lý Đề gốc" {
  usecase "Sinh đề gốc từ Ma trận" as UC1
  usecase "Xem chi tiết đề gốc" as UC2
  usecase "Thay thế câu hỏi" as UC3
  usecase "Gửi duyệt đề gốc" as UC4
  usecase "Phê duyệt/Từ chối đề gốc" as UC5
  usecase "Xóa đề gốc" as UC6
}

GV --> UC1
GV --> UC2
GV --> UC3
GV --> UC4
GV --> UC6

QTV --> UC2
QTV --> UC5
QTV --> UC6
@enduml
```

---

## 4. Biểu đồ Trình tự (Sequence Diagram)

Biểu đồ trình tự mô tả nghiệp vụ **Sinh đề gốc tự động và Thay thế câu hỏi thủ công**.

```plantuml
@startuml
actor "Giáo viên" as GV
boundary "Giao diện Đề gốc" as UI
control "Original Exam Controller" as OC
entity "AI Generation Service" as AIS
entity "Question Bank Service" as QBS
database "Cơ sở dữ liệu" as DB

== Sinh đề gốc từ Ma trận ==
GV -> UI : Chọn Ma trận và nhấn "Sinh đề gốc"
UI -> OC : Yêu cầu sinh đề gốc (matrixId)
activate OC
OC -> AIS : generateOriginalExam(matrixId)
activate AIS
AIS -> DB : Lấy các ràng buộc từ Ma trận
AIS -> QBS : Truy xuất danh sách câu hỏi phù hợp
QBS --> AIS : Trả về tập câu hỏi ngẫu nhiên
AIS -> DB : Lưu Đề gốc mới (trạng thái: Nháp)
DB --> AIS : Thành công
AIS --> OC : Kết quả sinh đề gốc
deactivate AIS
OC --> UI : Phản hồi dữ liệu đề gốc
deactivate OC
UI --> GV : Hiển thị đề gốc vừa tạo

== Thay thế câu hỏi trong Đề gốc ==
GV -> UI : Nhấn "Thay thế" tại một câu hỏi chưa ưng ý
UI -> QBS : Lấy danh sách câu hỏi tương đương (theo độ khó/chủ đề)
QBS -> DB : Truy vấn CSDL
DB --> QBS : Danh sách câu hỏi
QBS --> UI : Hiển thị danh sách câu hỏi thay thế
GV -> UI : Chọn câu hỏi mới và xác nhận
UI -> OC : Gửi yêu cầu cập nhật (examId, oldQuestionId, newQuestionId)
activate OC
OC -> DB : Cập nhật lại câu hỏi trong Đề gốc
DB --> OC : Cập nhật thành công
OC --> UI : Cập nhật lại giao diện
deactivate OC
UI --> GV : Hiển thị đề gốc sau chỉnh sửa
@enduml
```

---

## 5. Biểu đồ Hoạt động (Activity Diagram)

Biểu đồ mô tả quy trình luân chuyển từ khi sinh đề gốc đến khi được Quản trị viên phê duyệt.

```plantuml
@startuml
|Giáo viên|
start
:Chọn Ma trận đề thi;
:Yêu cầu hệ thống sinh đề gốc;

|Hệ thống|
:Dùng AI/Thuật toán bốc câu hỏi;
:Tạo Đề gốc mới (Trạng thái: Nháp);
:Hiển thị chi tiết Đề gốc;

|Giáo viên|
:Xem trước Đề gốc;
if (Nội dung đề hợp lý?) then (Không)
  :Tìm và thay thế câu hỏi thủ công;
  |Hệ thống|
  :Cập nhật nội dung Đề gốc;
  |Giáo viên|
else (Có)
endif
:Nhấn nút "Gửi duyệt";

|Hệ thống|
:Cập nhật trạng thái thành "Chờ duyệt";
:Gửi thông báo đến Quản trị viên;

|Quản trị viên|
:Xem chi tiết Đề gốc;
:Kiểm duyệt nội dung chuyên môn;
if (Đạt yêu cầu?) then (Không đạt)
  :Nhập lý do từ chối;
  :Nhấn "Từ chối";
  |Hệ thống|
  :Cập nhật trạng thái "Bị từ chối";
  |Giáo viên|
  :Nhận thông báo & Vào chỉnh sửa lại;
  detach
else (Đạt)
  |Quản trị viên|
  :Nhấn "Phê duyệt";
  |Hệ thống|
  :Cập nhật trạng thái "Đã duyệt";
endif

|Quản trị viên|
stop
@enduml
```

---

## 6. Biểu đồ Trạng thái (State Diagram)

Biểu đồ mô tả vòng đời của một Đề gốc từ khi được sinh ra.

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
ChoDuyet --> DaDuyet : Quản trị viên Phê duyệt
ChoDuyet --> TuChoi : Quản trị viên Từ chối
TuChoi --> ChoDuyet : Giáo viên sửa và Gửi duyệt lại

TuChoi --> [*] : Xóa đề gốc
Nháp --> [*] : Xóa đề gốc
DaDuyet --> [*] : Sử dụng để sinh ra các "Gói đề"
@enduml
```
