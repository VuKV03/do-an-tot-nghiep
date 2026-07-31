# TÀI LIỆU MÔ TẢ CHI TIẾT USE CASE (2.3.13 - 2.3.16)

Dưới đây là tài liệu đã được cập nhật lại theo yêu cầu:

1. **Loại bỏ hoàn toàn luồng Import Excel** trong Use Case Quản lý thí sinh (thay thế bằng thêm mới thủ công).
2. **Khắc phục lỗi hiển thị/render (cú pháp)** ở tất cả các biểu đồ Hoạt động (Activity Diagram) thông qua việc cấu trúc lại khối `subgraph` một cách chính xác nhất.

---

## 2.3.13. Usecase Quản lý gói đề

### Bảng 2.13. Bảng usecase chức năng quản lý gói đề

| Tên Use case                 | Tác nhân     | Giao dịch                                                                                                       | Độ phức tạp |
| :---------------------------- | :------------- | :--------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý gói đề** | **GVBM** |                                                                                                                  | Phức tạp      |
|                               |                | Giáo viên bộ môn có thể thêm mới gói đề từ các đề gốc. Hệ thống thêm mới gói đề.          |                 |
|                               |                | Giáo viên bộ môn có thể cập nhật thông tin gói đề. Hệ thống sửa thông tin gói đề.             |                 |
|                               |                | Giáo viên bộ môn có thể xem danh sách gói đề. Hệ thống hiển thị danh sách gói đề.              |                 |
|                               |                | Giáo viên bộ môn có thể xóa gói đề. Hệ thống xóa gói đề.                                         |                 |
|                               |                | Giáo viên bộ môn gửi thẩm định gói đề. Hệ thống cập nhật trạng thái chờ duyệt.                |                 |
|                               | **TTBM** |                                                                                                                  | Phức tạp      |
|                               |                | Tổ trưởng bộ môn xem danh sách các gói đề cần thẩm định. Hệ thống hiển thị danh sách.         |                 |
|                               |                | Tổ trưởng bộ môn thực hiện thẩm định/Phê duyệt gói đề. Hệ thống cập nhật trạng thái duyệt. |                 |
|                               |                | Tổ trưởng bộ môn thực hiện từ chối thẩm định. Hệ thống cập nhật trạng thái từ chối.          |                 |
|                               | **TPGV** |                                                                                                                  | Cơ bản        |
|                               |                | Trưởng phòng giáo vụ xem danh sách các gói đề đã thẩm định. Hệ thống hiển thị danh sách.     |                 |
|                               |                | Trưởng phòng giáo vụ chọn gói đề cần xuất. Hệ thống hiển thị chi tiết gói đề.                 |                 |
|                               |                | Trưởng phòng giáo vụ xuất file Word. Hệ thống tạo và xuất file Word cho phép tải về.               |                 |

### Biểu đồ Use Case: Quản lý gói đề

```mermaid
flowchart LR
    classDef actor fill:none,stroke:#333,stroke-width:2px,color:#333;
    classDef usecase fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#000;
    classDef note fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,color:#000,text-align:left;

    GV["👤 Giáo viên bộ môn"]:::actor
    TT["👤 Tổ trưởng bộ môn"]:::actor
    TP["👤 Trưởng phòng giáo vụ"]:::actor

    subgraph System [Chức năng: Quản lý gói đề]
        direction LR
        Main(["Quản lý gói đề"]):::usecase
      
        U1(["Xuất gói đề"]):::usecase
        U2(["Thẩm định gói đề"]):::usecase
        U3(["Gửi thẩm định gói đề"]):::usecase
        U4(["Xem / Tìm kiếm danh sách gói đề"]):::usecase
        U5(["Xóa gói đề"]):::usecase
        U6(["Cập nhật gói đề"]):::usecase
        U7(["Thêm mới gói đề"]):::usecase

        Main -- "«extend»" --> U1
        Main -- "«extend»" --> U2
        Main -- "«extend»" --> U3
        Main -- "«extend»" --> U4
        Main -- "«extend»" --> U5
        Main -- "«extend»" --> U6
        Main -- "«extend»" --> U7
      
        Note["• Giáo viên bộ môn: Thực hiện CRUD, gửi thẩm định gói đề<br>• Tổ trưởng bộ môn: Thẩm định, duyệt hoặc từ chối gói đề<br>• Trường phòng giáo vụ: Theo dõi, xuất gói đề toàn cục<br>• Tất cả thao tác đều được ghi log trong hệ thống"]:::note
        Main -.- Note
    end

    GV --> Main
    TT --> Main
    TP --> Main
```

