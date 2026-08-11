# TÀI LIỆU MÔ TẢ TỔNG QUAN & CHI TIẾT USE CASE HỆ THỐNG

Dưới đây là tài liệu bao gồm Usecase Tổng quát toàn hệ thống và chi tiết các luồng nghiệp vụ.

---

## 1. MÔ TẢ TỔNG QUÁT USE CASE TOÀN HỆ THỐNG

### 1.1. Bảng phân rã các Phân hệ và Usecase cốt lõi

| Phân hệ (Modules)                                       | Tác nhân (Actors)    | Danh sách Usecase                                                                                                                    |
| :-------------------------------------------------------- | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **Hệ thống Non-AI (Nghiệp vụ cốt lõi)**       |                        |                                                                                                                                       |
| **1. Quản trị & Phân quyền**                    | Admin                  | Đăng nhập, Quản lý tài khoản, Quản lý nhóm quyền, Quản lý Audit log.                                                     |
| **2. Danh mục Hệ thống**                         | Admin, TPGV            | Quản lý Môn học, Quản lý Khối lớp, Quản lý Độ khó, Quản lý Dạng câu hỏi, Quản lý Chuẩn năng lực.               |
| **3. Ngân hàng Câu hỏi**                        | GVBM, TTBM             | Tạo chủ đề, Biên soạn câu hỏi (Thêm/Sửa/Xóa), Phê duyệt câu hỏi, Quản lý lịch sử câu hỏi.                        |
| **4. Tạo Đề & Ma trận**                         | GVBM, TTBM, TPGV       | Cấu hình ma trận đề, Sinh đề gốc, Đóng gói đề thi, Thẩm định gói đề, Hoán vị mã đề, Xuất bản file Word/PDF. |
| **5. Thi Trực tuyến**                             | Admin, TPGV, Thí sinh | Tổ chức ca thi, Gán danh sách thí sinh & mã đề, Làm bài thi (Auto-sync), Nộp bài/Thu bài tự động.                     |
| **6. Kết quả & Thống kê**                       | GVBM, TPGV, Thí sinh  | Chấm điểm tự động, Xem điểm & chi tiết bài làm, Xuất bảng điểm Excel, Phân tích phổ điểm.                         |
| **Hệ thống AI (Tích hợp Trí tuệ nhân tạo)** |                        |                                                                                                                                       |
| **7. Sinh câu hỏi (AI Generation)**               | GVBM                   | Sinh câu hỏi từ Prompt, Sinh câu hỏi từ tài liệu (PDF/Word), Sinh câu hỏi từ Ma trận.                                     |
| **8. Biên tập & Thẩm định (AI Refinement)**    | GVBM, TTBM             | Sửa lỗi chính tả/ngữ pháp, Tự động sinh phương án nhiễu, Gợi ý độ khó câu hỏi.                                    |
| **9. Tối ưu Đề thi (AI Optimization)**          | GVBM, TTBM             | Cảnh báo trùng lặp ngữ nghĩa câu hỏi, Gợi ý câu hỏi thay thế tương đương.                                           |

### 1.2. Biểu đồ Usecase Tổng Quát Toàn Hệ Thống (PlantUML)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Quản trị hệ thống\n(Admin)" as Admin
actor "Trưởng phòng giáo vụ\n(TPGV)" as TPGV
actor "Tổ trưởng bộ môn\n(TTBM)" as TTBM
actor "Giáo viên bộ môn\n(GVBM)" as GVBM
actor "Thí sinh / Sinh viên\n(Student)" as Student

rectangle "Hệ Thống Quản Lý Thi Trắc Nghiệm Tích Hợp AI" {

    package "1. Quản trị & Phân quyền" {
        usecase "Đăng nhập & Phân quyền" as UC1_1
        usecase "Quản lý Tài khoản & Nhóm quyền" as UC1_2
    }

    package "2. Quản lý Danh mục" {
        usecase "Quản lý Môn học, Khối lớp" as UC2_1
        usecase "Quản lý Chuẩn năng lực, Độ khó" as UC2_2
    }

    package "3. Ngân hàng Câu hỏi" {
        usecase "Quản lý Chủ đề" as UC3_1
        usecase "Biên soạn Câu hỏi" as UC3_2
        usecase "Phê duyệt Câu hỏi" as UC3_3
    }

    package "4. Tạo Đề & Ma trận" {
        usecase "Cấu hình Ma trận đề" as UC4_1
        usecase "Sinh Đề gốc & Đóng Gói Đề" as UC4_2
        usecase "Thẩm định Gói Đề" as UC4_3
        usecase "Hoán vị Mã đề & Xuất bản" as UC4_4
    }

    package "5. Thi Trực tuyến & Kết quả" {
        usecase "Tổ chức Ca thi" as UC5_1
        usecase "Tham gia Thi trực tuyến" as UC5_2
        usecase "Chấm điểm & Xem Kết quả" as UC5_3
        usecase "Thống kê & Xuất Báo cáo" as UC5_4
    }

    package "6. Tích hợp AI (Hỗ trợ sinh đề)" {
        usecase "AI: Sinh câu hỏi tự động\n(Từ Prompt/Tài liệu)" as UC6_1
        usecase "AI: Sinh phương án nhiễu &\nSửa lỗi ngữ pháp" as UC6_2
        usecase "AI: Cảnh báo trùng lặp &\nGợi ý thay thế" as UC6_3
    }
}

