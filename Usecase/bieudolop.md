# Phân tích thiết kế: Kiến trúc Lớp (Class & Database Diagram) Toàn Hệ Thống

Tài liệu này cung cấp cái nhìn tổng quan về cấu trúc tĩnh của hệ thống **Quản lý thi trắc nghiệm AI**, bao gồm cả khía cạnh thiết kế phần mềm (Mô hình hướng đối tượng) và khía cạnh thiết kế dữ liệu (Mô hình thực thể - CSDL).

---

## 1. Biểu đồ Lớp Phần mềm (Software Class Diagram)

Biểu đồ này mô tả các lớp đối tượng chính, thuộc tính, phương thức cơ bản và mối quan hệ giữa chúng trong mã nguồn ứng dụng (Backend/Frontend).

```plantuml
@startuml
title Biểu đồ lớp (Class Diagram) - Toàn hệ thống Quản lý Ngân hàng câu hỏi & Thi trực tuyến

skinparam classAttributeIconSize 0
skinparam shadowing false
skinparam class {
    BackgroundColor White
    ArrowColor #2C3E50
    BorderColor #2C3E50
}

' ================= User & Security Management =================
package "User & Security Management" {
    class User {
      - id: String
      - username: String
      - email: String
      - passwordHash: String
      - fullName: String
      - role: String
      - status: String
      - createdAt: String
      + login(): Boolean
      + logout(): void
      + updateProfile(): void
      + changePassword(): void
    }

    class UserGroup {
      - id: String
      - code: String
      - name: String
      - description: String
      - memberCount: Integer
      + addMember(user: User): void
      + removeMember(user: User): void
      + assignPermission(perm: Permission): void
    }

    class Permission {
      - id: String
      - code: String
      - name: String
      - module: String
    }
  
    class SecurityPolicy {
      - id: String
      - minPasswordLength: Integer
      - requireUpperCase: Boolean
      - requireSpecialChar: Boolean
      - passwordExpiryDays: Integer
      - sessionTimeoutMinutes: Integer
      + validatePassword(password: String): Boolean
    }

    class AuditLog {
      - id: String
      - user: String
      - action: String
      - timestamp: String
      - details: String
      + logAction(): void
    }

    User "1" -- "0..*" UserGroup : belongs to >
    UserGroup "1" -- "0..*" Permission : has >
}

' ================= Category Management =================
package "Category Management" {
    class SubjectCategory {
      - id: String
      - code: String
      - name: String
      + addTopic(topic: Topic): void
    }

    class GradeLevel {
      - id: String
      - code: String
      - name: String
    }

    class CognitiveLevel {
      - id: String
      - code: String
      - name: String
    }

    class CompetencyComponent {
      - id: String
      - code: String
      - name: String
    }

    class QuestionType {
      - id: String
      - code: String
      - name: String
    }
  
    SubjectCategory "1" *-- "0..*" CompetencyComponent : contains >
}

' ================= Question Bank =================
package "Question Bank" {
    class Topic {
      - id: String
      - code: String
      - name: String
      - status: Integer
      + addQuestion(q: Question): void
      + updateTopic(): void
    }

    class Question {
      - id: String
      - content: String
      - options: String
      - correctAnswer: String
      - status: Integer
      + validate(): Boolean
      + updateContent(): void
      + approve(): void
    }

    class TopicHistory {
      - id: String
      - action: String
      - actor: String
      - timestamp: String
      + record(): void
    }

    class QuestionHistory {
      - id: String
      - action: String
      - actor: String
      - timestamp: String
      + record(): void
    }
  
    class SubjectConfig {
      - id: String
      + updateConfig(): void
    }

    SubjectCategory "1" *-- "0..*" Topic : categorizes >
    Topic "1" *-- "0..*" Question : contains >
    GradeLevel "1" -- "0..*" Question : categorizes >
    CognitiveLevel "1" -- "0..*" Question : classifies >
    QuestionType "1" -- "0..*" Question : defines >
    Topic "1" -- "0..*" TopicHistory : tracks >
    Question "1" -- "0..*" QuestionHistory : tracks >
    SubjectCategory "1" -- "1" SubjectConfig : configures >
}

' ================= Exam Generation =================
package "Exam Generation" {
    class MatrixConfig {
      - id: String
      - code: String
      - name: String
      - structure: String
      - totalScore: Float
      - totalQuestions: Integer
      + generateExam(): Exam
      + validateStructure(): Boolean
    }

    class ExamPackage {
      - id: String
      - code: String
      - name: String
      - status: String
      + addExam(exam: Exam): void
      + publish(): void
    }

    class Exam {
      - id: String
      - code: String
      - name: String
      - status: String
      - duration: Integer
      + generateQuestions(matrix: MatrixConfig): void
      + exportPdf(): void
    }

    MatrixConfig "1" -- "0..*" ExamPackage : creates >
    MatrixConfig "1" -- "0..*" Exam : structures >
    ExamPackage "1" *-- "0..*" Exam : bundles >
    Exam "1" *-- "1..*" Question : contains >
}

' ================= Exam Execution & Results =================
package "Exam Execution" {
    class ExamSession {
      - id: String
      - sessionCode: String
      - name: String
      - status: String
      - startTime: DateTime
      - endTime: DateTime
      + startSession(): void
      + endSession(): void
    }

    class ExamCandidate {
      - id: String
      - username: String
      - passwordHash: String
      - fullName: String
      - status: String
      + authenticate(): Boolean
      + submitExam(): void
    }

    class ExamResult {
      - id: String
      - score: Float
      - answersJson: String
      - status: String
      + calculateScore(): Float
      + exportResult(): void
    }
  
    class StudentSubject {
      - id: String
      + enroll(): void
    }

    Exam "1" -- "0..*" ExamSession : scheduled as >
    ExamSession "1" *-- "0..*" ExamCandidate : includes >
    ExamCandidate "1" -- "0..*" ExamResult : produces >
    ExamSession "1" -- "0..*" ExamResult : records >
    ExamCandidate "1" -- "0..*" StudentSubject : studies >
}
@enduml
```

