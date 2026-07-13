// Định nghĩa các loại câu hỏi (Trắc nghiệm một lựa chọn, nhiều lựa chọn, đúng sai, tự luận ngắn)
export type QuestionType = 'single' | 'multiple' | 'true_false' | 'short';

// Định nghĩa các mức độ nhận thức (Nhận biết, thông hiểu, vận dụng, vận dụng cao)
export type CognitiveLevel = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

// Định nghĩa trạng thái của câu hỏi (Đã duyệt, chờ duyệt, nháp, bị từ chối)
export type QuestionStatus = 'approved' | 'pending' | 'draft' | 'rejected';

// Interface cho các câu phát biểu của dạng câu hỏi đúng/sai
export interface TrueFalseStatement {
  id: number;           // Mã định danh của câu phát biểu
  topicId: string;      // Mã chủ đề liên quan
  topicName: string;    // Tên chủ đề liên quan
  level: CognitiveLevel;// Mức độ nhận thức của câu phát biểu
  nangLuc: string;      // Thành phần năng lực đánh giá
  content: string;      // Nội dung câu phát biểu
  isCorrect: boolean;   // Đáp án (Đúng hoặc Sai)
}

// Interface chính cho cấu trúc của một câu hỏi
export interface Question {
  id: string;           // Mã định danh duy nhất của câu hỏi
  code: string;         // Mã câu hỏi (thường dùng để hiển thị)
  text: string;         // Nội dung chính của câu hỏi
  type: QuestionType;   // Loại câu hỏi
  level: CognitiveLevel;// Mức độ nhận thức
  status: QuestionStatus;// Trạng thái hiện tại
  subject: string;      // Môn học
  grade: string;        // Khối lớp
  topicId: string;      // Mã chủ đề
  topicName: string;    // Tên chủ đề
  subTopicName?: string; // Tên chủ đề phụ (nếu có)
  nangLucId?: string;   // Mã thành phần năng lực (nếu có)
  nangLuc?: string;     // Tên thành phần năng lực (nếu có)
  options?: string[]; // Danh sách các đáp án lựa chọn (dành cho câu hỏi chọn 1 hoặc nhiều đáp án)
  correctAnswer?: string | string[]; // Đáp án đúng (cho câu hỏi chọn 1/nhiều đáp án/đúng sai/trả lời ngắn)
  statements?: TrueFalseStatement[]; // Danh sách các phát biểu (dành cho câu hỏi đúng/sai)
  creator: string;      // Người tạo câu hỏi
  createdAt: string;    // Ngày tạo câu hỏi
  feedback?: string;    // Nhận xét, phản hồi (từ người thẩm định)
}

// Interface biểu diễn một node trong cây cấu trúc chủ đề/chương bài
export interface TopicNode {
  key: string;          // Mã node
  title: string;        // Tên node
  children?: TopicNode[];// Danh sách các node con (nếu có)
}

// Interface cho tùy chọn môn học
export interface SubjectOption {
  value: string;        // Giá trị lưu trữ
  label: string;        // Tên hiển thị
}

// Interface cho tùy chọn khối lớp
export interface GradeOption {
  value: string;        // Giá trị lưu trữ
  label: string;        // Tên hiển thị
}

// --- Các kiểu dữ liệu liên quan đến cấu hình ma trận đề ---

// Interface biểu diễn cấu trúc của một ô trong ma trận (Số lượng câu hỏi theo mức độ nhận thức)
export interface MatrixCell {
  nhanBiet: number;     // Số lượng câu hỏi ở mức Nhận biết
  thongHieu: number;    // Số lượng câu hỏi ở mức Thông hiểu
  vanDung: number;      // Số lượng câu hỏi ở mức Vận dụng
  vanDungCao: number;   // Số lượng câu hỏi ở mức Vận dụng cao
}

// Interface biểu diễn một hàng trong bảng ma trận đề thi
export interface MatrixRow {
  topicId: string;      // Mã chủ đề của hàng
  topicName: string;    // Tên chủ đề
  cells: MatrixCell;    // Các ô chứa số lượng câu hỏi phân theo mức độ
}

// Interface chứa thông tin cấu hình tổng thể của một ma trận đề thi
export interface MatrixConfig {
  id: string;           // Mã định danh của cấu hình ma trận
  code: string;         // Mã hiển thị của ma trận
  name: string;         // Tên ma trận
  subject: string;      // Môn học áp dụng
  grade: string;        // Khối lớp áp dụng
  originalExamsCount: number; // Số lượng đề gốc được tạo ra từ ma trận
  rows: MatrixRow[];    // Danh sách các hàng cấu hình trong ma trận
  status?: 'pending' | 'approved' | 'draft'; // Trạng thái của ma trận
}

// Interface mô tả một nhóm người dùng trong hệ thống
export interface UserGroup {
  id: string;           // Mã định danh nhóm
  code: string;         // Mã hiển thị của nhóm
  name: string;         // Tên nhóm
  description: string;  // Mô tả về nhóm
  memberCount: number;  // Số lượng thành viên trong nhóm
  permissions: string[];// Danh sách các quyền được cấp cho nhóm
  status?: 'active' | 'inactive'; // Trạng thái hoạt động của nhóm
}

// Interface mô tả thông tin người dùng hệ thống
export interface SystemUser {
  id: string;           // Mã định danh người dùng
  username: string;     // Tên đăng nhập
  fullName: string;     // Họ và tên đầy đủ
  email: string;        // Địa chỉ email
  role: 'admin' | 'teacher' | 'reviewer' | 'candidate'; // Vai trò chính của người dùng
  status: 'active' | 'inactive'; // Trạng thái tài khoản
  groups?: UserGroup[]; // Danh sách các nhóm mà người dùng tham gia
}

// Interface ghi lại nhật ký hoạt động (Audit log) của hệ thống
export interface AuditLog {
  id: string;           // Mã định danh của log
  user: string;         // Người thực hiện hành động
  action: string;       // Hành động được thực hiện
  timestamp: string;    // Thời gian thực hiện
  details: string;      // Chi tiết cụ thể về hành động
}