### Biểu đồ Trình tự: Thêm mới gói đề

```mermaid
sequenceDiagram
    actor GV as Giáo viên bộ môn
    participant UI as Giao diện danh sách gói đề<br>(Package List View)
    participant Form as Form thêm mới gói đề<br>(Package Form)
    participant Svc as PackageService<br>(Xử lý nghiệp vụ)
    participant DB as Database<br>(Packages)

    Note over GV,DB: [Khởi tạo thêm mới]
    GV->>UI: Chọn "Thêm mới gói đề"
    UI->>Form: Hiển thị form nhập thông tin gói đề
  
    Note over GV,DB: [Chọn đề gốc & nhập thông tin]
    GV->>Form: Nhập thông tin & chọn các đề gốc cần gộp
    Form->>Svc: Yêu cầu lấy thông tin chi tiết các đề gốc
    Svc->>DB: Truy vấn thông tin các đề gốc
    DB-->>Svc: Trả dữ liệu đề gốc
    Svc-->>Form: Trả cấu trúc thông tin đề gốc hợp lệ

    Note over GV,DB: [Xác nhận lưu]
    GV->>Form: Nhấn "Lưu gói đề"
    Form->>Svc: Gửi dữ liệu gói đề và danh sách đề gốc
    Svc->>DB: Lưu thông tin gói đề và liên kết vào CSDL
    DB-->>Svc: Phản hồi kết quả lưu thành công
  
    Note over GV,DB: [Hoàn tất]
    Svc-->>Form: Trả thông báo "Lưu gói đề thành công"
    Form-->>UI: Hiển thị thông báo kết quả
    UI-->>GV: Thông báo "Thêm mới gói đề thành công"
  
    Note over GV,DB: [Ghi chú]<br>- Gói đề bao gồm nhiều đề gốc.<br>- Các đề gốc phải cùng môn học và đã được duyệt.<br>- Chỉ giáo viên được phân quyền mới có thể tạo gói.
```

### Biểu đồ Hoạt động: Thêm mới gói đề

```mermaid
flowchart TD
    classDef startend fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#fff,stroke:#333,stroke-width:1px,rx:10px,ry:10px;
    classDef decision fill:#fff,stroke:#333,stroke-width:1px,shape:diamond;

    subgraph GVBM [Giáo viên bộ môn]
        direction TB
        Start((( )))
        A([Truy cập chức năng 'Quản lý gói đề'])
        B([Chọn 'Thêm mới gói đề'])
        D([Nhập thông tin tên gói, chọn các đề gốc tạo thành gói])
        E([Kiểm tra lại nội dung gói đề])
        F([Nhấn 'Lưu gói đề'])
        L([Quan sát thông báo kết quả])
        End((( )))
    end

    subgraph System [Hệ thống]
        direction TB
        C([Hiển thị form nhập thông tin gói đề])
        G{Kiểm tra dữ liệu<br>hợp lệ?}
        H([Hiển thị thông báo: 'Thiếu hoặc sai thông tin'])
        I([Lưu gói đề vào CSDL])
        K([Hiển thị thông báo 'Thêm mới gói đề thành công'])
    end

    Start --> A
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G -- Không --> H
    H --> D
    G -- Có --> I
    I --> K
    K --> L
    L --> End

    class Start,End startend;
    class A,B,C,D,E,F,H,I,K,L action;
    class G decision;
```

---

## 2.3.14. Usecase Quản lý thí sinh

### Bảng 2.14. Bảng usecase chức năng quản lý thí sinh