### Mô tả và Mục tiêu

* **Mô tả:** Các lớp (Class) được phân chia thành 4 cụm logic (User Management, Question Bank, Exam Generation, Exam Execution) với các quan hệ kế thừa và kết hợp rõ ràng.
* **Mục tiêu:** Cung cấp tài liệu thiết kế phần mềm ở mức chi tiết (Detailed Design). Giúp Developer hiểu được kiến trúc đối tượng trong Code và triển khai các API một cách chặt chẽ.

---

## 2. Biểu đồ Lớp Cơ sở dữ liệu (Database ERD)

Biểu đồ này là mô hình Thực thể - Mối quan hệ (ERD), mô tả chi tiết toàn bộ các bảng vật lý (25 bảng) hiện có trong Hệ quản trị CSDL của hệ thống bao gồm 2 phân hệ: Quản lý ngân hàng câu hỏi đề thi và Hệ thống thi trực tuyến.

```plantuml
@startuml
title Biểu đồ Cơ sở dữ liệu (Database ERD) - Toàn hệ thống Quản lý Ngân hàng câu hỏi & Thi trực tuyến

' Style settings
hide circle
skinparam linetype ortho
skinparam shadowing false
skinparam entity {
    BackgroundColor White
    BorderColor #2C3E50
    ArrowColor #2C3E50
}

' ================= User & Security Management =================
entity "users" as users {
  * id : VARCHAR(255) <<PK>>
  --
  * username : VARCHAR(100)
  * email : VARCHAR(255)
  * password_hash : VARCHAR(255)
  * fullName : VARCHAR(255)
  role : VARCHAR(50)
  status : VARCHAR(50)
  createdAt : VARCHAR(100)
}

entity "user_groups" as user_groups {
  * id : VARCHAR(255) <<PK>>
  --
  * code : VARCHAR(100)
  * name : VARCHAR(255)
  description : TEXT
  memberCount : INT
}

entity "user_group_members" as user_group_members {
  * id : VARCHAR(255) <<PK>>
  --
  * group_id : VARCHAR(255) <<FK>>
  * user_id : VARCHAR(255) <<FK>>
  joinedAt : VARCHAR(100)
}

entity "permissions" as permissions {
  * id : VARCHAR(255) <<PK>>
  --
  * code : VARCHAR(100)
  * name : VARCHAR(255)
  * module : VARCHAR(100)
}

entity "group_permissions" as group_permissions {
  * id : VARCHAR(255) <<PK>>
  --
  * group_id : VARCHAR(255) <<FK>>
  * permission_id : VARCHAR(255) <<FK>>
}

entity "security_policies" as security_policies {
  * id : VARCHAR(255) <<PK>>
  --
  minPasswordLength : INT
  requireUpperCase : BOOLEAN
  requireSpecialChar : BOOLEAN
  passwordExpiryDays : INT
  sessionTimeoutMinutes : INT
}

entity "audit_logs" as audit_logs {
  * id : VARCHAR(255) <<PK>>
  --
  * user : VARCHAR(255)
  * action : VARCHAR(255)
  * timestamp : VARCHAR(100)
  details : TEXT
}

' ================= Category Management =================
entity "subject_categories" as subject_categories {
  * id : VARCHAR(36) <<PK>>
  --
  * code : VARCHAR(50)
  * name : VARCHAR(255)
}

entity "grade_levels" as grade_levels {
  * id : VARCHAR(36) <<PK>>
  --
  * code : VARCHAR(50)
  * name : VARCHAR(255)
}

entity "cognitive_levels" as cognitive_levels {
  * id : VARCHAR(36) <<PK>>
  --
  * code : VARCHAR(50)
  * name : VARCHAR(255)
}

entity "competency_components" as competency_components {
  * id : VARCHAR(36) <<PK>>
  --
  * subject_id : VARCHAR(36) <<FK>>
  * code : VARCHAR(50)
  * name : VARCHAR(255)
}

entity "question_types" as question_types {
  * id : VARCHAR(36) <<PK>>
  --
  * code : VARCHAR(50)
  * name : VARCHAR(255)
}

' ================= Question Bank =================
entity "topics" as topics {
  * id : VARCHAR(36) <<PK>>
  --
  * subject_id : VARCHAR(36) <<FK>>
  * grade_id : VARCHAR(36) <<FK>>
  * code : VARCHAR(50)
  * name : VARCHAR(255)
  parent_id : VARCHAR(36)
  status : INT
}

entity "topic_histories" as topic_histories {
  * id : VARCHAR(36) <<PK>>
  --
  * topic_id : VARCHAR(36) <<FK>>
  action : VARCHAR(50)
  actor : VARCHAR(255)
  timestamp : VARCHAR(50)
}

entity "questions" as questions {
  * id : VARCHAR(36) <<PK>>
  --
  * topic_id : VARCHAR(36) <<FK>>
  * subject_id : VARCHAR(36) <<FK>>
  * grade_id : VARCHAR(36) <<FK>>
  * level_id : VARCHAR(36) <<FK>>
  * type_id : VARCHAR(36) <<FK>>
  competency_component_id : VARCHAR(36) <<FK>>
  exam_id : VARCHAR(255) <<FK>>
  * content : LONGTEXT
  options : LONGTEXT
  correct_answer : LONGTEXT
  status : INT
}

entity "question_histories" as question_histories {
  * id : VARCHAR(36) <<PK>>
  --
  * question_id : VARCHAR(36) <<FK>>
  action : VARCHAR(50)
  actor : VARCHAR(255)
  timestamp : VARCHAR(50)
}

entity "subject_configs" as subject_configs {
  * id : VARCHAR(36) <<PK>>
  --
  * subject_id : VARCHAR(36) <<FK>>
  type_id_p1 : VARCHAR(36) <<FK>>
  type_id_p2 : VARCHAR(36) <<FK>>
  type_id_p3 : VARCHAR(36) <<FK>>
}

' ================= Exam Generation =================
entity "matrix_configs" as matrix_configs {
  * id : VARCHAR(255) <<PK>>
  --
  * subject_id : VARCHAR(36) <<FK>>
  * code : VARCHAR(100)
  * name : VARCHAR(255)
  structure : LONGTEXT
  totalScore : FLOAT
  totalQuestions : INT
}

entity "packages" as packages {
  * id : VARCHAR(255) <<PK>>
  --
  * matrix_id : VARCHAR(255) <<FK>>
  * code : VARCHAR(100)
  * name : VARCHAR(255)
  status : VARCHAR(50)
}

entity "exams" as exams {
  * id : VARCHAR(255) <<PK>>
  --
  * matrix_id : VARCHAR(255) <<FK>>
  * code : VARCHAR(100)
  * name : VARCHAR(255)
  status : VARCHAR(50)
  duration : INT
}

entity "package_exams" as package_exams {
  * package_id : VARCHAR(255) <<PK/FK>>
  * exam_id : VARCHAR(255) <<PK/FK>>
  --
  * position : INT
}

' ================= Exam Execution & Results =================
entity "exam_sessions" as exam_sessions {
  * id : VARCHAR(50) <<PK>>
  --
  * exam_id : VARCHAR(50) <<FK>>
  * session_code : VARCHAR(50)
  * name : VARCHAR(255)
  status : VARCHAR(50)
  start_time : DATETIME
  end_time : DATETIME
}

entity "exam_candidates" as exam_candidates {
  * id : VARCHAR(50) <<PK>>
  --
  * session_id : VARCHAR(50) <<FK>>
  * username : VARCHAR(100)
  * password_hash : VARCHAR(255)
  * full_name : VARCHAR(255)
  status : VARCHAR(50)
}

entity "student_subjects" as student_subjects {
  * id : VARCHAR(50) <<PK>>
  --
  * candidate_id : VARCHAR(50) <<FK>>
  * subject_id : VARCHAR(100) <<FK>>
}

entity "exam_results" as exam_results {
  * id : VARCHAR(50) <<PK>>
  --
  * candidate_id : VARCHAR(50) <<FK>>
  * session_id : VARCHAR(50) <<FK>>
  score : FLOAT
  answers_json : TEXT
  status : VARCHAR(50)
}

' ================= Relationships (Ràng buộc khóa ngoại) =================
users ||--o{ user_group_members : "1:N"
user_groups ||--o{ user_group_members : "1:N"
user_groups ||--o{ group_permissions : "1:N"
permissions ||--o{ group_permissions : "1:N"

subject_categories ||--o{ competency_components : "1:N"
subject_categories ||--o{ topics : "1:N"
subject_categories ||--o{ questions : "1:N"
grade_levels ||--o{ topics : "1:N"
grade_levels ||--o{ questions : "1:N"
cognitive_levels ||--o{ questions : "1:N"
question_types ||--o{ questions : "1:N"
competency_components ||--o{ questions : "1:N"

topics ||--o{ topic_histories : "1:N"
topics ||--o{ questions : "1:N"
questions ||--o{ question_histories : "1:N"

subject_categories ||--o{ subject_configs : "1:N"
subject_categories ||--o{ matrix_configs : "1:N"

matrix_configs ||--o{ packages : "1:N"
matrix_configs ||--o{ exams : "1:N"
packages ||--o{ package_exams : "1:N"
exams ||--o{ package_exams : "1:N"
exams ||--o{ questions : "1:N"

exams ||--o{ exam_sessions : "1:N"
exam_sessions ||--o{ exam_candidates : "1:N"
exam_candidates ||--o{ student_subjects : "1:N"
exam_candidates ||--o{ exam_results : "1:N"
exam_sessions ||--o{ exam_results : "1:N"

@enduml
```

### Mô tả và Mục tiêu

* **Mô tả:** Biểu đồ mô hình dữ liệu (ERD) được kết xuất trực tiếp từ hệ thống CSDL vật lý của dự án bao gồm 25 bảng thực thể. Hệ thống chia thành 5 phân nhóm chính: **User & Security Management**, **Category Management**, **Question Bank**, **Exam Generation** và **Exam Execution**. Các mối quan hệ (Foreign Keys) được thiết lập đầy đủ nhằm đảm bảo tính toàn vẹn dữ liệu.
* **Mục tiêu:** Là bản thiết kế nền tảng cho việc khởi tạo CSDL vật lý (Database Schema). Giúp các lập trình viên xây dựng các Models/Entities, thiết lập quan hệ (ORM Relationships) và viết câu lệnh SQL chuẩn xác, đảm bảo tính nhất quán và toàn vẹn dữ liệu cho toàn bộ dự án.
