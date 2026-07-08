import React, { useState, useMemo, useEffect } from 'react';
import { Select, Button, DatePicker, Table, Card, TreeSelect } from 'antd';
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

  const getQTypeCode = (type: string) => {
    switch (type) {
      case 'single': return 'TN';
      case 'multiple': return 'CHN';
      case 'true_false': 
      case 'multiple_true_false': return 'ĐS';
      case 'short': 
      case 'short_answer': return 'TLN';
      case 'essay': return 'TL';
      case 'matching': return 'Nối';
      case 'fill_blank': return 'Điền';
      case 'reading': return 'Đọc';
      default: return type;
    }
  };

  const formatType = (type: string) => {
    const found = typesList.find(t => t.code === type || t.id === type);
    if (found) return found.code || found.name;
    return getQTypeCode(type);
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
           const qTypeCode = formatType(q.type);
           if (qTypeCode !== typeObj.code && qTypeCode !== typeObj.name) return false;
        } else {
           if (q.type !== appliedFilters.type) return false;
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
    { value: 'draft', label: 'Bản nháp' },
  ];

  const creatorOptions = [{ value: 'Tất cả', label: 'Tất cả' }, ...Array.from(new Set(questions.map(q => q.creator))).filter(Boolean).map(c => ({ value: c, label: c }))];

  // Formater functions have been moved up

  // Build columns for first table dynamically
  const columns: any[] = [
    {
      title: 'STT',
      dataIndex: 'stt',
      key: 'stt',
      fixed: 'left',
      width: 50,
      align: 'center',
      render: (val: string, record: any) => {
        if (record.isTotal) return { children: '', props: { rowSpan: 1 } };
        return {
          children: val,
          props: {
            rowSpan: record.topicRowSpan !== undefined ? record.topicRowSpan : 1,
          }
        };
      }
    },
    {
      title: 'Chủ đề',
      dataIndex: 'topicName',
      key: 'topicName',
      fixed: 'left',
      width: 120,
      ellipsis: true,
      render: (val: string, record: any) => {
        if (record.isTotal) return { children: '', props: { rowSpan: 1 } };
        return {
          children: <div title={val} className="truncate">{val}</div>,
          props: {
            rowSpan: record.topicRowSpan !== undefined ? record.topicRowSpan : 1,
          }
        };
      }
    },
    { 
      title: 'Tiểu mục', 
      dataIndex: 'subTopicName', 
      key: 'subTopicName', 
      fixed: 'left', 
      width: 150, 
      ellipsis: true,
      render: (val: string, record: any) => record.isTotal ? <span className="font-bold">Tổng số</span> : <div title={val} className="truncate">{val}</div> 
    },
    { title: 'Khối lớp', dataIndex: 'grade', key: 'grade', fixed: 'left', width: 80, align: 'center', ellipsis: true },
  ];

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
    return [
      { id: 'single', code: 'single', name: 'TN' },
      { id: 'true_false', code: 'true_false', name: 'ĐS' },
      { id: 'short', code: 'short', name: 'TLN' }
    ] as any[];
  }, [typesList]);

  nangLucs.forEach(nl => {
    const nlCol = {
      title: nl,
      children: [] as any[]
    };

    displayLevels.forEach(lvl => {
      const lvlCol = {
        title: formatLevel(lvl),
        children: [] as any[]
      };

      displayTypes.forEach(typeObj => {
        lvlCol.children.push({
          title: typeObj.code || typeObj.name,
          dataIndex: `${nl}_${lvl}_${typeObj.code}`,
          key: `${nl}_${lvl}_${typeObj.code}`,
          align: 'center',
          width: 50,
          render: (val: number) => val > 0 ? val : <span className="text-red-500">0</span>
        });
      });
      nlCol.children.push(lvlCol);
    });

    columns.push(nlCol);
  });

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

            const qFoundType = typesList.find(t => t.id === q.type || t.code === q.type);
            const qTypeCode = qFoundType ? qFoundType.code : getQTypeCode(q.type);
            if (qTypeCode !== typeObj.code && q.type !== typeObj.id) return false;

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
    const qs = filteredQuestions.filter(q => {
      const qTypeCode = formatType(q.type);
      return qTypeCode === typeObj.code || qTypeCode === typeObj.name || q.type === typeObj.id || q.type === typeObj.code;
    });

    let cauDon = 0;
    let cauNhom = 0;
    let tongLenhHoi = 0;

    qs.forEach(q => {
      const qTypeCode = formatType(q.type);

      if (qTypeCode === 'ĐS' || qTypeCode === 'true_false' || qTypeCode === 'multiple_true_false' || q.type === 'true_false') {
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

  const summaryColumns: any[] = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 60, align: 'center' },
    { title: 'Loại câu hỏi', dataIndex: 'typeName', key: 'typeName', width: 150 },
    { title: 'Tổng số câu hỏi', dataIndex: 'totalCount', key: 'totalCount', align: 'center' },
    { title: 'Câu Đơn', dataIndex: 'cauDon', key: 'cauDon', align: 'center' },
    { title: 'Câu nhóm', dataIndex: 'cauNhom', key: 'cauNhom', align: 'center' },
    { title: 'Tổng số lệnh hỏi', dataIndex: 'tongLenhHoi', key: 'tongLenhHoi', align: 'center' },
  ];

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
          <Button icon={<FileExcelOutlined />} className="text-blue-600 border-blue-200 hover:bg-blue-50 font-medium">Xuất Excel</Button>
        </div>
        <div className="p-5 overflow-hidden">
          <style>{`
            .stats-table .ant-table-thead > tr > th {
              background-color: #f8fafc;
              color: #334155;
              font-weight: 600;
              text-align: center;
              border-bottom: 1px solid #e2e8f0;
            }
            .stats-table .ant-table-tbody > tr.bg-slate-50 > td {
              background-color: #f8fafc;
            }
            .stats-table .ant-table-cell {
              border-inline-end: 1px solid #f1f5f9 !important;
            }
          `}</style>

          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            scroll={{ x: 'max-content' }}
            bordered
            size="middle"
            rowClassName={(record) => record.isTotal ? 'bg-slate-50 font-bold' : ''}
            className="mb-8 stats-table"
          />

          <Table
            columns={summaryColumns}
            dataSource={typeSummaryData}
            pagination={false}
            bordered
            size="middle"
            className="stats-table"
          />
        </div>
      </div>
    </div>
  );
}