| Tên Use case                 | Tác nhân             | Giao dịch                                                                                                         | Độ phức tạp |
| :---------------------------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------- | :-------------- |
| **Quản lý thí sinh** | **TPGV / Admin** |                                                                                                                    | Phức tạp      |
|                               |                        | Cán bộ phụ trách có thể thêm mới thí sinh thủ công. Hệ thống hiển thị form và lưu thí sinh mới. |                 |
|                               |                        | Cán bộ phụ trách có thể sửa thông tin thí sinh. Hệ thống cập nhật thông tin vào CSDL.               |                 |
|                               |                        | Cán bộ phụ trách có thể xem danh sách thí sinh. Hệ thống hiển thị bảng danh sách.                    |                 |
|                               |                        | Cán bộ phụ trách có thể xóa thí sinh. Hệ thống xóa thông tin thí sinh.                                |                 |
|                               |                        | Cán bộ phụ trách có thể tìm kiếm thí sinh. Hệ thống lọc và trả về kết quả tương ứng.           |                 |

### Biểu đồ Use Case: Quản lý thí sinh

```mermaid
flowchart LR
    classDef actor fill:none,stroke:#333,stroke-width:2px,color:#333;
    classDef usecase fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#000;
    classDef note fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,color:#000,text-align:left;

    PGV["👤 Giáo vụ / Admin"]:::actor

    subgraph System [Chức năng: Quản lý thí sinh]
        direction LR
        Main(["Quản lý thí sinh"]):::usecase
      
        U1(["Tìm kiếm/Lọc thí sinh"]):::usecase
        U2(["Xóa thí sinh"]):::usecase
        U3(["Cập nhật thông tin"]):::usecase
        U5(["Thêm mới thí sinh"]):::usecase

        Main -- "«extend»" --> U1
        Main -- "«extend»" --> U2
        Main -- "«extend»" --> U3
        Main -- "«extend»" --> U5
      
        Note["• Giáo vụ/Admin: Thực hiện Thêm mới, Sửa, Xóa, Lọc danh sách thí sinh<br• Tất cả thao tác quản lý đều được ghi log truy vết trong hệ thống"]:::note
        Main -.- Note
    end

    PGV --> Main
```

### Biểu đồ Trình tự: Thêm mới thí sinh thủ công

```mermaid
sequenceDiagram
    actor GVU as Giáo vụ / Admin
    participant UI as Giao diện danh sách<br>(Candidate List)
    participant Form as Form nhập liệu<br>(Candidate Form)
    participant Svc as CandidateService<br>(Xử lý nghiệp vụ)
    participant DB as Database<br>(Candidates)

    Note over GVU,DB: [Khởi tạo thêm mới]
    GVU->>UI: Chọn chức năng "Thêm mới thí sinh"
    UI->>Form: Hiển thị form điền thông tin (Tên, SBD, Email...)
    GVU->>Form: Nhập đầy đủ thông tin thí sinh
  
    Note over GVU,DB: [Kiểm tra dữ liệu]
    Form->>Form: Validate định dạng dữ liệu (Client-side)
    GVU->>Form: Nhấn "Lưu thí sinh"
    Form->>Svc: Gửi yêu cầu lưu thông tin
    Svc->>DB: Truy vấn kiểm tra trùng lặp SBD/CCCD/Email
    DB-->>Svc: Phản hồi kết quả kiểm tra
  
    alt Có trùng lặp dữ liệu
        Svc-->>Form: Trả về lỗi trùng lặp dữ liệu hệ thống
        Form-->>GVU: Cảnh báo lỗi tương ứng ngay trên form
    else Dữ liệu hợp lệ
        Note over GVU,DB: [Xác nhận lưu]
        Svc->>DB: Insert thông tin thí sinh mới vào CSDL
        DB-->>Svc: Phản hồi kết quả insert thành công
      
        Note over GVU,DB: [Hoàn tất]
        Svc-->>Form: Trả thông báo "Thêm mới thành công"
        Form-->>UI: Đóng Form & yêu cầu làm mới danh sách
        UI-->>GVU: Hiển thị Toast thông báo thành công
    end
```

### Biểu đồ Hoạt động: Thêm mới thí sinh thủ công