' Phân bổ tác nhân cho các usecase
Admin --> UC1_1
Admin --> UC1_2
Admin --> UC2_1
Admin --> UC2_2
Admin --> UC5_1

TPGV --> UC2_1
TPGV --> UC4_4
TPGV --> UC5_1
TPGV --> UC5_4

TTBM --> UC3_3
TTBM --> UC4_1
TTBM --> UC4_3
TTBM --> UC6_3

GVBM --> UC3_1
GVBM --> UC3_2
GVBM --> UC4_1
GVBM --> UC4_2
GVBM --> UC5_4
GVBM --> UC6_1
GVBM --> UC6_2
GVBM --> UC6_3

Student --> UC1_1
Student --> UC5_2
Student --> UC5_3

@enduml
```

---

### 1.3. Sơ đồ & Mô tả Kiến trúc Hệ thống Tổng thể (System Architecture Diagram)

Biểu đồ dưới đây mô hình hóa kiến trúc phân tầng (Layered Architecture) chuẩn của hệ thống **Quản lý Sinh đề & Tổ chức Thi trắc nghiệm tích hợp AI**, bao gồm sự phối hợp giữa Frontend (React/Vite), Proxy (Nginx), Backend API Services (Python/FastAPI), Hệ quản trị CSDL (MySQL, Redis, File Storage) và Dịch vụ Trí tuệ nhân tạo (Google Gemini API).

#### Biểu đồ Kiến trúc Hệ thống (PlantUML Architecture Diagram)

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam packageStyle rectangle
skinparam backgroundColor #FFFFFF
skinparam shadowing false

package "Tầng Người Dùng (Presentation Layer)" {
    [Trình duyệt Web\n(React + Vite + AntD)] as Frontend
    actor "Người dùng\n(Admin / GVBM / TTBM / TPGV / Student)" as User
}

package "Tầng Gateway & Proxy (Gateway Layer)" {
    [Nginx Reverse Proxy & SSL\n(quanlythi.site)] as Nginx
}

package "Tầng Nghiệp Vụ Core (Backend Services - Python/FastAPI)" {
    package "Phân hệ Vận hành & Quản lý Cốt lõi" {
        [Auth & Permission Service] as AuthService
        [Category & Subject Service] as CategoryService
        [Question Bank Service] as QuestionService
        [Exam & Package Service] as ExamService
        [Online Exam & Grading Service] as OnlineExamService
    }
  
    package "Phân hệ Trí Tuệ Nhân Tạo (AI Core Engine)" {
        [AI Generation Service\n(Prompt/Doc -> Question)] as AIGen
        [AI Refinement Service\n(Nhiễu & Ngữ pháp)] as AIRefine
        [AI Semantic & Optimization\n(Trùng lặp & Gợi ý)] as AIOptim
    }
}

package "Tầng Dữ Liệu & Lưu Trữ (Data & Storage Layer)" {
    database "MySQL Database\n(Dữ liệu quan hệ RDBMS)" as MySQL
    database "Redis Cache\n(Session & Auto-sync đáp án)" as Redis
    folder "File Storage System\n(Uploads / Word / PDF / Excel)" as FileStorage
}

cloud "Dịch Vụ AI Bên Ngoài (External Services)" {
    [Google Gemini API / LLM Engine] as GeminiAPI
}

' Luồng tương tác
User --> Frontend : HTTP / HTTPS (Port 80/443)
Frontend --> Nginx : RESTful API Requests (/api/*)

Nginx --> Frontend : Serves Static SPA Build (/dist)
Nginx --> AuthService : Proxy /api/auth
Nginx --> CategoryService : Proxy /api/category
Nginx --> QuestionService : Proxy /api/question
Nginx --> ExamService : Proxy /api/exam
Nginx --> OnlineExamService : Proxy /api/online-exam

QuestionService --> AIGen : Yêu cầu sinh câu hỏi
QuestionService --> AIRefine : Yêu cầu tinh chỉnh / Nhiễu
QuestionService --> AIOptim : Phân tích trùng lặp ngữ nghĩa

AIGen --> GeminiAPI : Gọi API LLM / Prompting
AIRefine --> GeminiAPI : Phân tích & Gợi ý phương án
AIOptim --> GeminiAPI : Tính Embedding Vector / Similarity

AuthService --> MySQL : Đọc/Ghi User & Role
CategoryService --> MySQL : Đọc/Ghi Danh mục môn học
QuestionService --> MySQL : Lưu trữ ngân hàng câu hỏi
ExamService --> MySQL : Lưu ma trận & gói đề thi
OnlineExamService --> MySQL : Lưu lượt thi & điểm số

OnlineExamService --> Redis : Auto-sync đáp án tạm (Real-time)
ExamService --> FileStorage : Lưu trữ file Word/PDF xuất bản
OnlineExamService --> FileStorage : Xuất bảng điểm Excel
QuestionService --> FileStorage : Lưu file tài liệu PDF/Word đầu vào

@enduml
```

