# Tài liệu Đặc tả: Thống kê Ngân hàng Câu hỏi (Question Bank Analytics)

## 1. Bảng Use Case chức năng

*Bảng 2.13. Bảng usecase chức năng thống kê ngân hàng câu hỏi*

| Tên Use case           | Tác nhân                    | Giao dịch                                                                                                              | Độ phức tạp |
| :---------------------- | :---------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Thống kê ngân hàng câu hỏi** | **Giáo viên bộ môn (GVBM)**   |                                                                                                                         | Trung bình      |
|                         |                               | Giáo viên bộ môn chọn bộ lọc Môn học/Khối lớp được phân công giảng dạy. Hệ thống tải dữ liệu thống kê.                  |                 |
|                         |                               | Hệ thống tính toán và hiển thị số lượng câu hỏi phân bổ theo từng Chủ đề, Cấp độ tư duy và Loại câu hỏi dưới dạng biểu đồ. |                 |
|                         | **Tổ trưởng bộ môn (TTBM)**   |                                                                                                                         | Trung bình      |
|                         |                               | Tổ trưởng bộ môn chọn bộ lọc các Môn học thuộc phạm vi tổ chuyên môn quản lý. Hệ thống tải dữ liệu thống kê.            |                 |
|                         |                               | Hệ thống tính toán và hiển thị số lượng câu hỏi phân bổ theo từng Chủ đề, Cấp độ tư duy và Loại câu hỏi dưới dạng biểu đồ. |                 |

---

## 2. Biểu đồ Use Case (Use Case Diagram)

**Mô tả:** Biểu đồ mô tả tương tác của Giáo viên bộ môn (GVBM) và Tổ trưởng bộ môn (TTBM) với chức năng thống kê ngân hàng câu hỏi. Người dùng có thể lọc thống kê theo môn học, xem biểu đồ phân bố câu hỏi theo chủ đề, cấp độ tư duy và loại câu hỏi.

**Mục tiêu:** Cung cấp cái nhìn tổng quan về cơ cấu phân bổ câu hỏi trong ngân hàng câu hỏi, hỗ trợ cán bộ chuyên môn đánh giá độ phủ và chất lượng của câu hỏi trước khi sinh đề.

```plantuml
@startuml
title Biểu đồ Use Case: Thống kê ngân hàng câu hỏi

left to right direction
skinparam packageStyle rectangle

actor "Giáo viên bộ môn" as GVBM
actor "Tổ trưởng bộ môn" as TTBM

rectangle "Phân hệ: Thống kê ngân hàng câu hỏi" {
  usecase "Thống kê ngân hàng câu hỏi" as MainUC
  usecase "Lọc thống kê theo Môn học / Khối lớp" as UC_Loc
  usecase "Xem biểu đồ phổ câu hỏi theo Chủ đề" as UC_BieuDoTopic
  usecase "Xem thống kê theo Cấp độ tư duy" as UC_BieuDoLevel
  usecase "Xem thống kê theo Loại câu hỏi / Trạng thái" as UC_BieuDoType
  
  UC_Loc ..> MainUC : <<extend>>
  UC_BieuDoTopic ..> MainUC : <<extend>>
  UC_BieuDoLevel ..> MainUC : <<extend>>
  UC_BieuDoType ..> MainUC : <<extend>>
}

GVBM --> MainUC
TTBM --> MainUC

note bottom of MainUC
  * Giáo viên bộ môn: Xem thống kê câu hỏi môn phụ trách.
  * Tổ trưởng bộ môn: Xem thống kê toàn bộ các môn thuộc tổ bộ môn quản lý.
end note
@enduml
```

---

## 3. Biểu đồ Trình tự chức năng (Sequence Diagram)

**Mô tả:** Biểu đồ trình tự thể hiện sự tương tác từ giao diện người dùng đến API nghiệp vụ của dự án (`GET /api/bank-questions/count-by-topic`). Hệ thống sẽ đếm số lượng câu hỏi trong CSDL đã duyệt (status = 2) theo từng nhóm: chủ đề, cấp độ nhận thức, loại câu hỏi và thành phần năng lực để trả về vẽ biểu đồ.

```plantuml
@startuml
title Biểu đồ trình tự: Thống kê ngân hàng câu hỏi

actor "GVBM / TTBM" as User
participant "Giao diện Thống kê NHCH\n(Stats View)" as View
participant "QuestionService\n(API Xử lý)" as Service
database "Database\n(Questions)" as DB

User -> View : Truy cập phân hệ "Thống kê NHCH" và chọn Môn học / Khối lớp
View -> Service : GET /api/bank-questions/count-by-topic?topic_ids={ids}&status=2
activate Service

Service -> DB : Đếm số câu hỏi (status=2) gom nhóm theo topic_id, level_id, type_id, competency_component_id
activate DB
DB --> Service : Trả về số liệu thống kê (JSON)
deactivate DB

Service --> View : Phản hồi danh sách số liệu thống kê (JSON)
deactivate Service

View -> View : Xử lý dữ liệu và vẽ các biểu đồ:\n- Biểu đồ cột phân bố theo chủ đề\n- Biểu đồ tròn tỷ lệ cấp độ tư duy\n- Biểu đồ tỷ lệ loại câu hỏi
View --> User : Hiển thị các biểu đồ thống kê trực quan
@enduml
```

---

## 4. Biểu đồ Hoạt động (Activity Diagram)

**Mô tả:** Biểu đồ hoạt động mô tả tiến trình người dùng chọn môn học/khối lớp cần thống kê, hệ thống tiếp nhận, truy vấn dữ liệu đếm số câu hỏi và kết xuất biểu đồ hiển thị lên màn hình.

```plantuml
@startuml
title Biểu đồ hoạt động: Thống kê ngân hàng câu hỏi

|GVBM / TTBM|
start
:Truy cập phân hệ "Thống kê ngân hàng câu hỏi";
:Chọn bộ lọc Môn học, Khối lớp cần thống kê;

|Hệ thống|
:Gửi yêu cầu lấy số liệu thống kê theo bộ lọc;
:Truy vấn cơ sở dữ liệu (đếm câu hỏi theo chủ đề, mức độ, loại câu hỏi);
:Trả về kết quả dữ liệu thống kê dạng JSON;
:Tính toán tỉ lệ và vẽ các biểu đồ trực quan;
:Hiển thị biểu đồ thống kê lên màn hình;

|GVBM / TTBM|
:Xem và phân tích số liệu phân bố câu hỏi;
stop
@enduml
```
