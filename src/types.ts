export type QuestionType = 'single' | 'multiple' | 'true_false' | 'short';

export type CognitiveLevel = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

export type QuestionStatus = 'approved' | 'pending' | 'draft' | 'rejected';

export interface TrueFalseStatement {
  id: number;
  topicId: string;
  topicName: string;
  level: CognitiveLevel;
  nangLuc: string;
  content: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  code: string;
  text: string;
  type: QuestionType;
  level: CognitiveLevel;
  status: QuestionStatus;
  subject: string;
  grade: string;
  topicId: string;
  topicName: string;
  subTopicName?: string;
  nangLucId?: string;
  nangLuc?: string;
  options?: string[]; // for single and multiple options
  correctAnswer?: string | string[]; // for single/multiple/true_false/short answers
  statements?: TrueFalseStatement[]; // for true_false questions with statement-level metadata
  creator: string;
  createdAt: string;
  feedback?: string;
}

export interface TopicNode {
  key: string;
  title: string;
  children?: TopicNode[];
}

export interface SubjectOption {
  value: string;
  label: string;
}

export interface GradeOption {
  value: string;
  label: string;
}

// Matrix specification types
export interface MatrixCell {
  nhanBiet: number;
  thongHieu: number;
  vanDung: number;
  vanDungCao: number;
}

export interface MatrixRow {
  topicId: string;
  topicName: string;
  cells: MatrixCell;
}

export interface MatrixConfig {
  id: string;
  code: string;
  name: string;
  subject: string;
  grade: string;
  originalExamsCount: number;
  rows: MatrixRow[];
}

export interface UserGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
  status?: 'active' | 'inactive';
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'teacher' | 'reviewer';
  status: 'active' | 'inactive';
  groups?: UserGroup[];
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
}