#### Mô tả chi tiết các Tầng Kiến trúc (Architectural Layers)

1. **Tầng Người dùng (Presentation Layer - Frontend):**

   - Đóng vai trò làm giao diện tương tác người dùng (SPA - Single Page Application), phát triển trên nền **ReactJS**, **Vite** và **Ant Design**.
   - Hỗ trợ đầy đủ giao diện cho 5 nhóm tác nhân: Quản trị viên (Admin), Trưởng phòng giáo vụ (TPGV), Tổ trưởng bộ môn (TTBM), Giáo viên bộ môn (GVBM) và Thí sinh (Student).
   - Tích hợp công cụ Render công thức toán học/hóa học (LaTeX/MathJax) và xử lý biểu đồ thống kê phổ điểm linh hoạt.
2. **Tầng Cổng vào & Proxy (Gateway & Proxy Layer):**

   - Đóng vai trò là điểm tiếp nhận trung tâm sử dụng **Nginx Reverse Proxy**.
   - Phân luồng dữ liệu: Phục vụ các file tĩnh của Single Page Application (React) cho client tại đường dẫn gốc `/` và điều hướng toàn bộ request API sang backend Python qua tiền tố `/api/`.
   - Quản lý và gia cố bảo mật bằng chứng chỉ **SSL Let's Encrypt (HTTPS)** trên tên miền `quanlythi.site`.
3. **Tầng Nghiệp vụ Core (Application & Backend Services Layer):**

   - Đã được mô hình hóa và triển khai dạng các Microservices/Modules chạy độc lập với **Python FastAPI / Uvicorn**.
   - **Auth & Permission Service:** Quản lý xác thực JWT, phân quyền theo vai trò (RBAC) và lưu vết Audit Log.
   - **Question Bank & Exam Service:** Quản lý ngân hàng câu hỏi đa dạng, cấu hình ma trận đề, đóng gói đề thi, hoán vị mã đề tự động và xuất bản file Word/PDF.
   - **Online Exam & Grading Service:** Tổ chức ca thi, cấp mã phòng thi, tự động đồng bộ nháp bài làm (Auto-sync), chấm điểm tự động tức thì và xuất kết quả ra file Excel.
   - **AI Core Engine Service:** Tích hợp với **Google Gemini API** để thực hiện 3 tác vụ AI chuyên sâu: Sinh câu hỏi (Prompt/File), Tinh chỉnh câu hỏi (Nhiễu/Ngữ pháp) và Phân tích tối ưu đề thi (Phát hiện trùng lặp ngữ nghĩa).
4. **Tầng Dữ liệu & Lưu trữ (Data & Persistence Layer):**

   - **MySQL Database (RDBMS):** Đóng vai trò lưu trữ cơ sở dữ liệu vật lý toàn hệ thống (User, Môn học, Ma trận, Đề thi, Lượt thi, Audit Logs...).
   - **Redis Cache:** Lưu trữ bộ nhớ tạm phục vụ lưu nháp bài thi theo thời gian thực (Auto-sync) giúp chống mất dữ liệu khi gián đoạn kết nối mạng và quản lý session làm bài.
   - **File Storage System:** Lưu trữ tệp tin tài liệu đầu vào (PDF/Word), các gói đề thi xuất bản (Word/PDF) và file báo cáo bảng điểm Excel xuất ra cho giảng viên/giáo vụ.

---

## 2. CHI TIẾT USE CASE TỪNG PHÂN HỆ

### 2.1. Usecase Quản lý gói đề

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
