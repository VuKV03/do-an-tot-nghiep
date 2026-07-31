# Phân tích thiết kế phân hệ Thi Trực Tuyến

## 1. Tác nhân (Actors)

Trong phân hệ Thi Trực Tuyến, có 2 tác nhân chính tham gia:

- **Thí sinh (Candidate)**: Người trực tiếp tham gia làm bài thi trên hệ thống, thực hiện các thao tác đăng nhập, chọn đáp án và nộp bài.
- **Hệ thống (System)**: Tác nhân tự động thực hiện các tác vụ ngầm như đếm ngược thời gian, lưu tiến độ, tự động nộp bài khi hết giờ và tự động chấm điểm.

## 2. Bảng mô tả Use Case chức năng

Bảng dưới đây liệt kê các chức năng chính của phân hệ Thi Trực Tuyến:

| Tên Use case              | Tác nhân            | Giao dịch                                                                                                                          | Độ phức tạp |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Thi trực tuyến** | Thí sinh, Hệ thống |                                                                                                                                     | Cao             |
|                            |                       | Thí sinh có thể đăng nhập vào phòng thi thông qua Mã đề thi và Số báo danh (SBD). Hệ thống kiểm tra thông tin    |                 |
|                            |                       | Thí sinh có thể xem các thông tin tổng quan trước khi bắt đầu. Hệ thống hiển thị thời gian, số câu hỏi, quy chế |                 |
|                            |                       | Thí sinh có thể tương tác với đề thi (chọn đáp án, chuyển câu hỏi). Hệ thống ghi nhận thao tác                  |                 |
|                            |                       | Hệ thống tự động lưu tiến độ (đáp án thí sinh đã chọn) trong suốt quá trình làm bài                            |                 |
|                            |                       | Thí sinh có thể chủ động nộp bài khi hoàn thành. Hệ thống xác nhận và thu bài                                       |                 |
|                            |                       | Hệ thống tự động thu bài và khóa quyền chỉnh sửa khi đồng hồ đếm ngược kết thúc                                 |                 |
|                            |                       | Hệ thống tự động chấm điểm bài thi bằng cách so khớp đáp án của thí sinh với đáp án gốc                       |                 |
|                            |                       | Thí sinh có thể xem điểm số tổng, số câu đúng/sai. Hệ thống hiển thị kết quả sau khi chấm xong                    |                 |

---

## 3. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ thể hiện sự tương tác tổng thể giữa Thí sinh và Hệ thống đối với các chức năng trong phân hệ thi trực tuyến. Các chức năng chính bao gồm việc đăng nhập phòng thi, làm bài, nộp bài, và việc hệ thống tự động xử lý ngầm (lưu tiến độ, tự động khóa nộp bài và tự động chấm điểm).

**Mục tiêu:** Cung cấp cái nhìn bao quát về vai trò của từng tác nhân, quyền hạn và các hành động mà tác nhân có thể thực hiện, qua đó định hình rõ phạm vi chức năng của toàn bộ quy trình làm bài thi.

```plantuml
@startuml
title Biểu đồ Use Case: Hệ thống thi trực tuyến
left to right direction
skinparam packageStyle rectangle

actor "Thí sinh" as TS
actor "Hệ thống" as HT

rectangle "Chức năng: Hệ thống Thi Trực Tuyến" {
  usecase "Đăng nhập phòng thi" as UC1
  usecase "Xem thông tin & Bắt đầu thi" as UC2
  usecase "Làm bài thi" as UC3
  usecase "Nộp bài thi" as UC4
  usecase "Lưu tiến độ" as UC5
  usecase "Tự động nộp bài" as UC6
  usecase "Chấm điểm tự động" as UC7
  usecase "Xem kết quả thi" as UC8

  UC1 .> UC2 : <<include>>
  UC3 .> UC5 : <<include>>
  UC4 .> UC7 : <<include>>
  UC6 .> UC7 : <<include>>
}

TS --> UC1
TS --> UC2
TS --> UC3
TS --> UC4
TS --> UC8

HT --> UC5
HT --> UC6
HT --> UC7

@enduml
```

---

## 4. Biểu đồ Trình tự (Sequence Diagram)

Dưới đây là biểu đồ trình tự mô tả luồng nghiệp vụ quan trọng nhất: **Nộp bài và Chấm điểm tự động**.

**Mô tả:** Biểu đồ mô phỏng dòng thời gian và tuần tự lời gọi hàm khi Thí sinh thực hiện thao tác nộp bài. Lớp Giao diện gửi yêu cầu xuống Controller và Service để lưu trạng thái hoàn thành. Ngay sau đó, tiến trình chấm điểm tự động (`autoGrade()`) được kích hoạt: đối chiếu đáp án với cơ sở dữ liệu, tính điểm và lưu kết quả trước khi phản hồi điểm số trực tiếp lên màn hình cho Thí sinh.

