import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Button,
  Select,
  Modal,
  Tag,
  Badge,
  Form,
  Switch,
  Tooltip,
  Space,
  Popconfirm,
  Empty,
  Card,
  Row,
  Col,
  Divider,
  message
} from 'antd';
import {
  FolderOutlined,
  BookOutlined,
  TagsOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ClusterOutlined,
  ExperimentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import DanhMucKhoiLop from './quan-ly-danh-muc/danh-muc-khoi-lop';
import DanhMucMonHoc from './quan-ly-danh-muc/danh-muc-mon-hoc';
import DanhMucCapDoTuDuy from './quan-ly-danh-muc/cap-do-tu-duy';
import DanhMucLoaiHinhCauHoi from './quan-ly-danh-muc/loai-hinh-cau-hoi';
import DanhMucThanhPhanNangLuc from './quan-ly-danh-muc/thanh-phan-nang-luc';
import DanhMucDotThi from './quan-ly-danh-muc/danh-muc-dot-thi';



interface CategoryAdminModuleProps {
  currentTabKey: string; // 'danh-muc-mon-hoc' | 'danh-muc-khoi-lop' | 'cap-do-tu-duy' | 'loai-hinh-cau-hoi'
  onNavigateTab: (key: string) => void;
}

// -----------------------------------------------------------------
// Interfaces for Core Label Categories
// -----------------------------------------------------------------
interface SubjectItem {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string; // 'Tự nhiên' | 'Xã hội' | 'Ngoại ngữ'
  questionCount: number;
  status: 'active' | 'inactive';
}

interface GradeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  status: 'active' | 'inactive';
}

interface CognitiveLevelItem {
  id: string;
  code: string; // NB, TH, VD, VDC
  name: string;
  description: string;
  pointMultiplier: number;
  color: string;
  status: 'active' | 'inactive';
}

interface QuestionTypeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  autoGrading: boolean;
  scoreWeight: number;
  status: 'active' | 'inactive';
}

