import React from 'react';
import { ProjectOutlined, DatabaseOutlined, SettingOutlined, FolderOutlined, DashboardOutlined, CheckSquareOutlined } from '@ant-design/icons';

export const rawMenuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Bảng tổng quan',
  },
  {
    key: 'quan-tri-danh-muc',
    icon: <FolderOutlined />,
    label: 'Quản trị danh mục',
    children: [
      { key: 'danh-muc-mon-hoc', label: 'Danh mục môn học' },
      { key: 'danh-muc-khoi-lop', label: 'Danh mục khối lớp' },
      { key: 'cap-do-tu-duy', label: 'Cấp độ tư duy' },
      { key: 'loai-hinh-cau-hoi', label: 'Loại hình câu hỏi' },
      { key: 'thanh-phan-nang-luc', label: 'Thành phần năng lực' }
      // { key: 'danh-muc-dot-thi', label: 'Danh mục kỳ thi' }
    ]
  },
  {
    key: 'quan-ly-nhch',
    icon: <DatabaseOutlined />,
    label: 'Quản lý ngân hàng câu hỏi',
    children: [
      { key: 'chu-de-cau-hoi', label: 'Chủ đề câu hỏi' },
      { key: 'ngan-hang-cau-hoi', label: 'Ngân hàng câu hỏi' },
      { key: 'thong-ke-nhch', label: 'Thống kê NHCH' }
    ]
  },
  {
    key: 'xay-dung-de',
    icon: <ProjectOutlined />,
    label: 'Xây dựng đề thi',
    children: [
      { key: 'quan-ly-ma-tran-de', label: 'Quản lý ma trận đề' },
      { key: 'quan-ly-de-thi-goi-de', label: 'Quản lý đề gốc' },
      { key: 'quan-ly-goi-de', label: 'Quản lý gói đề' }
    ]
  },
  {
    key: 'to-chuc-thi',
    icon: <CheckSquareOutlined />,
    label: 'Tổ chức thi',
    children: [
      { key: 'quan-ly-thi-sinh', label: 'Quản lý thí sinh' },
      { key: 'quan-ly-ket-qua-thi', label: 'Quản lý kết quả thi' }
    ]
  },
  {
    key: 'quan-tri-he-thong',
    icon: <SettingOutlined />,
    label: 'Quản trị hệ thống',
    children: [
      { key: 'quan-ly-nguoi-dung', label: 'Quản lý người dùng' },
      { key: 'quan-ly-nhom-nguoi-dung', label: 'Quản lý nhóm người dùng' },
      // { key: 'chinh-sach-bao-mat', label: 'Chính sách bảo mật' }
    ]
  }
];