**Mục tiêu:** Làm rõ thứ tự giao tiếp giữa các thành phần phần mềm (UI, Controller, Service, Database), đảm bảo khâu tiếp nhận bài thi và xử lý điểm tự động hoạt động chính xác, đồng bộ, và minh bạch.

```plantuml
@startuml
actor "Thí sinh" as TS
boundary "Giao diện Thi" as UI
control "Exam Controller" as EC
entity "Exam Submission Service" as ESS
database "Cơ sở dữ liệu" as DB

TS -> UI : Nhấn nút "Nộp bài"
UI -> TS : Hiển thị popup xác nhận nộp bài
TS -> UI : Bấm "Đồng ý"
UI -> EC : Gửi yêu cầu nộp bài (submit_exam)
EC -> ESS : Gọi hàm xử lý nộp bài
ESS -> DB : Cập nhật trạng thái bài làm (Đã nộp)

activate ESS
ESS -> ESS : autoGrade() - Chấm điểm tự động
ESS -> DB : Truy xuất đáp án gốc của đề thi
DB --> ESS : Trả về đáp án
ESS -> ESS : Đối chiếu đáp án của thí sinh tính số câu đúng
ESS -> DB : Cập nhật điểm số và chi tiết kết quả vào DB
deactivate ESS

DB --> ESS : Xác nhận lưu thành công
ESS --> EC : Trả về kết quả thi (Điểm số)
EC --> UI : Cập nhật giao diện hoàn thành
UI --> TS : Hiển thị màn hình Kết quả thi chi tiết

@enduml
```

---

## 5. Biểu đồ Hoạt động (Activity Diagram)

Biểu đồ mô tả toàn bộ quy trình từ lúc thí sinh đăng nhập đến khi nhận được kết quả.

```plantuml
@startuml
|Thí sinh|
start
:Nhập Mã đề thi và SBD;
:Nhấn nút Đăng nhập;

|Hệ thống|
:Kiểm tra thông tin đăng nhập;
if (Thông tin hợp lệ?) then (Sai)
  :Hiển thị thông báo lỗi;
  |Thí sinh|
  stop
else (Đúng)
  |Hệ thống|
  :Hiển thị thông tin đề thi & quy chế;
endif

|Thí sinh|
:Nhấn "Bắt đầu làm bài";

|Hệ thống|
:Khởi tạo phiên thi & Bắt đầu đếm ngược;

|Thí sinh|
repeat
  :Đọc câu hỏi và chọn đáp án;
  |Hệ thống|
  :Lưu tiến độ làm bài tạm thời (Auto-save);
  |Thí sinh|
repeat while (Còn thời gian và chưa bấm Nộp bài?) is (Tiếp tục làm)

|Hệ thống|
if (Hết thời gian?) then (Có)
  :Tự động khóa bài & Nộp bài;
else (Không)
  |Thí sinh|
  :Nhấn "Nộp bài";
  :Xác nhận nộp bài trên popup;
  |Hệ thống|
  :Tiếp nhận yêu cầu nộp;
endif

|Hệ thống|
:Đóng phiên thi (Kết thúc đếm ngược);
:Thực thi Chấm điểm tự động (Auto-grade);
:Lưu điểm số vào Cơ sở dữ liệu;
:Hiển thị màn hình kết quả cho Thí sinh;

|Thí sinh|
:Xem điểm, số câu đúng/sai;
stop
@enduml
```

---

## 6. Biểu đồ Trạng thái (State Diagram)

Biểu đồ mô tả vòng đời (các trạng thái) của một bài thi trực tuyến từ lúc thí sinh bắt đầu đến khi có kết quả.

```plantuml
@startuml
skinparam state {
  BackgroundColor LightBlue
  BorderColor Blue
}

[*] --> ChuaLam : Thí sinh truy cập phòng thi

state "Chưa làm" as ChuaLam {
}
state "Đang làm" as DangLam {
}
state "Đã nộp" as DaNop {
}
state "Hoàn thành" as HoanThanh {
}

ChuaLam --> DangLam : Thí sinh nhấn "Bắt đầu làm bài"
DangLam --> DangLam : Hệ thống lưu tiến độ định kỳ
DangLam --> DaNop : Thí sinh xác nhận Nộp bài
DangLam --> DaNop : Hết thời gian (Tự động khóa & nộp)
DaNop --> HoanThanh : Hệ thống chấm điểm tự động thành công

HoanThanh --> [*] : Lưu kết quả và kết thúc
@enduml
```