```mermaid
flowchart TD
    classDef startend fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#fff,stroke:#333,stroke-width:1px,rx:10px,ry:10px;
    classDef decision fill:#fff,stroke:#333,stroke-width:1px,shape:diamond;

    subgraph GVU [Giáo vụ / Admin]
        direction TB
        Start((( )))
        A([Truy cập chức năng 'Quản lý thí sinh'])
        B([Chọn 'Thêm mới thí sinh'])
        D([Nhập thông tin thí sinh trên Form])
        F([Nhấn nút 'Lưu'])
        L([Quan sát thông báo kết quả & làm mới danh sách])
        End((( )))
    end

    subgraph System [Hệ thống]
        direction TB
        C([Hiển thị Form thêm mới thí sinh])
        E([Validate định dạng dữ liệu Email, SĐT...])
        G{Kiểm tra trùng<br>SBD/CCCD/Email?}
        H([Hiển thị thông báo lỗi trùng lặp hoặc sai định dạng])
        I([Lưu thông tin thí sinh vào CSDL])
        K([Hiển thị thông báo 'Thêm mới thành công'])
    end

    Start --> A
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G -- Bị trùng --> H
    H --> D
    G -- Hợp lệ --> I
    I --> K
    K --> L
    L --> End

    class Start,End startend;
    class A,B,C,D,E,F,H,I,K,L action;
    class G decision;
```

---

## 2.3.15 Usecase Quản lý kết quả thi

### Bảng 2.15. Bảng usecase chức năng quản lý kết quả thi

| Tên Use case                     | Tác nhân            | Giao dịch                                                                                                    | Độ phức tạp |
| :-------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------ | :-------------- |
| **Quản lý kết quả thi** | **GVBM / TPGV** |                                                                                                               | Cơ bản        |
|                                   |                       | Cán bộ phụ trách có thể xem danh sách kết quả kỳ thi. Hệ thống hiển thị bảng điểm.           |                 |
|                                   |                       | Cán bộ phụ trách có thể xem chi tiết bài làm của thí sinh. Hệ thống mở form chi tiết bài thi. |                 |
|                                   |                       | Cán bộ phụ trách có thể xem biểu đồ thống kê kết quả. Hệ thống render biểu đồ phổ điểm.  |                 |
|                                   |                       | Cán bộ phụ trách có thể xuất bảng điểm ra Excel. Hệ thống tạo và tải file báo cáo Excel.     |                 |

### Biểu đồ Use Case: Quản lý kết quả thi

```mermaid
flowchart LR
    classDef actor fill:none,stroke:#333,stroke-width:2px,color:#333;
    classDef usecase fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#000;
    classDef note fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,color:#000,text-align:left;

    GV["👤 Giáo viên bộ môn"]:::actor
    TP["👤 Trưởng phòng giáo vụ"]:::actor

    subgraph System [Chức năng: Quản lý kết quả thi]
        direction LR
        Main(["Xem kết quả kỳ thi"]):::usecase
      
        U1(["Xuất bảng điểm (Excel)"]):::usecase
        U2(["Xem chi tiết bài làm"]):::usecase
        U3(["Xem biểu đồ thống kê"]):::usecase

        Main -- "«extend»" --> U1
        Main -- "«extend»" --> U2
        Main -- "«extend»" --> U3
      
        Note["• Giáo viên/Giáo vụ: Truy cập kết quả các kỳ thi được phân quyền quản lý<br>• Chức năng xuất điểm: Xuất dưới định dạng chuẩn Excel<br>• Chi tiết bài làm: Hiện rõ câu đúng/sai và lịch sử đáp án đã chọn"]:::note
        Main -.- Note
    end

    GV --> Main
    TP --> Main
```

### Biểu đồ Trình tự: Xem chi tiết bài làm

