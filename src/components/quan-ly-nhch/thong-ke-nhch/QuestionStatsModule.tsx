import React, { useState, useMemo, useEffect } from 'react';
import { Select, Button, DatePicker, Card, TreeSelect, Empty } from 'antd';
import { SearchOutlined, FileExcelOutlined, BarChartOutlined } from '@ant-design/icons';
import { Question } from '../../../types';
import { SUBJECTS } from '../../../data';
import {
  topicsApi, TopicAPI,
  gradeLevelApi, GradeLevelAPI,
  subjectCategoryApi, SubjectCategoryAPI,
  cognitiveLevelApi, CognitiveLevelAPI,
  questionTypeApi, QuestionTypeAPI,
  competencyComponentApi, CompetencyComponentAPI
} from '../../../services/danhMucApi';
import { toast } from '../../../utils/toast';
import { exportToExcel, type ExcelColumn } from '../../../utils/excelExport';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../utils/resizableTable';
import { resolveInternalQuestionType } from '../../../utils/questionTypeCategory';

const { RangePicker } = DatePicker;

interface QuestionStatsModuleProps {
  questions: Question[];
}

export default function QuestionStatsModule({ questions }: QuestionStatsModuleProps) {
  const [topicsList, setTopicsList] = useState<TopicAPI[]>([]);
  const [gradesList, setGradesList] = useState<GradeLevelAPI[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectCategoryAPI[]>([]);
  const [levelsList, setLevelsList] = useState<CognitiveLevelAPI[]>([]);
  const [typesList, setTypesList] = useState<QuestionTypeAPI[]>([]);
  const [competencyList, setCompetencyList] = useState<CompetencyComponentAPI[]>([]);

  useEffect(() => {
    topicsApi.list().then(res => {
      if (res.success) {
        setTopicsList(res.data);
      }
    }).catch(console.error);

    gradeLevelApi.list().then(res => {
      if (res.success) {
        setGradesList(res.data);
      }
    }).catch(console.error);

    subjectCategoryApi.list().then(res => {
      if (res.success) {
        setSubjectsList(res.data);
        if (res.data.length > 0) {
          const firstSubject = res.data[0].id;
          setFormSubject(firstSubject);
          setAppliedFilters(prev => ({ ...prev, subject: firstSubject }));
        }
      }
    }).catch(console.error);

    cognitiveLevelApi.list().then(res => {
      if (res.success) {
        setLevelsList(res.data);
      }
    }).catch(console.error);

    questionTypeApi.list().then(res => {
      if (res.success) {
        setTypesList(res.data);
      }
    }).catch(console.error);

    competencyComponentApi.list().then(res => {
      if (res.success) {
        setCompetencyList(res.data);
      }
    }).catch(console.error);
  }, []);

  // Form states
  const [formSubject, setFormSubject] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('Tất cả');
  const [formTopic, setFormTopic] = useState<string>('Tất cả');
  const [formStatus, setFormStatus] = useState<string>('Tất cả');
  const [formCreator, setFormCreator] = useState<string>('Tất cả');
  const [formLevel, setFormLevel] = useState<string>('Tất cả');
  const [formType, setFormType] = useState<string>('Tất cả');
  const [formCompetency, setFormCompetency] = useState<string>('Tất cả');
  const [formDateRange, setFormDateRange] = useState<any>(null);

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    subject: '',
    grade: 'Tất cả',
    topic: 'Tất cả',
    status: 'Tất cả',
    creator: 'Tất cả',
    level: 'Tất cả',
    type: 'Tất cả',
    competency: 'Tất cả',
    dateRange: null as any
  });

  const handleSearch = () => {
    setAppliedFilters({
      subject: formSubject,
      grade: formGrade,
      topic: formTopic,
      status: formStatus,
      creator: formCreator,
      level: formLevel,
      type: formType,
      competency: formCompetency,
      dateRange: formDateRange
    });
  };

  const formatLevel = (lvl: string) => {
    const found = levelsList.find(l => l.code === lvl || l.id === lvl);
    if (found) return found.name;
    switch (lvl) {
      case 'nhan_biet': return 'Nhận biết';
      case 'thong_hieu': return 'Thông hiểu';
      case 'van_dung': return 'Vận dụng';
      case 'van_dung_cao': return 'Vận dụng cao';
      default: return 'Khác';
    }
  };

  // Filter questions based on criteria
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (appliedFilters.subject && appliedFilters.subject !== 'Tất cả') {
        const isMatch = q.subject === appliedFilters.subject || subjectsList.find(s => s.id === appliedFilters.subject)?.name === q.subject;
        if (!isMatch) return false;
      }
      if (appliedFilters.grade !== 'Tất cả') {
        const isMatch = q.grade === appliedFilters.grade || gradesList.find(g => g.id === appliedFilters.grade)?.name === q.grade;
        if (!isMatch) return false;
      }

      if (appliedFilters.topic !== 'Tất cả') {
        const isMatch = q.topicId === appliedFilters.topic ||
          topicsList.find(t => t.id === q.topicId)?.parent_id === appliedFilters.topic;
        if (!isMatch) return false;
      }

      if (appliedFilters.level !== 'Tất cả') {
        const levelObj = levelsList.find(l => l.id === appliedFilters.level);
        if (levelObj) {
           const qLevelName = formatLevel(q.level);
           if (qLevelName !== levelObj.name) return false;
        } else {
           if (q.level !== appliedFilters.level) return false;
        }
      }

      if (appliedFilters.type !== 'Tất cả') {
        const typeObj = typesList.find(t => t.id === appliedFilters.type);
        if (typeObj) {
          if (q.type !== resolveInternalQuestionType(typeObj)) return false;
        } else if (q.type !== appliedFilters.type) {
          return false;
        }
      }

      if (appliedFilters.competency !== 'Tất cả') {
        const isMatch = q.nangLucId === appliedFilters.competency || q.nangLuc === competencyList.find(c => c.id === appliedFilters.competency)?.name;
        if (!isMatch) return false;
      }

      if (appliedFilters.status !== 'Tất cả' && q.status !== appliedFilters.status) return false;
      if (appliedFilters.creator !== 'Tất cả' && q.creator !== appliedFilters.creator) return false;

      if (appliedFilters.dateRange && appliedFilters.dateRange.length === 2) {
        const qDate = new Date(q.createdAt).getTime();
        const startDate = new Date(appliedFilters.dateRange[0]).setHours(0, 0, 0, 0);
        const endDate = new Date(appliedFilters.dateRange[1]).setHours(23, 59, 59, 999);
        if (qDate < startDate || qDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [questions, appliedFilters, topicsList, subjectsList, gradesList, levelsList, typesList, competencyList]);

  const subjectOptions = subjectsList.map(s => ({ value: s.id, label: s.name }));
  const gradeOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...gradesList.map(g => ({ value: g.id, label: g.name }))];
  const levelOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...levelsList.map(l => ({ value: l.id, label: l.name }))];
  const typeOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...typesList.map(t => ({ value: t.id, label: t.name }))];

  const subjNameForm = subjectsList.find(s => s.id === formSubject)?.name || formSubject;
  const filteredCompetenciesList = formSubject
    ? competencyList.filter(c => (c.subject_id === formSubject || c.subject_id === subjNameForm) && c.is_active)
    : competencyList.filter(c => c.is_active);
  const competencyOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...filteredCompetenciesList.map(c => ({ value: c.id, label: c.name }))];

  const filteredTopics = formSubject
    ? topicsList.filter(t => t.subject_id === formSubject)
    : topicsList;

  const topicTreeData = [
    { value: 'Tất cả', title: 'Tất cả' },
    ...filteredTopics.filter(t => !t.parent_id).map(root => ({
      value: root.id,
      title: root.name,
      children: filteredTopics.filter(sub => sub.parent_id === root.id).map(sub => ({
        value: sub.id,
        title: sub.name,
      }))
    }))
  ];

  const statusOptions = [
    { value: 'Tất cả', label: 'Tất cả' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'draft', label: 'Tạo mới' },
  ];

  const creatorOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...Array.from(new Set(questions.map(q => q.creator))).filter(Boolean).map(c => ({ value: c, label: c }))];

  // Formater functions have been moved up

  const nangLucs = useMemo(() => {
    let validComps = competencyList.filter(c => c.is_active);
    if (appliedFilters.subject && appliedFilters.subject !== 'Tất cả') {
      const subjId = appliedFilters.subject;
      const subjName = subjectsList.find(s => s.id === subjId)?.name || subjId;
      validComps = validComps.filter(c => c.subject_id === subjId || c.subject_id === subjName);
    }

    return Array.from(new Set(validComps.map(c => c.name)));
  }, [competencyList, appliedFilters.subject, subjectsList]);

  const displayLevels = useMemo(() => {
    if (levelsList.length > 0) {
      const order = ['nhận biết', 'thông hiểu', 'vận dụng', 'vận dụng cao'];
      return [...levelsList].sort((a, b) => {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aIndex = order.findIndex(o => aName.includes(o));
        const bIndex = order.findIndex(o => bName.includes(o));
        return (aIndex >= 0 ? aIndex : 99) - (bIndex >= 0 ? bIndex : 99);
      }).map(l => l.id);
    }
    return ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];
  }, [levelsList]);

  const displayTypes = useMemo(() => {
    if (typesList.length > 0) {
      return typesList;
    }
    // Code dùng đúng quy ước viết tắt thật của danh mục question_types (TN/DS/TLN — xem
    // utils/questionTypeCategory.ts) để resolveInternalQuestionType() nhận diện đúng, không phải
    // literal enum nội bộ ('single'/'true_false'...) vốn không khớp quy ước code thật.
    return [
      { id: 'single', code: 'TN', name: 'TN' },
      { id: 'true_false', code: 'DS', name: 'ĐS' },
      { id: 'short', code: 'TLN', name: 'TLN' }
    ] as any[];
  }, [typesList]);

  // Danh sách phẳng các cột lá (Năng lực × Mức độ × Loại câu hỏi) — dùng để dựng cả bảng pivot
  // tự viết (header 3 tầng + resize) lẫn cột xuất Excel (header gộp phẳng thành 1 dòng).
  const leafColumns = useMemo(() => {
    const arr: { nl: string; lvl: string; typeObj: any }[] = [];
    nangLucs.forEach(nl => displayLevels.forEach(lvl => displayTypes.forEach(typeObj => {
      arr.push({ nl, lvl, typeObj });
    })));
    return arr;
  }, [nangLucs, displayLevels, displayTypes]);

  // Data for first table
  const tableData: any[] = [];

  let totalRow: any = { key: 'total', stt: '', topicId: '', topicName: '', subTopicName: 'Tổng số', grade: '', isTotal: true };

  const fillCounts = (row: any, qs: any[], addToTotal: boolean) => {
    nangLucs.forEach(nl => {
      displayLevels.forEach(lvl => {
        displayTypes.forEach(typeObj => {
          const count = qs.filter(q => {
            const matchedComp = competencyList.find(c => c.id === q.nangLucId || c.name === q.nangLuc);
            const qNangLucName = matchedComp ? matchedComp.name : q.nangLuc;
            if (qNangLucName !== nl) return false;

            const qLevelName = formatLevel(q.level).toLowerCase();
            const colLevelName = formatLevel(lvl).toLowerCase();
            if (qLevelName !== colLevelName) return false;

            if (q.type !== resolveInternalQuestionType(typeObj)) return false;

            return true;
          }).length;

          row[`${nl}_${lvl}_${typeObj.code}`] = (row[`${nl}_${lvl}_${typeObj.code}`] || 0) + count;
          if (addToTotal) {
            totalRow[`${nl}_${lvl}_${typeObj.code}`] = (totalRow[`${nl}_${lvl}_${typeObj.code}`] || 0) + count;
          }
        });
      });
    });
  };

  const rootTopics = topicsList.filter(t => !t.parent_id);

  if (topicsList.length === 0) {
    const fallbackTopics = Array.from(new Set(filteredQuestions.map(q => q.topicId).filter(Boolean)));
    let sttCounter = 1;
    fallbackTopics.forEach(tId => {
      const topicQs = filteredQuestions.filter(q => q.topicId === tId);
      if (topicQs.length === 0) return;

      const row: any = {
        key: tId,
        stt: sttCounter++,
        topicId: tId,
        topicName: topicQs[0].topicName || 'Chưa xác định',
        subTopicName: topicQs[0].subTopicName || topicQs[0].topicName || 'Chưa xác định',
        grade: topicQs[0].grade,
        topicRowSpan: 1,
      };

      fillCounts(row, topicQs, true);
      tableData.push(row);
    });
  } else {
    let sttCounter = 1;
    rootTopics.forEach(root => {
      const subTopics = topicsList.filter(t => t.parent_id === root.id);

      if (subTopics.length === 0) {
        const topicQs = filteredQuestions.filter(q => q.topicId === root.id);
        if (topicQs.length === 0) return;

        const row: any = {
          key: root.id,
          stt: sttCounter++,
          topicId: root.id,
          topicName: root.name,
          subTopicName: '',
          grade: topicQs[0]?.grade || root.grade_name || '',
          topicRowSpan: 1,
        };

        fillCounts(row, topicQs, true);
        tableData.push(row);
      } else {
        const rowsForThisRoot: any[] = [];

        const rootQs = filteredQuestions.filter(q => q.topicId === root.id);
        if (rootQs.length > 0) {
          const rootRow: any = {
            key: root.id + '_root',
            stt: '',
            topicId: root.id,
            topicName: root.name,
            subTopicName: 'Chung (Không thuộc tiểu mục)',
            grade: rootQs[0]?.grade || root.grade_name || '',
            topicRowSpan: 0,
          };
          fillCounts(rootRow, rootQs, true);
          rowsForThisRoot.push(rootRow);
        }

        subTopics.forEach((sub, subIdx) => {
          const subQs = filteredQuestions.filter(q => q.topicId === sub.id);
          if (subQs.length === 0) return;

          const subRow: any = {
            key: sub.id,
            stt: '',
            topicId: sub.id,
            topicName: root.name,
            subTopicName: sub.name,
            grade: subQs[0]?.grade || sub.grade_name || '',
            topicRowSpan: 0,
          };

          fillCounts(subRow, subQs, true);
          rowsForThisRoot.push(subRow);
        });

        if (rowsForThisRoot.length > 0) {
          rowsForThisRoot[0].topicRowSpan = rowsForThisRoot.length;
          rowsForThisRoot[0].stt = sttCounter++;
          tableData.push(...rowsForThisRoot);
        }
      }
    });
  }

  if (tableData.length > 0) {
    tableData.push(totalRow);
  }

  // Data for second table (Summary by Type)
  const typeSummaryData = displayTypes.map((typeObj, index) => {
    const qs = filteredQuestions.filter(q => q.type === resolveInternalQuestionType(typeObj));

    let cauDon = 0;
    let cauNhom = 0;
    let tongLenhHoi = 0;

    qs.forEach(q => {
      if (q.type === 'true_false') {
        cauNhom += 1;
        tongLenhHoi += q.statements?.length || 4; // usually 4 statements in a group question
      } else {
        cauDon += 1;
        tongLenhHoi += 1;
      }
    });

    return {
      key: typeObj.code,
      stt: index + 1,
      typeName: typeObj.name || typeObj.code,
      totalCount: qs.length,
      cauDon,
      cauNhom,
      tongLenhHoi
    };
  });

  const { colGroup: summaryColGroup, startResize: startSummaryColResize, totalWidth: summaryTableTotalWidth } = useResizableColumns(
    [60, 180, 150, 120, 120, 150]
  );

  // Cột lá thay đổi theo môn học/thành phần năng lực đang chọn — key này đổi thì bảng pivot
  // (PivotStatsTable) tự remount, tránh mảng độ rộng cột (useResizableColumns) lệch số cột thực tế.
  const pivotColKey = `${appliedFilters.subject}|${nangLucs.join(',')}|${displayLevels.join(',')}|${displayTypes.map((t: any) => t.code).join(',')}`;

  const excelColumns: ExcelColumn<any>[] = [
    { header: 'STT', accessor: row => row.isTotal ? '' : row.stt, width: 6, align: 'center' },
    { header: 'Chủ đề', accessor: row => row.isTotal ? '' : row.topicName, width: 22 },
    { header: 'Tiểu mục', accessor: row => row.isTotal ? 'Tổng số' : row.subTopicName, width: 26 },
    { header: 'Khối lớp', accessor: row => row.grade || '', width: 12, align: 'center' },
    ...leafColumns.map(({ nl, lvl, typeObj }) => ({
      header: `${nl} - ${formatLevel(lvl)} - ${typeObj.code || typeObj.name}`,
      accessor: (row: any) => row[`${nl}_${lvl}_${typeObj.code}`] || 0,
      width: 16,
      align: 'center' as const,
    })),
  ];

  const handleExportExcel = () => {
    if (tableData.length === 0) {
      return;
    }
    const fileName = `ThongKeNganHangCauHoi_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(tableData, excelColumns, fileName, 'Thống kê NHCH');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="space-y-6 pt-2 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <BarChartOutlined className="text-[#002147] text-lg" />
        </div>
        <h2 className="text-[#002147] font-black text-lg uppercase m-0">THỐNG KÊ NGÂN HÀNG CÂU HỎI</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <span className="font-semibold text-slate-700">Tìm kiếm thông tin</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Môn thi<span className="text-red-500 ml-0.5">*</span></div>
              <Select
                value={formSubject}
                onChange={(val) => {
                  setFormSubject(val);
                  setFormGrade('Tất cả');
                  setFormTopic('Tất cả');
                  setFormLevel('Tất cả');
                  setFormType('Tất cả');
                  setFormCompetency('Tất cả');
                  setFormStatus('Tất cả');
                  setFormCreator('Tất cả');
                  setFormDateRange(null);

                  setAppliedFilters({
                    subject: val,
                    grade: 'Tất cả',
                    topic: 'Tất cả',
                    status: 'Tất cả',
                    creator: 'Tất cả',
                    level: 'Tất cả',
                    type: 'Tất cả',
                    competency: 'Tất cả',
                    dateRange: null
                  });
                }}
                className="w-full"
                options={subjectOptions}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Khối lớp</div>
              <Select
                value={formGrade}
                onChange={setFormGrade}
                className="w-full"
                options={gradeOptions}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Chủ đề/Tiểu mục</div>
              <TreeSelect
                value={formTopic}
                onChange={setFormTopic}
                className="w-full"
                treeData={topicTreeData}
                placeholder="Chọn chủ đề"
                treeDefaultExpandAll
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Mức độ</div>
              <Select
                value={formLevel}
                onChange={setFormLevel}
                className="w-full"
                options={levelOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Loại câu hỏi</div>
              <Select
                value={formType}
                onChange={setFormType}
                className="w-full"
                options={typeOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Thành phần năng lực</div>
              <Select
                value={formCompetency}
                onChange={setFormCompetency}
                className="w-full"
                options={competencyOptions}
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Trạng thái</div>
              <Select
                value={formStatus}
                onChange={setFormStatus}
                className="w-full"
                options={statusOptions}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Ngày tạo</div>
              <RangePicker
                className="w-full"
                onChange={(dates) => setFormDateRange(dates)}
                format="DD/MM/YYYY"
                placeholder={['Bắt đầu', 'Kết thúc']}
              />
            </div>
          </div>
          <div className="flex justify-center border-t border-slate-100 pt-5 mt-2">
            <Button onClick={handleSearch} type="primary" className="bg-[#002147] hover:bg-[#001529] px-8 py-4 flex items-center font-semibold rounded-lg shadow-sm" icon={<SearchOutlined />}>
              Tìm kiếm
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex justify-between items-center">
          <span className="font-semibold text-slate-700">Kết quả tìm kiếm</span>
          <Button type="primary" icon={<FileExcelOutlined />} className="!bg-green-600 !border-green-600 !text-white hover:!bg-green-700 font-medium" onClick={handleExportExcel}>Xuất Excel</Button>
        </div>
        <div className="p-5 overflow-hidden">
          <PivotStatsTable
            key={pivotColKey}
            leafColumns={leafColumns}
            tableData={tableData}
            formatLevel={formatLevel}
          />

          <ResizableTableStyles />
          <div className="overflow-x-auto mt-8">
            <table style={{ minWidth: summaryTableTotalWidth }} className={`w-full text-xs text-slate-700 border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}>
              {summaryColGroup}
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-200 text-[#334155] font-semibold">
                  <th className="relative py-2.5 px-3 text-center">STT<ColResizeHandle onMouseDown={startSummaryColResize(0)} /></th>
                  <th className="relative py-2.5 px-3 text-left">Loại câu hỏi<ColResizeHandle onMouseDown={startSummaryColResize(1)} /></th>
                  <th className="relative py-2.5 px-3 text-center">Tổng số câu hỏi<ColResizeHandle onMouseDown={startSummaryColResize(2)} /></th>
                  <th className="relative py-2.5 px-3 text-center">Câu Đơn<ColResizeHandle onMouseDown={startSummaryColResize(3)} /></th>
                  <th className="relative py-2.5 px-3 text-center">Câu nhóm<ColResizeHandle onMouseDown={startSummaryColResize(4)} /></th>
                  <th className="relative py-2.5 px-3 text-center">Tổng số lệnh hỏi<ColResizeHandle onMouseDown={startSummaryColResize(5)} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {typeSummaryData.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center"><Empty description="Không có dữ liệu" /></td></tr>
                ) : typeSummaryData.map(row => (
                  <tr key={row.key} className="hover:bg-[#f1f5f9] transition-colors">
                    <td className="py-2.5 px-3 text-center">{row.stt}</td>
                    <td className="py-2.5 px-3"><TruncatedText text={row.typeName} /></td>
                    <td className="py-2.5 px-3 text-center">{row.totalCount}</td>
                    <td className="py-2.5 px-3 text-center">{row.cauDon}</td>
                    <td className="py-2.5 px-3 text-center">{row.cauNhom}</td>
                    <td className="py-2.5 px-3 text-center">{row.tongLenhHoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PivotStatsTableProps {
  leafColumns: { nl: string; lvl: string; typeObj: any }[];
  tableData: any[];
  formatLevel: (lvl: string) => string;
}

/** Bảng pivot 3 tầng tiêu đề (Năng lực → Mức độ → Loại câu hỏi) + gộp ô (rowSpan) theo chủ đề.
 * Tách riêng component để `key={pivotColKey}` ở nơi gọi có thể remount toàn bộ (và reset lại
 * useResizableColumns) mỗi khi số cột lá đổi theo môn học/năng lực đang lọc. */
function PivotStatsTable({ leafColumns, tableData, formatLevel }: PivotStatsTableProps) {
  const nangLucs = useMemo(() => Array.from(new Set(leafColumns.map(c => c.nl))), [leafColumns]);
  const displayLevels = useMemo(() => Array.from(new Set(leafColumns.map(c => c.lvl))), [leafColumns]);
  const displayTypesCount = nangLucs.length > 0 && displayLevels.length > 0 ? leafColumns.length / (nangLucs.length * displayLevels.length) : 0;

  const { colGroup, startResize, totalWidth } = useResizableColumns(
    [50, 160, 180, 90, ...leafColumns.map(() => 70)]
  );

  const totalCols = 4 + leafColumns.length;

  return (
    <div className="overflow-x-auto">
      <ResizableTableStyles />
      <table style={{ minWidth: totalWidth }} className={`border-collapse table-fixed text-xs ${RESIZABLE_TABLE_CLASS}`}>
        {colGroup}
        <thead>
          <tr className="bg-[#f8fafc] text-[#334155] font-semibold">
            <th className="relative border border-slate-200 px-2 py-2 text-center align-middle" rowSpan={3}>STT<ColResizeHandle onMouseDown={startResize(0)} /></th>
            <th className="relative border border-slate-200 px-2 py-2 text-center align-middle" rowSpan={3}>Chủ đề<ColResizeHandle onMouseDown={startResize(1)} /></th>
            <th className="relative border border-slate-200 px-2 py-2 text-center align-middle" rowSpan={3}>Tiểu mục<ColResizeHandle onMouseDown={startResize(2)} /></th>
            <th className="relative border border-slate-200 px-2 py-2 text-center align-middle" rowSpan={3}>Khối lớp<ColResizeHandle onMouseDown={startResize(3)} /></th>
            {nangLucs.map(nl => (
              <th key={nl} className="border border-slate-200 px-2 py-2 text-center" colSpan={displayLevels.length * displayTypesCount}>{nl}</th>
            ))}
          </tr>
          <tr className="bg-[#f8fafc] text-[#334155] font-semibold">
            {nangLucs.flatMap(nl => displayLevels.map(lvl => (
              <th key={`${nl}-${lvl}`} className="border border-slate-200 px-2 py-2 text-center" colSpan={displayTypesCount}>{formatLevel(lvl)}</th>
            )))}
          </tr>
          <tr className="bg-[#f8fafc] text-[#334155] font-semibold">
            {leafColumns.map(({ nl, lvl, typeObj }, i) => (
              <th key={`${nl}-${lvl}-${typeObj.code}-${i}`} className="relative border border-slate-200 px-2 py-2 text-center">
                {typeObj.code || typeObj.name}
                <ColResizeHandle onMouseDown={startResize(4 + i)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.length === 0 ? (
            <tr><td colSpan={totalCols} className="py-8 text-center border border-slate-200"><Empty description="Không có dữ liệu thống kê" /></td></tr>
          ) : tableData.map(row => (
            <tr key={row.key} className={row.isTotal ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/60'}>
              {row.topicRowSpan !== 0 && (
                <td className="border border-slate-200 px-2 py-1.5 text-center align-middle" rowSpan={row.topicRowSpan ?? 1}>{row.isTotal ? '' : row.stt}</td>
              )}
              {row.topicRowSpan !== 0 && (
                <td className="border border-slate-200 px-2 py-1.5 text-left align-middle" rowSpan={row.topicRowSpan ?? 1}>
                  {row.isTotal ? '' : <TruncatedText text={row.topicName} />}
                </td>
              )}
              <td className="border border-slate-200 px-2 py-1.5 text-left align-middle">
                {row.isTotal ? <span className="font-bold">Tổng số</span> : <TruncatedText text={row.subTopicName} />}
              </td>
              <td className="border border-slate-200 px-2 py-1.5 text-center align-middle">{row.grade}</td>
              {leafColumns.map(({ nl, lvl, typeObj }) => {
                const val = row[`${nl}_${lvl}_${typeObj.code}`];
                return (
                  <td key={`${nl}_${lvl}_${typeObj.code}`} className="border border-slate-200 px-2 py-1.5 text-center align-middle">
                    {val > 0 ? val : <span className="text-red-500">0</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
