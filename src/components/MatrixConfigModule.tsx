import React, { useState, useEffect, useMemo } from 'react';
import { 
  Input, 
  InputNumber, 
  Select, 
  Button, 
  Table, 
  message, 
  Modal, 
  Spin, 
  Tag, 
  Badge, 
  Tooltip, 
  Steps, 
  Popconfirm,
  Space,
  Empty
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  CalculatorOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ProjectOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ArrowLeftOutlined,
  CheckCircleTwoTone,
  WarningOutlined,
  SearchOutlined,
  SlidersOutlined
} from '@ant-design/icons';
import { MatrixConfig, MatrixRow, Question, SubjectOption, GradeOption, TopicNode } from '../types';
import { SUBJECTS, GRADES, TOPICS_TREE } from '../data';

interface MatrixConfigModuleProps {
  matrices: MatrixConfig[];
  onSaveMatrix: (matrix: MatrixConfig) => void;
  onDeleteMatrix: (id: string) => void;
  questions: Question[];
}

export default function MatrixConfigModule({ 
  matrices, 
  onSaveMatrix, 
  onDeleteMatrix, 
  questions 
}: MatrixConfigModuleProps) {
  
  // View states
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  
  // List Searching & Filtering states
  const [searchText, setSearchText] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Selected config for Editor
  const [editingMatrixId, setEditingMatrixId] = useState<string | null>(null);

  // Form Fields
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [selectedGrade, setSelectedGrade] = useState<string>('Khối 12');
  const [matrixName, setMatrixName] = useState('');
  const [matrixCode, setMatrixCode] = useState('');
  const [originalExamsCount, setOriginalExamsCount] = useState(4);

  // Store matrix inputs matching topic ID: {[topicId]: {nhanBiet, thongHieu, vanDung, vanDungCao}}
  const [matrixCellValues, setMatrixCellValues] = useState<{
    [topicId: string]: {
      nhanBiet: number;
      thongHieu: number;
      vanDung: number;
      vanDungCao: number;
    };
  }>({});

  // Get current topics based on form's selected subject
  const currentTopics = useMemo(() => {
    const subjectTopics = TOPICS_TREE[selectedSubject] || [];
    const flattened: { id: string; name: string }[] = [];
    subjectTopics.forEach(tp => {
      if (tp.children) {
        tp.children.forEach(sub => {
          flattened.push({ id: sub.key, name: sub.title });
        });
      } else {
        flattened.push({ id: tp.key, name: tp.title });
      }
    });

    if (flattened.length === 0) {
      return [
        { id: 'fb-1', name: 'Chủ đề tổng hợp số 1' },
        { id: 'fb-2', name: 'Chủ đề lý thuyết thực nghiệm nâng cao' }
      ];
    }
    return flattened;
  }, [selectedSubject]);

  // Compute live stock of questions inside the bank categorized by (topicId, level)
  const bankStock = useMemo(() => {
    const stock: { 
      [topicId: string]: { 
        nhanBiet: number; 
        thongHieu: number; 
        vanDung: number; 
        vanDungCao: number; 
      } 
    } = {};
    
    currentTopics.forEach(tp => {
      stock[tp.id] = {
        nhanBiet: questions.filter(q => q.subject === selectedSubject && q.grade === selectedGrade && q.topicId === tp.id && q.level === 'nhan_biet').length,
        thongHieu: questions.filter(q => q.subject === selectedSubject && q.grade === selectedGrade && q.topicId === tp.id && q.level === 'thong_hieu').length,
        vanDung: questions.filter(q => q.subject === selectedSubject && q.grade === selectedGrade && q.topicId === tp.id && q.level === 'van_dung').length,
        vanDungCao: questions.filter(q => q.subject === selectedSubject && q.grade === selectedGrade && q.topicId === tp.id && q.level === 'van_dung_cao').length,
      };
    });
    
    return stock;
  }, [questions, selectedSubject, selectedGrade, currentTopics]);

  // Handle opening Editor for a NEW matrix draft
  const handleCreateNewMatrix = () => {
    const tempId = `mtr-id-${Date.now()}`;
    setEditingMatrixId(tempId);
    setMatrixCode(`MTR-${Date.now().toString().slice(-6)}`);
    setMatrixName('Cấu hình ma trận đề khảo sát mới');
    setSelectedSubject('Toán học');
    setSelectedGrade('Khối 12');
    setOriginalExamsCount(4);

    // Initial allocations default
    const tempCells: typeof matrixCellValues = {};
    const defaultTopics = TOPICS_TREE['Toán học'] || [];
    const flattenedIds: string[] = [];
    defaultTopics.forEach(tp => {
      if (tp.children) {
        tp.children.forEach(sub => flattenedIds.push(sub.key));
      } else {
        flattenedIds.push(tp.key);
      }
    });

    flattenedIds.forEach(id => {
      tempCells[id] = { nhanBiet: 3, thongHieu: 2, vanDung: 1, vanDungCao: 0 };
    });
    setMatrixCellValues(tempCells);
    setViewMode('editor');
  };

  // Handle editing an existing configuration
  const handleEditMatrixConfig = (matrix: MatrixConfig) => {
    setEditingMatrixId(matrix.id);
    setMatrixCode(matrix.code);
    setMatrixName(matrix.name);
    setSelectedSubject(matrix.subject);
    setSelectedGrade(matrix.grade);
    setOriginalExamsCount(matrix.originalExamsCount);

    // Populate values
    const initialValues: typeof matrixCellValues = {};
    const subjectTopics = TOPICS_TREE[matrix.subject] || [];
    const flattened: { id: string; name: string }[] = [];
    subjectTopics.forEach(tp => {
      if (tp.children) {
        tp.children.forEach(sub => flattened.push({ id: sub.key, name: sub.title }));
      } else {
        flattened.push({ id: tp.key, name: tp.title });
      }
    });

    flattened.forEach((tp) => {
      const matchInSaved = matrix.rows.find(row => row.topicId === tp.id);
      initialValues[tp.id] = matchInSaved ? { ...matchInSaved.cells } : { 
        nhanBiet: 1, 
        thongHieu: 1, 
        vanDung: 0, 
        vanDungCao: 0 
      };
    });

    setMatrixCellValues(initialValues);
    setViewMode('editor');
  };

  // Handle cloning a matrix structure
  const handleCloneMatrix = (matrix: MatrixConfig) => {
    const cloned: MatrixConfig = {
      ...matrix,
      id: `mtr-clone-${Date.now()}`,
      code: `${matrix.code}-CLONE`,
      name: `${matrix.name} (Bản sao)`
    };
    onSaveMatrix(cloned);
    message.success(`Đã nhân bản ma trận "${matrix.code}" thành công!`);
  };

  // Update cell change in editor
  const handleCellValueChange = (topicId: string, level: 'nhanBiet' | 'thongHieu' | 'vanDung' | 'vanDungCao', value: number | null) => {
    const val = value || 0;
    setMatrixCellValues(prev => ({
      ...prev,
      [topicId]: {
        ...prev[topicId],
        [level]: val
      }
    }));
  };

  // Reset or adjust cells when changing subject on the editor form
  const handleFormSubjectChange = (subjectValue: string) => {
    setSelectedSubject(subjectValue);
    // Reset inputs with safety defaults for the secondary subject
    const subjectTopics = TOPICS_TREE[subjectValue] || [];
    const flattened: string[] = [];
    subjectTopics.forEach(tp => {
      if (tp.children) {
        tp.children.forEach(sub => flattened.push(sub.key));
      } else {
        flattened.push(tp.key);
      }
    });

    const refreshed: typeof matrixCellValues = {};
    flattened.forEach(id => {
      refreshed[id] = { nhanBiet: 3, thongHieu: 2, vanDung: 1, vanDungCao: 0 };
    });
    setMatrixCellValues(refreshed);
  };

  // Accumulate editor sums
  const editorTotals = useMemo(() => {
    let nhanBiet = 0;
    let thongHieu = 0;
    let vanDung = 0;
    let vanDungCao = 0;

    Object.values(matrixCellValues).forEach((cell: any) => {
      if (cell) {
        nhanBiet += cell.nhanBiet || 0;
        thongHieu += cell.thongHieu || 0;
        vanDung += cell.vanDung || 0;
        vanDungCao += cell.vanDungCao || 0;
      }
    });

    const total = nhanBiet + thongHieu + vanDung + vanDungCao;
    return { nhanBiet, thongHieu, vanDung, vanDungCao, total };
  }, [matrixCellValues]);

  // Save changes from Editor 
  const handleSaveEditorMatrix = () => {
    if (!matrixName.trim() || !matrixCode.trim()) {
      message.error('Vui lòng điền mã số và tiêu đề cấu hình ma trận đề!');
      return;
    }

    const rows: MatrixRow[] = currentTopics.map(tp => {
      const cell = matrixCellValues[tp.id] || { nhanBiet: 0, thongHieu: 0, vanDung: 0, vanDungCao: 0 };
      return {
        topicId: tp.id,
        topicName: tp.name,
        cells: cell
      };
    });

    const item: MatrixConfig = {
      id: editingMatrixId || `mtr-made-${Date.now()}`,
      code: matrixCode.toUpperCase(),
      name: matrixName,
      subject: selectedSubject,
      grade: selectedGrade,
      originalExamsCount: originalExamsCount,
      rows: rows
    };

    onSaveMatrix(item);
    message.success(`Lưu thành công cấu hình ma trận đề: "${matrixName}"`);
    setViewMode('list');
  };

  // Automated AI Exam generation states
  const [isExamGenerating, setIsExamGenerating] = useState(false);
  const [activeGenMatrix, setActiveGenMatrix] = useState<MatrixConfig | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationResults, setGenerationResults] = useState<{
    success: boolean;
    examCodeList: string[];
    compiledFileUrl: string;
  } | null>(null);

  // Trigger generator modal
  const handleTriggerAIEngine = (matrix: MatrixConfig) => {
    // Calculative check of rows
    let totalQuestionsInMatrix = 0;
    matrix.rows.forEach(r => {
      totalQuestionsInMatrix += r.cells.nhanBiet + r.cells.thongHieu + r.cells.vanDung + r.cells.vanDungCao;
    });

    if (totalQuestionsInMatrix === 0) {
      message.warning('Mẫu ma trận này chưa khai báo số lượng câu hỏi chỉ tiêu! Vui lòng sửa cấu hình trước.');
      return;
    }

    setActiveGenMatrix(matrix);
    setIsExamGenerating(true);
    setGenerationStep(0);
    setGenerationResults(null);

    // AI Simulation Flow
    setTimeout(() => setGenerationStep(1), 1200);
    setTimeout(() => setGenerationStep(2), 2400);
    setTimeout(() => {
      setGenerationStep(3);
      setGenerationResults({
        success: true,
        examCodeList: Array.from({ length: matrix.originalExamsCount }, (_, i) => `${matrix.code}-ĐỀ-${201 + i}`),
        compiledFileUrl: '#'
      });
    }, 3800);
  };

  // Check if a saved matrix configuration has shortage in the current questions pool
  const getMatrixShortageStatus = (matrix: MatrixConfig) => {
    let shortages = 0;
    matrix.rows.forEach(row => {
      // Find matching items in global questions array
      const matches = questions.filter(q => q.subject === matrix.subject && q.grade === matrix.grade && q.topicId === row.topicId);
      
      const nhanBietInBank = matches.filter(q => q.level === 'nhan_biet').length;
      const thongHieuInBank = matches.filter(q => q.level === 'thong_hieu').length;
      const vanDungInBank = matches.filter(q => q.level === 'van_dung').length;
      const vanDungCaoInBank = matches.filter(q => q.level === 'van_dung_cao').length;

      if (row.cells.nhanBiet > nhanBietInBank) shortages++;
      if (row.cells.thongHieu > thongHieuInBank) shortages++;
      if (row.cells.vanDung > vanDungInBank) shortages++;
      if (row.cells.vanDungCao > vanDungCaoInBank) shortages++;
    });
    return shortages;
  };

  // Search filter implementation
  const filteredMatrices = useMemo(() => {
    return matrices.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchText.toLowerCase()) || 
                          m.code.toLowerCase().includes(searchText.toLowerCase());
      const matchSubject = filterSubject === 'all' || m.subject === filterSubject;
      const matchGrade = filterGrade === 'all' || m.grade === filterGrade;
      return matchSearch && matchSubject && matchGrade;
    });
  }, [matrices, searchText, filterSubject, filterGrade]);

  // Statistics calculation for Dashboard top cards
  const summaryStats = useMemo(() => {
    const total = matrices.length;
    let totalGeneratedExams = 0;
    let criticalShortages = 0;

    matrices.forEach(m => {
      totalGeneratedExams += m.originalExamsCount;
      if (getMatrixShortageStatus(m) > 0) {
        criticalShortages++;
      }
    });

    return { total, totalGeneratedExams, criticalShortages };
  }, [matrices, questions]);

  return (
    <div className="space-y-6" id="matrix-module-facade">
      
      {/* ========================================== */}
      {/* VIEW: MATRIX DIRECTORY LIST                */}
      {/* ========================================== */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Dashboard section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <ProjectOutlined className="text-[#002147]" />
                QUẢN LÝ MA TRẬN ĐỀ KIỂM TRA & ĐỀ THÍ
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Xây dựng khung phân bổ tiêu chuẩn, tráo số câu hỏi phân cấp kiến thức và sinh tự động đề thi tốt nghiệp.
              </p>
            </div>
            <Button 
              type="primary"
              id="btn-matrix-create-prompt"
              icon={<PlusOutlined />}
              onClick={handleCreateNewMatrix}
              className="bg-[#002147] border-transparent text-white font-extrabold text-xs rounded-xl shadow-none hover:opacity-90 active:scale-95 cursor-pointer ml-auto"
            >
              Thiết lập Ma trận đề mới
            </Button>
          </div>

          {/* Core Analytics bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-xxs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Ma trận đang lưu hành</span>
                <strong className="text-slate-800 text-xl font-black block mt-1">{summaryStats.total} Bản ghi</strong>
              </div>
              <div className="w-10 h-10 bg-slate-50 border rounded-xl flex items-center justify-center text-slate-500 font-black">
                📂
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-xxs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Tổng đề gốc kiểm duyệt</span>
                <strong className="text-[#002147] text-xl font-black block mt-1">{summaryStats.totalGeneratedExams} Thẻ mã</strong>
              </div>
              <div className="w-10 h-10 bg-blue-50 border rounded-xl flex items-center justify-center text-[#002147] font-black">
                📄
              </div>
            </div>
            <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-xxs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Ma trận thiếu câu hỏi trong kho</span>
                <strong className={`text-xl font-black block mt-1 ${summaryStats.criticalShortages > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {summaryStats.criticalShortages} Ma trận
                </strong>
              </div>
              <div className={`w-10 h-10 border rounded-xl flex items-center justify-center font-black ${
                summaryStats.criticalShortages > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {summaryStats.criticalShortages > 0 ? '⚠️' : '✓'}
              </div>
            </div>
          </div>

          {/* Dynamic Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
            
            <div className="w-full md:w-1/3 relative">
              <Input
                placeholder="Tìm mã ma trận hoặc tên cấu hình..."
                prefix={<SearchOutlined className="text-slate-400" />}
                className="rounded-xl border-slate-200 text-xs font-semibold"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
            </div>

            <div className="w-full md:w-1/4 flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Môn:</span>
              <Select
                value={filterSubject}
                onChange={setFilterSubject}
                className="w-full text-xs font-semibold"
                options={[
                  { value: 'all', label: 'Tất cả môn thi' },
                  ...SUBJECTS
                ]}
              />
            </div>

            <div className="w-full md:w-1/4 flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Khối:</span>
              <Select
                value={filterGrade}
                onChange={setFilterGrade}
                className="w-full text-xs font-semibold"
                options={[
                  { value: 'all', label: 'Tất cả khối học' },
                  ...GRADES
                ]}
              />
            </div>

            <Button 
              type="text"
              icon={<SlidersOutlined />}
              onClick={() => {
                setSearchText('');
                setFilterSubject('all');
                setFilterGrade('all');
                message.info('Đã hoàn nhập các bộ lọc tìm kiếm.');
              }}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-500 rounded-xl font-bold cursor-pointer hover:bg-slate-100"
            >
              Reset
            </Button>
          </div>

          {/* Directory Listings Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-xs font-medium text-slate-750 border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  <th className="py-3 px-4 text-left">Mã thiết lập</th>
                  <th className="py-3 px-4 text-left">Tên cấu hình ma trận đề thi</th>
                  <th className="py-3 px-4 text-center">Môn thi & Lớp</th>
                  <th className="py-3 px-4 text-center">Số đề gốc</th>
                  <th className="py-3 px-4 text-center">Tổng chỉ số câu</th>
                  <th className="py-3 px-4 text-center">Hiện trạng Kho</th>
                  <th className="py-3 px-4 text-right">Thực thi nghiệp vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatrices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Empty description="Không tìm thấy cấu hình ma trận đề thi nào phù hợp." />
                    </td>
                  </tr>
                ) : (
                  filteredMatrices.map(matrix => {
                    const shortages = getMatrixShortageStatus(matrix);
                    
                    // Sum total questions in matrix
                    let sum = 0;
                    matrix.rows.forEach(r => {
                      sum += r.cells.nhanBiet + r.cells.thongHieu + r.cells.vanDung + r.cells.vanDungCao;
                    });

                    return (
                      <tr key={matrix.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-mono font-black text-[#002147] text-[11px] uppercase">
                          {matrix.code}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800 text-[12px] max-w-sm">
                          {matrix.name}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <Space size={4}>
                            <Tag className="bg-slate-100 border-slate-200 text-slate-600 rounded-md font-bold text-[9px] uppercase">
                              {matrix.subject}
                            </Tag>
                            <Tag className="bg-blue-50 border-blue-100 text-blue-800 rounded-md font-bold text-[9px] uppercase">
                              {matrix.grade}
                            </Tag>
                          </Space>
                        </td>
                        <td className="py-4 px-4 text-center font-extrabold text-[#002147] text-[12px]">
                          {matrix.originalExamsCount} đề
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block bg-indigo-50 border border-indigo-150 text-indigo-950 px-2.5 py-0.5 rounded-full font-black text-[12px]">
                            {sum} câu
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {shortages > 0 ? (
                            <Tooltip title={`Có ${shortages} mức độ chỉ tiêu vượt quá số lượng câu hỏi hiện tại trong ngân hàng!`}>
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase">
                                ⚠️ Thiếu hụt câu ({shortages})
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase">
                              ✓ Đủ chỉ tiêu
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Space size={6} className="justify-end">
                            <Tooltip title="Chỉnh sửa chi tiết ma trận">
                              <Button 
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditMatrixConfig(matrix)}
                                className="bg-slate-50 border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                              />
                            </Tooltip>
                            
                            <Tooltip title="Nhân bản ma trận này">
                              <Button 
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => handleCloneMatrix(matrix)}
                                className="bg-slate-50 border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                              />
                            </Tooltip>

                            <Tooltip title="Tiến hành sinh đề bằng AI">
                              <Button 
                                size="small"
                                type="primary"
                                icon={<ThunderboltOutlined />}
                                onClick={() => handleTriggerAIEngine(matrix)}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 border-transparent text-white rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer"
                              />
                            </Tooltip>

                            <Popconfirm
                              title="Bạn có chắc chắn muốn gỡ bỏ ma trận đề thi này?"
                              onConfirm={() => onDeleteMatrix(matrix.id)}
                              okText="Có, xóa đi"
                              cancelText="Hủy bỏ"
                              centered
                            >
                              <Button 
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                className="bg-red-50 border-red-150 text-red-600 rounded-lg text-xs hover:bg-red-100 cursor-pointer"
                              />
                            </Popconfirm>
                          </Space>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* VIEW: MATRIX CONFIGURATION EDITOR / DRAWER */}
      {/* ========================================== */}
      {viewMode === 'editor' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          
          {/* Editor Header Navigation bar */}
          <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => setViewMode('list')}
              className="rounded-xl bg-slate-50 border-slate-200 text-slate-500 font-extrabold text-xs cursor-pointer hover:bg-slate-100"
            >
              Hủy bỏ, Quay lại danh sách
            </Button>
            <div className="text-center">
              <strong className="text-slate-800 text-xs font-black uppercase block tracking-wider">
                {editingMatrixId?.startsWith('mtr-id-') ? 'THIẾT LẬP MA TRẬN MỚI' : 'SỬA ĐỔI MA TRẬN PHÂN BỔ'}
              </strong>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest">{matrixCode}</span>
            </div>
            <Button 
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveEditorMatrix}
              className="bg-[#002147] border-transparent text-white font-extrabold text-xs rounded-xl hover:opacity-90 shadow-none cursor-pointer"
            >
              Lưu thiết lập
            </Button>
          </div>

          {/* Configuration Fields Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-dashed pb-2.5">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 my-0">THÔNG TIN CHUNG MA TRẬN ĐỀ</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tên ma trận đề thi</label>
                <Input
                  id="editor-matrix-name"
                  placeholder="Nhập tên ma trận đề (Ví dụ: Đề thi khảo sát Toán khối 12)"
                  className="rounded-xl border-slate-200 text-xs font-bold py-1.5 text-slate-800"
                  value={matrixName}
                  onChange={(e) => setMatrixName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Mã ma trận</label>
                <Input
                  id="editor-matrix-code"
                  placeholder="Ví dụ: MTR-TOAN-12"
                  className="rounded-xl border-slate-200 text-xs font-mono font-bold py-1.5 uppercase text-slate-800"
                  value={matrixCode}
                  onChange={(e) => setMatrixCode(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Môn thi</label>
                <Select
                  id="editor-subject-select"
                  value={selectedSubject}
                  onChange={handleFormSubjectChange}
                  options={SUBJECTS}
                  className="w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Khối lớp học</label>
                <Select
                  id="editor-grade-select"
                  value={selectedGrade}
                  onChange={setSelectedGrade}
                  options={GRADES}
                  className="w-full text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 items-end">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Số lượng đề gốc cần sinh (Bộ biến thể)</label>
                <InputNumber
                  id="editor-exams-count-input"
                  min={1}
                  max={12}
                  value={originalExamsCount}
                  onChange={(val) => setOriginalExamsCount(val || 1)}
                  className="w-full rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="md:col-span-2 bg-blue-50/60 border border-blue-150 p-3 rounded-xl flex items-center justify-between text-xs text-[#002147] font-medium leading-relaxed">
                <span>
                  💡 Hệ thống đang đối soát dữ hiệu trực tiếp với ngân hàng câu hỏi môn <strong>{selectedSubject} ({selectedGrade})</strong>.
                </span>
                <Tag color="cyan" className="text-[9px] font-bold uppercase m-0 shrink-0">Live Sync Active</Tag>
              </div>
            </div>
          </div>

          {/* Matrix Parameters grid with indicators check */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 pr-3">
              <div className="flex items-center gap-2">
                <CalculatorOutlined className="text-[#002147]" />
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Bảng chi tiết phân bổ câu hỏi & đối soát kho</span>
                  <span className="text-[10px] text-slate-400 font-medium">Bố trí số câu hỏi theo từng tiểu mục chủ đề và mức độ nhận thức (kiểm tra đầy đủ rào cản số lượng)</span>
                </div>
              </div>
              
              <div className="text-xs font-bold text-slate-700 bg-slate-150 bg-slate-100/80 px-3 py-1 rounded-lg">
                Tổng chỉ tiêu: <strong className="text-blue-900 font-black text-sm">{editorTotals.total}</strong> câu hỏi
              </div>
            </div>

            <table className="w-full text-xs font-medium text-slate-750 border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                  <th className="py-3 px-4 text-left w-[44%]">Chủ đề / Tiểu mục kiến thức chi tiết</th>
                  <th className="py-3 px-3 text-center bg-blue-50/40 w-[12%] text-[#002147]">Nhận biết</th>
                  <th className="py-3 px-3 text-center bg-emerald-50/40 w-[12%] text-emerald-950">Thông hiểu</th>
                  <th className="py-3 px-3 text-center bg-purple-50/40 w-[12%] text-purple-950">Vận dụng</th>
                  <th className="py-3 px-3 text-center bg-rose-50/40 w-[12%] text-rose-950">Vận dụng cao</th>
                  <th className="py-3 px-4 text-right bg-slate-100/50 w-[10%] text-slate-800">Cộng dòng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTopics.map((tp) => {
                  const rowValues = matrixCellValues[tp.id] || { nhanBiet: 0, thongHieu: 0, vanDung: 0, vanDungCao: 0 };
                  const rowSum = rowValues.nhanBiet + rowValues.thongHieu + rowValues.vanDung + rowValues.vanDungCao;
                  const stock = bankStock[tp.id] || { nhanBiet: 0, thongHieu: 0, vanDung: 0, vanDungCao: 0 };

                  return (
                    <tr key={tp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-800 font-bold text-[11px] leading-snug">
                        {tp.name}
                      </td>
                      
                      {/* Nhận biết column */}
                      <td className="py-3 px-3 bg-blue-50/10 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <InputNumber
                            min={0}
                            max={40}
                            size="small"
                            className={`rounded-lg max-w-[65px] text-xs font-bold ${
                              rowValues.nhanBiet > stock.nhanBiet ? 'border-amber-400 bg-amber-50/30 text-amber-900' : ''
                            }`}
                            value={rowValues.nhanBiet}
                            onChange={(val) => handleCellValueChange(tp.id, 'nhanBiet', val)}
                          />
                          <span className={`text-[9px] font-extrabold ${
                            rowValues.nhanBiet > stock.nhanBiet ? 'text-amber-600 font-black' : 'text-slate-400'
                          }`}>
                            {rowValues.nhanBiet > stock.nhanBiet ? `⚠️ Thiếu (kho: ${stock.nhanBiet})` : `Sẵn có: ${stock.nhanBiet}`}
                          </span>
                        </div>
                      </td>

                      {/* Thông hiểu column */}
                      <td className="py-3 px-3 bg-emerald-50/10 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <InputNumber
                            min={0}
                            max={40}
                            size="small"
                            className={`rounded-lg max-w-[65px] text-xs font-bold ${
                              rowValues.thongHieu > stock.thongHieu ? 'border-amber-400 bg-amber-50/30 text-amber-900' : ''
                            }`}
                            value={rowValues.thongHieu}
                            onChange={(val) => handleCellValueChange(tp.id, 'thongHieu', val)}
                          />
                          <span className={`text-[9px] font-extrabold ${
                            rowValues.thongHieu > stock.thongHieu ? 'text-amber-600 font-black' : 'text-slate-400'
                          }`}>
                            {rowValues.thongHieu > stock.thongHieu ? `⚠️ Thiếu (kho: ${stock.thongHieu})` : `Sẵn có: ${stock.thongHieu}`}
                          </span>
                        </div>
                      </td>

                      {/* Vận dụng column */}
                      <td className="py-3 px-3 bg-purple-50/10 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <InputNumber
                            min={0}
                            max={40}
                            size="small"
                            className={`rounded-lg max-w-[65px] text-xs font-bold ${
                              rowValues.vanDung > stock.vanDung ? 'border-amber-400 bg-amber-50/30 text-amber-900' : ''
                            }`}
                            value={rowValues.vanDung}
                            onChange={(val) => handleCellValueChange(tp.id, 'vanDung', val)}
                          />
                          <span className={`text-[9px] font-extrabold ${
                            rowValues.vanDung > stock.vanDung ? 'text-amber-600 font-black' : 'text-slate-400'
                          }`}>
                            {rowValues.vanDung > stock.vanDung ? `⚠️ Thiếu (kho: ${stock.vanDung})` : `Sẵn có: ${stock.vanDung}`}
                          </span>
                        </div>
                      </td>

                      {/* Vận dụng cao column */}
                      <td className="py-3 px-3 bg-rose-50/10 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <InputNumber
                            min={0}
                            max={40}
                            size="small"
                            className={`rounded-lg max-w-[65px] text-xs font-bold ${
                              rowValues.vanDungCao > stock.vanDungCao ? 'border-amber-400 bg-amber-50/30 text-amber-900' : ''
                            }`}
                            value={rowValues.vanDungCao}
                            onChange={(val) => handleCellValueChange(tp.id, 'vanDungCao', val)}
                          />
                          <span className={`text-[9px] font-extrabold ${
                            rowValues.vanDungCao > stock.vanDungCao ? 'text-amber-600 font-black' : 'text-slate-400'
                          }`}>
                            {rowValues.vanDungCao > stock.vanDungCao ? `⚠️ Thiếu (kho: ${stock.vanDungCao})` : `Sẵn có: ${stock.vanDungCao}`}
                          </span>
                        </div>
                      </td>

                      {/* Line Sum column */}
                      <td className="py-3.5 px-4 text-right bg-slate-100/20 font-black text-[13px] text-slate-800 border-l border-slate-100 select-none">
                        {rowSum} câu
                      </td>
                    </tr>
                  );
                })}

                {/* Foot Accumulator display */}
                <tr className="bg-slate-100/50 border-t-2 border-slate-200 select-none">
                  <td className="py-3.5 px-4 text-slate-900 font-extrabold text-[12px] uppercase">Tổng số câu phân bổ (Cột chỉ số)</td>
                  <td className="py-3.5 px-3 text-center text-[#002147] font-black text-[13px] bg-blue-105 bg-blue-100/30">{editorTotals.nhanBiet}</td>
                  <td className="py-3.5 px-3 text-center text-emerald-900 font-black text-[13px] bg-emerald-100/30">{editorTotals.thongHieu}</td>
                  <td className="py-3.5 px-3 text-center text-purple-900 font-black text-[13px] bg-purple-100/30">{editorTotals.vanDung}</td>
                  <td className="py-3.5 px-3 text-center text-rose-900 font-black text-[13px] bg-rose-100/30">{editorTotals.vanDungCao}</td>
                  <td className="py-3.5 px-4 text-right text-indigo-950 font-black text-[14px] bg-indigo-50 border-l border-slate-200">
                    {editorTotals.total} câu
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sticky action tray */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <Button 
              icon={<CloseOutlined />}
              onClick={() => {
                setViewMode('list');
                message.info('Đã thoát trình soạn thảo ma trận đề.');
              }}
              className="rounded-xl text-xs font-extrabold bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Đóng cửa sổ biên soạn
            </Button>

            <div className="flex items-center gap-3">
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                className="bg-blue-600 border-transparent text-white rounded-xl text-xs font-extrabold hover:bg-blue-700 cursor-pointer"
                onClick={handleSaveEditorMatrix}
              >
                Lưu cấu hình Ma trận
              </Button>

              <Button 
                type="primary"
                icon={<ThunderboltOutlined />}
                className="bg-gradient-to-r from-purple-600 via-indigo-600 to-[#002147] border-transparent text-white rounded-xl text-xs font-black hover:opacity-90 active:scale-95 cursor-pointer"
                onClick={() => {
                  // Create temporary saved object to trigger AI simulation directly
                  const rows: MatrixRow[] = currentTopics.map(tp => {
                    const cell = matrixCellValues[tp.id] || { nhanBiet: 0, thongHieu: 0, vanDung: 0, vanDungCao: 0 };
                    return {
                      topicId: tp.id,
                      topicName: tp.name,
                      cells: cell
                    };
                  });
                  const tempConfig: MatrixConfig = {
                    id: editingMatrixId || 'mtr-temp-gen',
                    code: matrixCode.toUpperCase() || 'MTR-TEMP',
                    name: matrixName || 'Ma trận tạm tính',
                    subject: selectedSubject,
                    grade: selectedGrade,
                    originalExamsCount: originalExamsCount,
                    rows: rows
                  };
                  handleTriggerAIEngine(tempConfig);
                }}
              >
                Sinh đề thi thử nghiệm bằng AI
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: AI EXAM GENERATOR WORKSPACE AND PROCESS */}
      {/* ========================================== */}
      {activeGenMatrix && (
        <Modal
          title={
            <div className="flex items-center gap-2 pb-2.5 border-b border-indigo-100">
              <ThunderboltOutlined className="text-purple-600 animate-spin" />
              <span className="font-extrabold text-[13px] uppercase text-slate-800">Trình biên soạn & Phân rã sinh đề tự động bằng AI</span>
            </div>
          }
          open={isExamGenerating}
          onCancel={() => {
            setIsExamGenerating(false);
            setGenerationResults(null);
            setActiveGenMatrix(null);
          }}
          footer={null}
          width={650}
          centered
          className="rounded-2xl"
        >
          <div className="space-y-6 pt-3" id="ai-generator-workspace-body">
            
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Ma trận đề kích hoạt</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 text-xs font-medium text-slate-600">
                <div>
                  <span className="text-slate-400">Tên ma trận:</span>
                  <strong className="text-slate-800 ml-1.5">{activeGenMatrix.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Mã thiết lập:</span>
                  <strong className="text-slate-880 font-mono text-slate-800 ml-1.5 bg-slate-150 px-1 rounded">{activeGenMatrix.code}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Chỉ số cấu trúc:</span>
                  <strong className="text-slate-805 text-slate-800 ml-1.5">
                    {activeGenMatrix.rows.reduce((acc, row) => acc + row.cells.nhanBiet + row.cells.thongHieu + row.cells.vanDung + row.cells.vanDungCao, 0)} câu hỏi / cấu trúc đề
                  </strong>
                </div>
                <div>
                  <span className="text-purple-600">Mục tiêu lắp ráp:</span>
                  <strong className="text-purple-700 ml-1.5 bg-purple-50 border border-purple-150 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                    {activeGenMatrix.originalExamsCount} Đề gốc phân biệt
                  </strong>
                </div>
              </div>
            </div>

            {/* Steps Progress representations */}
            <div id="simulation-steps-tracker" className="pl-2">
              <Steps 
                direction="vertical" 
                size="small" 
                current={generationStep}
                items={[
                  {
                    title: <span className="text-xs font-bold text-slate-800">Rà quét & Chọn lọc câu hỏi từ Ngân hàng ({activeGenMatrix.subject})</span>,
                    description: <span className="text-[11px] text-slate-400">Xác ứng các câu hỏi Đã Duyệt có mức độ trùng lắp thấp nhất.</span>,
                    icon: generationStep === 0 ? <LoadingOutlined style={{ fontSize: 15 }} spin /> : undefined
                  },
                  {
                    title: <span className="text-xs font-bold text-slate-800">Tráo xóc tổ hợp, phân bố độ nhiễu & Khởi tạo mã đề riêng lẻ</span>,
                    description: <span className="text-[11px] text-slate-400">Cân đối phân bố chỉ tiêu độ khó đảm bảo sự công bằng kiểm định học thuật.</span>,
                    icon: generationStep === 1 ? <LoadingOutlined style={{ fontSize: 15 }} spin /> : undefined
                  },
                  {
                    title: <span className="text-xs font-bold text-slate-800">Lắp ráp Khóa đáp án chi tiết & Trích xuất đóng gói tệp tin in ấn</span>,
                    description: <span className="text-[11px] text-slate-400">Tổng hợp thẻ nhãn và đóng gói tài nguyên gốc bám sát ma trận chỉ huy.</span>,
                    icon: generationStep === 2 ? <LoadingOutlined style={{ fontSize: 15 }} spin /> : undefined
                  }
                ]}
              />
            </div>

            {generationStep < 3 ? (
              <div className="text-center py-6 border-t border-slate-100" id="ai-loading-container">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                <p className="text-xs text-slate-500 font-medium mt-2.5 animate-pulse">
                  Hệ thống SmartTest AI đang bóc tách phân tích kho dữ liệu thực tuyển...
                </p>
              </div>
            ) : (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 text-center space-y-4 animate-in zoom-in-95" id="ai-generation-success-panel">
                <CheckCircleTwoTone twoToneColor="#52c41a" className="text-4xl animate-bounce" />
                <div>
                  <strong className="text-emerald-950 block text-[15px] uppercase font-black">XUẤT BẢN ĐỀ THI THÀNH CÔNG!</strong>
                  <span className="text-slate-500 font-semibold text-xs block mt-1">
                    Đã trích xuất và lắp ghép bám sát tuyệt đối cấu trúc ma trận của bạn.
                  </span>
                </div>

                <div className="py-2.5 px-3 bg-white border border-emerald-150 rounded-xl max-w-sm mx-auto text-xs font-medium space-y-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Thư viện mã số các đề thi gốc</span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {generationResults?.examCodeList.map((code) => (
                      <span key={code} className="bg-slate-100 border border-slate-200 text-[#002147] font-mono font-black py-0.5 px-2 rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button 
                    type="primary"
                    className="bg-[#002147] border-transparent text-white font-extrabold text-xs rounded-xl hover:opacity-90"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      message.success('Gói tệp đóng gói .ZIP chứa đề thi PDF và ma trận đáp án đang được tải xuống hệ thống!');
                    }}
                  >
                    Tải gói đề thi và đáp án (.ZIP)
                  </Button>
                  <Button 
                    type="text"
                    className="bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-200"
                    onClick={() => {
                      setIsExamGenerating(false);
                      setGenerationResults(null);
                      setActiveGenMatrix(null);
                    }}
                  >
                    Hoàn tất đóng
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}
