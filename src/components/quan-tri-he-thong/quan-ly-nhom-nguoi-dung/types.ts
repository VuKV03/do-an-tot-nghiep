// định nghĩa các kiểu dữ liệu cần thiết cho chức năng quản lý nhóm người dùng
export interface SecurityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  level: string;
  ip: string;
  details: string;
}
// interface định nghĩa cấu trúc của một nhóm người dùng
export interface UserGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  permissions: string[];
  status?: 'active' | 'inactive';
}