export default function CategoryAdminModule({
  currentTabKey,
  onNavigateTab
}: CategoryAdminModuleProps) {

  // -----------------------------------------------------------------
  // 1. DATA INITIALIZATION (Subjects, Grades, Levels, Types)
  // -----------------------------------------------------------------
  
  // A. Subjects default list
  const [subjects, setSubjects] = useState<SubjectItem[]>([
    { id: 'sub-1', code: 'TOAN-12', name: 'Toán học', description: 'Đại số, Hình học và phương pháp giải tích không gian Oxyz chuyên sâu.', department: 'Tự nhiên', questionCount: 154, status: 'active' },
    { id: 'sub-2', code: 'VAN-12', name: 'Ngữ văn', description: 'Nghị luận văn học, lý luận văn học và đọc hiểu văn bản hiện đại.', department: 'Xã hội', questionCount: 92, status: 'active' },
    { id: 'sub-3', code: 'ANH-12', name: 'Tiếng Anh', description: 'Cấu trúc ngữ pháp, từ vựng theo chủ đề và đọc hiểu nâng cao.', department: 'Ngoại ngữ', questionCount: 110, status: 'active' },
    { id: 'sub-4', code: 'LY-12', name: 'Vật lí', description: 'Dao động cơ học, dòng điện xoay chiều và vật lí hạt nhân đại cương.', department: 'Tự nhiên', questionCount: 68, status: 'active' },
    { id: 'sub-5', code: 'HOA-12', name: 'Hóa học', description: 'Hóa hữu cơ, este, lipit, amin, polime và các chuyên đề vô cơ tổng hợp.', department: 'Tự nhiên', questionCount: 45, status: 'active' },
    { id: 'sub-6', code: 'SINH-12', name: 'Sinh học', description: 'Cơ chế di truyền và biến dị, quy luật di truyền học Mendel tiên tiến.', department: 'Tự nhiên', questionCount: 37, status: 'active' },
    { id: 'sub-7', code: 'SU-12', name: 'Lịch sử', description: 'Lịch sử Việt Nam thế kỷ 20 và các cuộc chiến tranh cách mạng vĩ đại.', department: 'Xã hội', questionCount: 51, status: 'inactive' },
    { id: 'sub-8', code: 'DIA-12', name: 'Địa lí', description: 'Địa lí tự nhiên Việt Nam, dân cư và các vùng kinh tế trọng điểm.', department: 'Xã hội', questionCount: 42, status: 'active' }
  ]);

  // B. Grades default list
  const [grades, setGrades] = useState<GradeItem[]>([
    { id: 'gr-1', code: 'K10', name: 'Khối 10', description: 'Chương trình học kiến thức nền tảng THPT học kỳ I và II.', displayOrder: 1, status: 'active' },
    { id: 'gr-2', code: 'K11', name: 'Khối 11', description: 'Chương trình tích lũy nâng cao, bổ trợ các chuyên đề trọng điểm.', displayOrder: 2, status: 'active' },
    { id: 'gr-3', code: 'K12', name: 'Khối 12', description: 'Chương trình tốt nghiệp quốc gia, luyện đề chuyên sâu thi THPT quốc tế.', displayOrder: 3, status: 'active' }
  ]);

  // C. Cognitive Levels default list
  const [levels, setLevels] = useState<CognitiveLevelItem[]>([
    { id: 'lv-1', code: 'NB', name: 'Nhận biết', description: 'Học sinh nhận biết thông tin, công thức, khái niệm cơ bản đã được học trực tiếp.', pointMultiplier: 1.0, color: 'blue', status: 'active' },
    { id: 'lv-2', code: 'TH', name: 'Thông hiểu', description: 'Học sinh hiểu ý nghĩa khái niệm, giải thích, tóm tắt và minh họa được bản chất.', pointMultiplier: 1.5, color: 'cyan', status: 'active' },
    { id: 'lv-3', code: 'VD', name: 'Vận dụng', description: 'Học sinh áp dụng lý thuyết vào tình huống, bài tập cụ thể một cách độc lập.', pointMultiplier: 2.0, color: 'orange', status: 'active' },
    { id: 'lv-4', code: 'VDC', name: 'Vận dụng cao', description: 'Học sinh tổng hợp kiến thức để xử lý vấn đề mới, đánh giá, phát triển phương pháp giải.', pointMultiplier: 2.5, color: 'red', status: 'active' }
  ]);

  // D. Question Types default list
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeItem[]>([
    { id: 'tp-1', code: 'MCQ_SINGLE', name: 'Trắc nghiệm một lựa chọn', description: 'Câu hỏi đưa ra 4 phương án độc lập (A, B, C, D) và chỉ có duy nhất một đáp án đúng tuyệt đối.', autoGrading: true, scoreWeight: 1.0, status: 'active' },
    { id: 'tp-2', code: 'MCQ_MULTI', name: 'Trắc nghiệm nhiều lựa chọn', description: 'Học sinh chọn nhiều hơn một lựa chọn đúng từ danh mục, hệ thống tính điểm theo phân tỷ lệ tỉ mỉ.', autoGrading: true, scoreWeight: 1.2, status: 'active' },
    { id: 'tp-3', code: 'TRUE_FALSE', name: 'Trắc nghiệm Đúng/Sai', description: 'Mỗi ý kiến độc lập được xác minh tính Đúng hoặc Sai. Là định dạng chính thức trong kỳ thi THPT-QG thế hệ mới.', autoGrading: true, scoreWeight: 1.5, status: 'active' },
    { id: 'tp-4', code: 'ESSAY_SHORT', name: 'Tự luận ngắn / Điền đáp số', description: 'Học sinh điền trực tiếp con số, đáp án văn bản ngắn gọn. Hỗ trợ chấm tự động bằng từ khóa chuẩn hóa.', autoGrading: false, scoreWeight: 2.0, status: 'active' }
  ]);

  // -----------------------------------------------------------------
  // 2. SEARCH & STATE FILTERS FOR EACH TAB
  // -----------------------------------------------------------------
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState('all');

  const [gradeSearch, setGradeSearch] = useState('');

  const [levelSearch, setLevelSearch] = useState('');

  const [typeSearch, setTypeSearch] = useState('');

  // -----------------------------------------------------------------
  // 3. EDIT/CREATE DIALOGS FOR EACH SYSTEM CATEGORY
  // -----------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Filter computations
  const filteredSubjects = useMemo(() => {
    const kw = subjectSearch.trim().toLowerCase();
    return subjects.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(kw) ||
                          s.code.toLowerCase().includes(kw) ||
                          s.description.toLowerCase().includes(kw);
      const matchDept = subjectDeptFilter === 'all' || s.department === subjectDeptFilter;
      return matchSearch && matchDept;
    });
  }, [subjects, subjectSearch, subjectDeptFilter]);

  const filteredGrades = useMemo(() => {
    const kw = gradeSearch.trim().toLowerCase();
    return grades.filter(g => {
      return g.name.toLowerCase().includes(kw) ||
             g.code.toLowerCase().includes(kw) ||
             g.description.toLowerCase().includes(kw);
    }).sort((a,b) => a.displayOrder - b.displayOrder);
  }, [grades, gradeSearch]);

  const filteredLevels = useMemo(() => {
    const kw = levelSearch.trim().toLowerCase();
    return levels.filter(l => {
      return l.name.toLowerCase().includes(kw) ||
             l.code.toLowerCase().includes(kw) ||
             l.description.toLowerCase().includes(kw);
    });
  }, [levels, levelSearch]);

  const filteredQuestionTypes = useMemo(() => {
    const kw = typeSearch.trim().toLowerCase();
    return questionTypes.filter(t => {
      return t.name.toLowerCase().includes(kw) ||
             t.code.toLowerCase().includes(kw) ||
             t.description.toLowerCase().includes(kw);
    });
  }, [questionTypes, typeSearch]);

  // -----------------------------------------------------------------
  // 4. ACTION CONTROLLERS (SUBJECT MANAGEMENT)
  // -----------------------------------------------------------------
  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveCategoryId(null);
    form.resetFields();
    
    // Set some nice default fields depending on the active tab
    if (currentTabKey === 'danh-muc-mon-hoc') {
      form.setFieldsValue({ department: 'Tự nhiên', status: 'active' });
    } else if (currentTabKey === 'danh-muc-khoi-lop') {
      form.setFieldsValue({ displayOrder: grades.length + 1, status: 'active' });
    } else if (currentTabKey === 'cap-do-tu-duy') {
      form.setFieldsValue({ color: 'blue', pointMultiplier: 1.0, status: 'active' });
    } else if (currentTabKey === 'loai-hinh-cau-hoi') {
      form.setFieldsValue({ autoGrading: true, scoreWeight: 1.0, status: 'active' });
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setModalMode('edit');
    setActiveCategoryId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleSaveForm = () => {
    form.validateFields().then(values => {
      if (currentTabKey === 'danh-muc-mon-hoc') {
        if (modalMode === 'create') {
          const newItem: SubjectItem = {
            id: `sub-${Date.now()}`,
            code: values.code.toUpperCase().trim(),
            name: values.name.trim(),
            description: values.description || '',
            department: values.department,
            questionCount: 0,
            status: values.status
          };
          setSubjects(prev => [newItem, ...prev]);
          message.success(`Đã thêm mới môn học "${newItem.name}" vào hệ thống.`);
        } else {
          setSubjects(prev => prev.map(item => item.id === activeCategoryId ? { ...item, ...values, code: values.code.toUpperCase() } : item));
          message.success('Cập nhật môn học thành công.');
        }
      } 
      
      else if (currentTabKey === 'danh-muc-khoi-lop') {
        if (modalMode === 'create') {
          const newItem: GradeItem = {
            id: `gr-${Date.now()}`,
            code: values.code.toUpperCase().trim(),
            name: values.name.trim(),
            description: values.description || '',
            displayOrder: parseInt(values.displayOrder) || 1,
            status: values.status
          };
          setGrades(prev => [...prev, newItem]);
          message.success(`Đã gán thành công khối lớp học mới: "${newItem.name}".`);
        } else {
          setGrades(prev => prev.map(item => item.id === activeCategoryId ? { ...item, ...values, displayOrder: parseInt(values.displayOrder), code: values.code.toUpperCase() } : item));
          message.success('Cập nhật cấu hình khối học thành công.');
        }
      } 
      
      else if (currentTabKey === 'cap-do-tu-duy') {
        if (modalMode === 'create') {
          const newItem: CognitiveLevelItem = {
            id: `lv-${Date.now()}`,
            code: values.code.toUpperCase().trim(),
            name: values.name.trim(),
            description: values.description || '',
            pointMultiplier: parseFloat(values.pointMultiplier) || 1.0,
            color: values.color,
            status: values.status
          };
          setLevels(prev => [...prev, newItem]);
          message.success(`Đã khởi tạo chuẩn tư duy đánh giá mới: ${newItem.name}`);
        } else {
          setLevels(prev => prev.map(item => item.id === activeCategoryId ? { ...item, ...values, pointMultiplier: parseFloat(values.pointMultiplier), code: values.code.toUpperCase() } : item));
          message.success('Cập nhật chỉ tiêu cấp độ tư duy thành công.');
        }
      } 
      
      else if (currentTabKey === 'loai-hinh-cau-hoi') {
        if (modalMode === 'create') {
          const newItem: QuestionTypeItem = {
            id: `tp-${Date.now()}`,
            code: values.code.toUpperCase().trim(),
            name: values.name.trim(),
            description: values.description || '',
            autoGrading: values.autoGrading,
            scoreWeight: parseFloat(values.scoreWeight) || 1.0,
            status: values.status
          };
          setQuestionTypes(prev => [...prev, newItem]);
          message.success(`Đã đăng ký thêm danh mục phân loại câu hỏi mới: ${newItem.name}`);
        } else {
          setQuestionTypes(prev => prev.map(item => item.id === activeCategoryId ? { ...item, ...values, scoreWeight: parseFloat(values.scoreWeight) } : item));
          message.success('Cập nhật hướng dẫn loại hình câu hỏi thành công.');
        }
      }

      setIsModalOpen(false);
    }).catch(err => {
      console.error('Validation failed:', err);
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (currentTabKey === 'danh-muc-mon-hoc') {
      const target = subjects.find(s => s.id === id);
      if (target && target.questionCount > 0) {
        message.error(`Không thể xóa môn học "${name}" vì có ${target.questionCount} câu hỏi đang liên kết hoạt động!`);
        return;
      }
      setSubjects(prev => prev.filter(s => s.id !== id));
      message.success(`Đã thu hồi danh mục môn học: ${name}`);
    } else if (currentTabKey === 'danh-muc-khoi-lop') {
      setGrades(prev => prev.filter(g => g.id !== id));
      message.success(`Đã xóa khối lớp "${name}" khỏi bản đồ khối.`);
    } else if (currentTabKey === 'cap-do-tu-duy') {
      setLevels(prev => prev.filter(l => l.id !== id));
      message.success(`Đã gỡ định danh cấp độ tư duy: ${name}`);
    } else if (currentTabKey === 'loai-hinh-cau-hoi') {
      setQuestionTypes(prev => prev.filter(t => t.id !== id));
      message.success(`Đã loại bỏ phân loại câu hỏi: ${name}`);
    }
  };

  const handleToggleStatus = (record: any) => {
    const updatedStatus = record.status === 'active' ? 'inactive' : 'active';
    
    if (currentTabKey === 'danh-muc-mon-hoc') {
      setSubjects(prev => prev.map(s => s.id === record.id ? { ...s, status: updatedStatus } : s));
    } else if (currentTabKey === 'danh-muc-khoi-lop') {
      setGrades(prev => prev.map(g => g.id === record.id ? { ...g, status: updatedStatus } : g));
    } else if (currentTabKey === 'cap-do-tu-duy') {
      setLevels(prev => prev.map(l => l.id === record.id ? { ...l, status: updatedStatus } : l));
    } else if (currentTabKey === 'loai-hinh-cau-hoi') {
      setQuestionTypes(prev => prev.map(t => t.id === record.id ? { ...t, status: updatedStatus } : t));
    }

    const colorLabel = updatedStatus === 'active' ? '🟢 HOẠT ĐỘNG' : '🔴 KHÓA TẠM THỜI';
    message.warning(`Đã gán trạng thái mới cho "${record.name}" sang: ${colorLabel}`);
  };

  // Helper title renderer as string
  const getTabTitle = () => {
    switch (currentTabKey) {
      case 'danh-muc-mon-hoc': return 'Danh mục môn học';
      case 'danh-muc-khoi-lop': return 'Danh mục khối lớp';
      case 'cap-do-tu-duy': return 'Cấp độ tư duy đào tạo';
      case 'loai-hinh-cau-hoi': return 'Loại hình thiết kế câu hỏi';
      default: return 'Quản trị danh mục';
    }
  };

  const getTabDescription = () => {
    switch (currentTabKey) {
      case 'danh-muc-mon-hoc': return 'Quản lý chuẩn hóa mã môn học quốc gia, gán ghép khoa ban tự nhiên/xã hội và theo dõi trữ lượng tài nguyên ngân hàng.';
      case 'danh-muc-khoi-lop': return 'Thiết lập danh mục các năm học, phân phối thứ tự đào tạo và gán nhãn phân cấp cho các đề thi học và khảo sát.';
      case 'cap-do-tu-duy': return 'Chuẩn hóa định danh 4 cấp bậc tư duy của thang đo Bloom mở rộng, cho điểm hệ số ma trận và gán mã nhận diện đồ họa.';
      case 'loai-hinh-cau-hoi': return 'Quản lý phương thức ra đề thi: trắc nghiệm (MCQ), trắc nghiệm đúng sai, tự luận đáp số và quy đổi trọng số tự động.';
      default: return 'Cấu hình, phân luồng các nhãn dán định danh cốt lõi cho hệ sinh thái quản lý đề thi.';
    }
  };

  return (
    <div className="space-y-6" id="label-category-administrative-module">

      {/* ========================================================== */}
      {/* VIEW PANEL 1: SUBJECTS MANAGEMENT                          */}
      {/* ========================================================== */}
      {currentTabKey === 'danh-muc-mon-hoc' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucMonHoc />
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW PANEL 2: GRADES MANAGEMENT                            */}
      {/* ========================================================== */}
      {currentTabKey === 'danh-muc-khoi-lop' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucKhoiLop />
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW PANEL 3: COGNITIVE LEVELS MANAGEMENT                   */}
      {/* ========================================================== */}
      {currentTabKey === 'cap-do-tu-duy' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucCapDoTuDuy />
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW PANEL 4: QUESTION TYPES MANAGEMENT                      */}
      {/* ========================================================== */}
      {currentTabKey === 'loai-hinh-cau-hoi' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucLoaiHinhCauHoi />
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW PANEL 5: COMPETENCY COMPONENT MANAGEMENT                      */}
      {/* ========================================================== */}
      {currentTabKey === 'thanh-phan-nang-luc' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucThanhPhanNangLuc />
        </div>
      )}

      {/* ========================================================== */}
      {/* VIEW PANEL 6: EXAM SESSION MANAGEMENT                      */}
      {/* ========================================================== */}
      {currentTabKey === 'danh-muc-dot-thi' && (
        <div className="animate-in fade-in duration-300">
          <DanhMucDotThi />
        </div>
      )}

      {/* ========================================================== */}
      {/* GLOBAL MODAL DIALOG FOR CRUD                               */}
      {/* ========================================================== */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5 select-none">
            <SettingOutlined className="text-[#002147]" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">
              {modalMode === 'create' ? 'KHAI BÁO / KHỞI TẠO MẪU DANH MỤC MỚI' : 'CẬP NHẬT THÔNG TIN DANH MỤC CHI TIẾT'}
            </span>
          </div>
        }
        open={isModalOpen}
        forceRender
        onOk={handleSaveForm}
        onCancel={() => setIsModalOpen(false)}
        okText={modalMode === 'create' ? 'Lưu ghi nhận' : 'Cập nhật ngay'}
        cancelText="Đóng cửa sổ"
        centered
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4 text-xs font-medium"
          id="category-item-crud-form"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label={<span className="text-[11px] font-bold text-slate-700">Mã ký hiệu đặc chủng (Viết liền, không dấu)</span>}
                rules={[{ required: true, message: 'Vui lòng cung cấp mã kí tự định danh!' }]}
              >
                <Input placeholder="Ví dụ: TOAN-12, K10, VDC..." className="rounded-lg text-xs font-semibold py-1.5 uppercase" />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="name"
                label={<span className="text-[11px] font-bold text-slate-700">Tên gọi chính thức định dạng</span>}
                rules={[{ required: true, message: 'Vui lòng điền tên danh mục dán nhãn!' }]}
              >
                <Input placeholder="Ví dụ: Môn Toán, Lớp 10, Nhận biết..." className="rounded-lg text-xs font-semibold py-1.5" />
              </Form.Item>
            </Col>
          </Row>

          {/* Conditional parameters fields depending on active categorization key */}
          {currentTabKey === 'danh-muc-mon-hoc' && (
            <Form.Item
              name="department"
              label={<span className="text-[11px] font-bold text-slate-700">Phân loại tổ khoa ban</span>}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'Tự nhiên', label: '📐 Khoa học Tự nhiên' },
                  { value: 'Xã hội', label: '✒️ Khoa học Xã hội' },
                  { value: 'Ngoại ngữ', label: '🌐 Ngôn ngữ nước ngoài' }
                ]}
                className="text-xs font-semibold"
              />
            </Form.Item>
          )}

          {currentTabKey === 'danh-muc-khoi-lop' && (
            <Form.Item
              name="displayOrder"
              label={<span className="text-[11px] font-bold text-slate-700">Thứ tự hiển thị phân khối lớp</span>}
              rules={[{ required: true, message: 'Vui lòng điền số thứ tự xây dựng!' }]}
            >
              <Input type="number" min={1} className="rounded-lg text-xs font-semibold py-1.5" />
            </Form.Item>
          )}

          {currentTabKey === 'cap-do-tu-duy' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pointMultiplier"
                  label={<span className="text-[11px] font-bold text-slate-700">Chỉ số nhân trọng số Bloom</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập trọng số!' }]}
                >
                  <Input type="number" step={0.1} min={1.0} max={5.0} className="rounded-lg text-xs font-semibold py-1.5" />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="color"
                  label={<span className="text-[11px] font-bold text-slate-700">Gán mã màu nhận diện graphics</span>}
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { value: 'blue', label: '🔵 Xanh dương nhạt' },
                      { value: 'cyan', label: '🟢 Xanh lơ sáng' },
                      { value: 'orange', label: '🟠 Cam rực rỡ' },
                      { value: 'red', label: '🔴 Đỏ cảnh báo' },
                      { value: 'purple', label: '🟣 Tím hoàng cung' },
                      { value: 'gold', label: '🟡 Vàng ánh kim' }
                    ]}
                    className="text-xs font-semibold"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {currentTabKey === 'loai-hinh-cau-hoi' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="autoGrading"
                  label={<span className="text-[11px] font-bold text-slate-700">Cho phép chấm điểm tự động hay không?</span>}
                  valuePropName="checked"
                >
                  <Switch checkedChildren="Cho phép" unCheckedChildren="Tự luận thô" className="bg-slate-350" />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  name="scoreWeight"
                  label={<span className="text-[11px] font-bold text-slate-700">Trọng số cơ bản mặc định (P)</span>}
                  rules={[{ required: true }]}
                >
                  <Input type="number" step={0.1} min={0.5} max={10.0} className="rounded-lg text-xs font-semibold py-1.5" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="description"
            label={<span className="text-[11px] font-bold text-slate-700">Mô tả chi tiết mục dán nhãn hành chính</span>}
          >
            <Input.TextArea placeholder="Ghi nhận tóm tắt khái quát vai trò hoặc chức năng dán nhãn của danh mục..." rows={3} className="rounded-lg text-xs font-semibold" />
          </Form.Item>

          <Form.Item
            name="status"
            label={<span className="text-[11px] font-bold text-slate-700">Trạng thái phát hành</span>}
            valuePropName="checked"
            getValueProps={(value) => ({ checked: value === 'active' })}
            getValueFromEvent={(checked) => (checked ? 'active' : 'inactive')}
          >
            <Switch checkedChildren="🟢 Kích hoạt sử dụng" unCheckedChildren="🔴 Tạm dừng lưu hành" className="bg-slate-350" />
          </Form.Item>

        </Form>
      </Modal>

    </div>
  );
}