```mermaid
sequenceDiagram
    actor GV as Giáo viên / Giáo vụ
    participant UI as Giao diện kết quả thi<br>(Result View)
    participant Modal as Popup chi tiết bài thi<br>(Result Modal)
    participant Svc as ResultService<br>(Xử lý nghiệp vụ điểm)
    participant DB as Database<br>(ExamResults, Answers)

    Note over GV,DB: [Khởi tạo xem chi tiết]
    GV->>UI: Click chọn nút "Chi tiết" tại một thí sinh
    UI->>Svc: Gửi yêu cầu lấy chi tiết bài làm (Attempt ID)
  
    Note over GV,DB: [Truy xuất dữ liệu]
    Svc->>DB: Truy vấn dữ liệu câu trả lời của thí sinh (selected_answers)
    DB-->>Svc: Trả về dữ liệu bài làm
    Svc->>DB: Truy vấn đáp án đúng từ ngân hàng câu hỏi gốc
    DB-->>Svc: Trả về danh sách đáp án đúng (correct_answers)
  
    Note over GV,DB: [Xử lý và hiển thị]
    Svc->>Svc: Đối chiếu logic, map câu hỏi và đánh dấu đúng/sai
    Svc-->>Modal: Trả về cấu trúc dữ liệu JSON bài làm hoàn chỉnh
    Modal->>UI: Dựng giao diện Modal (Tô xanh/đỏ cho các câu hỏi)
  
    Note over GV,DB: [Hoàn tất]
    UI-->>GV: Hiển thị màn hình chi tiết bài làm cho phép xem lại
```

### Biểu đồ Hoạt động: Xem chi tiết bài làm

```mermaid
flowchart TD
    classDef startend fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#fff,stroke:#333,stroke-width:1px,rx:10px,ry:10px;

    subgraph User [Giáo viên / Giáo vụ]
        direction TB
        Start((( )))
        A([Truy cập chức năng 'Quản lý kết quả thi'])
        B([Chọn một kỳ thi cần xem kết quả])
        D([Nhấn nút 'Chi tiết' tại dòng thí sinh cần kiểm tra])
        G([Xem nội dung bài làm])
        H([Đóng Modal])
        End((( )))
    end

    subgraph System [Hệ thống]
        direction TB
        C([Truy xuất CSDL & hiển thị danh sách điểm số])
        E([Truy vấn chi tiết đáp án của thí sinh và đáp án gốc])
        F([Đối chiếu và hiển thị Modal bài làm chi tiết])
    end

    Start --> A
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> End

    class Start,End startend;
    class A,B,C,D,E,F,G,H action;
```

---

## 2.3.16 Usecase Thi trực tuyến

### Bảng 2.16. Bảng usecase chức năng thi trực tuyến

| Tên Use case              | Tác nhân   | Giao dịch                                                                                            | Độ phức tạp |
| :------------------------- | :----------- | :---------------------------------------------------------------------------------------------------- | :-------------- |
| **Thi trực tuyến** | **TS** |                                                                                                       | Phức tạp      |
|                            |              | Thí sinh thực hiện đăng nhập vào cổng thi. Hệ thống xác thực mã truy cập.               |                 |
|                            |              | Thí sinh chọn "Bắt đầu làm bài". Hệ thống sinh đề, bắt đầu tính giờ làm bài.        |                 |
|                            |              | Thí sinh chọn đáp án. Hệ thống tự động lưu nháp dữ liệu lên máy chủ.                 |                 |
|                            |              | Thí sinh chọn "Nộp bài". Hệ thống đối chiếu kết quả, tính điểm và lưu lại.           |                 |
|                            |              | Thí sinh chọn "Xem kết quả". Hệ thống hiển thị điểm ngay sau khi nộp (nếu được phép). |                 |

### Biểu đồ Use Case: Thi trực tuyến

```mermaid
flowchart LR
    classDef actor fill:none,stroke:#333,stroke-width:2px,color:#333;
    classDef usecase fill:#e3f2fd,stroke:#1e88e5,stroke-width:2px,color:#000;
    classDef note fill:#fff9c4,stroke:#fbc02d,stroke-width:1px,color:#000,text-align:left;

    TS["👤 Thí sinh"]:::actor

    subgraph System [Chức năng: Cổng thi trực tuyến]
        direction LR
        Main(["Thi trực tuyến"]):::usecase
      
        U1(["Xem kết quả (ngay)"]):::usecase
        U2(["Nộp bài"]):::usecase
        U3(["Chọn đáp án (Lưu tự động)"]):::usecase
        U4(["Bắt đầu làm bài"]):::usecase
        U5(["Đăng nhập phòng thi"]):::usecase

        Main -- "«extend»" --> U1
        Main -- "«extend»" --> U2
        Main -- "«extend»" --> U3
        Main -- "«extend»" --> U4
        Main -- "«extend»" --> U5
      
        Note["• Thí sinh: Chỉ thao tác làm bài trong thời gian kỳ thi mở<br>• Hệ thống: Lưu tạm đáp án liên tục để tránh rủi ro sự cố mạng<br>• Hệ thống: Tự động thu bài khi đồng hồ đếm ngược báo hết giờ"]:::note
        Main -.- Note
    end

    TS --> Main
```

### Biểu đồ Trình tự: Quá trình Làm bài & Nộp bài

```mermaid
sequenceDiagram
    actor TS as Thí sinh
    participant Portal as Giao diện thi<br>(Exam Portal)
    participant Timer as Bộ đếm giờ<br>(Countdown Timer)
    participant Svc as ExamService<br>(Xử lý nghiệp vụ thi)
    participant DB as Database<br>(Attempts, Answers)

    Note over TS,DB: [Bắt đầu thi]
    TS->>Portal: Bấm "Bắt đầu làm bài"
    Portal->>Svc: Gửi yêu cầu bắt đầu lượt thi mới
    Svc->>DB: Tạo bản ghi Attempt (Status: In_Progress)
    DB-->>Svc: Trả về Attempt ID & End Time
    Svc-->>Portal: Trả về cấu trúc danh sách câu hỏi đề thi
    Portal->>Timer: Kích hoạt đồng hồ đếm ngược thời gian
  
    Note over TS,DB: [Quá trình làm bài (Lưu tạm tự động)]
    loop Mỗi khi chọn đáp án
        TS->>Portal: Click chọn đáp án câu hỏi
        Portal->>Svc: Gửi tín hiệu đồng bộ đáp án (Sync API)
        Svc->>DB: Cập nhật selected_answers lưu tạm lên CSDL
    end

    Note over TS,DB: [Xác nhận nộp bài & Hoàn tất]
    alt Chủ động nộp bài
        TS->>Portal: Bấm "Nộp bài" và Xác nhận hoàn tất
    else Hết thời gian (Auto)
        Timer->>Portal: Trigger sự kiện đếm ngược về 00:00
    end
  
    Portal->>Svc: Gửi tín hiệu hoàn tất bài thi (Submit API)
    Svc->>DB: Đổi trạng thái Attempt -> Completed
    Svc->>Svc: Khớp đáp án đúng và tính toán tổng điểm
    Svc->>DB: Lưu vĩnh viễn điểm số vào CSDL
    Svc-->>Portal: Phản hồi thông tin kết quả bài thi
    Portal-->>TS: Hiển thị giao diện kết quả tổng quan (Điểm số)
```

### Biểu đồ Hoạt động: Quá trình Làm bài & Nộp bài

```mermaid
flowchart TD
    classDef startend fill:#000,stroke:#000,stroke-width:2px,color:#fff,shape:circle;
    classDef action fill:#fff,stroke:#333,stroke-width:1px,rx:10px,ry:10px;
    classDef decision fill:#fff,stroke:#333,stroke-width:1px,shape:diamond;

    subgraph TS [Thí sinh]
        direction TB
        Start((( )))
        A([Bấm 'Bắt đầu làm bài' tại phòng thi])
        D([Đọc câu hỏi và chọn đáp án])
        H([Xác nhận nộp bài qua Popup])
        L([Quan sát điểm số / Xem lại bài])
        End((( )))
    end

    subgraph System [Hệ thống]
        direction TB
        B([Tạo bản ghi lượt thi, khởi động đếm ngược])
        C([Hiển thị danh sách câu hỏi đề thi])
        E([Auto Sync: Lưu tạm đáp án lên CSDL])
        F{Hết thời gian<br>làm bài?}
        G{Thí sinh bấm<br>Nộp bài?}
        I([Đổi trạng thái bài thi thành 'Đã nộp'])
        J([Chấm điểm, đối chiếu kết quả tự động])
        K([Hiển thị màn hình kết quả])
    end

    Start --> A
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F -- Không --> G
    G -- Không --> D
    G -- Có --> H
    H --> I
    F -- Có tự động --> I
    I --> J
    J --> K
    K --> L
    L --> End

    class Start,End startend;
    class A,B,C,D,E,H,I,J,K,L action;
    class F,G decision;
```
