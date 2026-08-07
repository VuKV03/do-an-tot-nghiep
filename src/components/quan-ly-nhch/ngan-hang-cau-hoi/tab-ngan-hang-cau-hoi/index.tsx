import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Tree, Select, Input, Button, Space, Modal, Form, Spin, Empty, Pagination, Divider, Tooltip, DatePicker, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { toast } from '../../../../utils/toast';
import CreateQuestionModal from './manual-create';
import AIGenerateQuestionModal from './ai-generate';
import UpdateQuestionModal from './update';
import DeleteConfirmModal from './delete';
import SendReviewConfirmModal from './send-review';
import QuestionDetailModal from './detail';
import ThamDinhCauHoiTab from '../tham-dinh-cau-hoi';
import QuestionHistoryModal from '../history';
import ReviewModal from '../../../ReviewModal';
import {
  SearchOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  FilterOutlined,
  BookOutlined,
  AppstoreOutlined,
  SendOutlined,
  MoreOutlined,
  HistoryOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { Question, QuestionType, CognitiveLevel, QuestionStatus, TopicNode, SystemUser } from '../../../../types';
import { stripHtmlToText, renderQuestionPreview } from '../../../../utils/htmlContent';
import { buildCognitiveLevelOptions } from '../../../../utils/cognitiveLevel';
import { buildQuestionTypeFilterOptions } from '../../../../utils/questionTypeCategory';
import { useResizableColumns, ColResizeHandle, ResizableTableStyles, RESIZABLE_TABLE_CLASS, TruncatedText } from '../../../../utils/resizableTable';
import { exportToExcel, type ExcelColumn } from '../../../../utils/excelExport';
import { SUBJECTS, GRADES } from '../../../../data';
import { topicsApi, subjectCategoryApi, gradeLevelApi, bankQuestionApi, cognitiveLevelApi, questionTypeApi } from '../../../../services/danhMucApi';
import { checkUserPermission } from '../../../../utils/permissionUtils';
import { getUserSubjectFilter } from '../../../../utils/subjectUtils';
import { API_BASE_URL } from '../../../../config/apiConfig';

/**
 * Ô tìm kiếm chủ đề — tách riêng khỏi `QuestionBankModule` để state gõ-từng-ký-tự chỉ khiến CHÍNH
 * component nhỏ này re-render, không kéo theo re-render toàn bộ `QuestionBankModule` (component rất
 * to, có cả bảng câu hỏi hàng trăm dòng bên dưới) — đây mới là nguyên nhân delay thật khi gõ, debounce
 * chỉ trì hoãn việc LỌC cây, không tránh được việc re-render cả cây component cha trên mỗi ký tự gõ.
 * `onSearch` chỉ được gọi (và làm cha re-render) sau 300ms ngừng gõ, không phải mỗi ký tự.
 */
function TopicSearchInput({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      id="select-topic-search-filter"
      allowClear
      prefix={<SearchOutlined className="text-slate-400" />}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Nhập tên chủ đề để lọc cây bên dưới..."
      className="w-full text-xs font-bold"
    />
  );
}

interface QuestionBankModuleProps {
  onAddQuestion?: (q: Question) => void;
  onUpdateQuestion?: (q: Question, options?: { silent?: boolean }) => void;
  onDeleteQuestion?: (id: string) => void;
  onOpenReview?: (q: Question) => void;
  initialTab?: 'bank' | 'review';
  currentUser?: SystemUser | null;
}

export default function QuestionBankModule({
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onOpenReview,
  initialTab,
  currentUser
}: QuestionBankModuleProps) {
  const creatorName = currentUser?.fullName || currentUser?.username || 'Hội đồng Chuyên môn';

  const canManageOrSubmit = checkUserPermission(currentUser, 'tab-ngan-hang-cau-hoi');
  const canApprove = checkUserPermission(currentUser, 'tab-tham-dinh-cau-hoi');
  const defaultTab = canManageOrSubmit ? 'bank' : (canApprove ? 'review' : 'bank');

  // Tabs State
  const [activeTab, setActiveTab] = useState<'bank' | 'review'>(initialTab || defaultTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  // Ô tìm kiếm chủ đề ở sidebar — chỉ lọc/thu hẹp Cây chủ đề hiện sẵn bên dưới, KHÔNG xổ ra dropdown
  // danh sách riêng của nó (khác Select showSearch trước đây).
  const [topicSearch, setTopicSearch] = useState('');
  // Debounce riêng giá trị dùng để LỌC (khác giá trị hiện trong input) — lọc cây đệ quy trên toàn bộ
  // topicTreeData rồi re-render lại cả Tree là việc tốn, làm mỗi lần gõ 1 ký tự lại chạy ngay khiến ô
  // input có cảm giác giật/delay nặng. Input vẫn cập nhật ngay (mượt), chỉ việc LỌC bị trì hoãn 300ms
  // sau khi ngừng gõ.
  const [debouncedTopicSearch, setDebouncedTopicSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTopicSearch(topicSearch), 300);
    return () => clearTimeout(timer);
  }, [topicSearch]);

  // API data for subject/grade dropdowns and topic tree
  const [apiSubjects, setApiSubjects] = useState<{ value: string; label: string }[]>([]);
  const [apiGrades, setApiGrades] = useState<{ value: string; label: string }[]>([]);
  const [allTopicsRaw, setAllTopicsRaw] = useState<any[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [isSubjectRestricted, setIsSubjectRestricted] = useState(false);

  // Cấp độ tư duy — lấy đúng danh mục thật từ API, không hard-code để tránh lệch với danh mục quản trị
  const [cognitiveLevelFilterOptions, setCognitiveLevelFilterOptions] = useState<{ value: CognitiveLevel; label: string }[]>([]);

  useEffect(() => {
    cognitiveLevelApi.list().then((res) => {
      setCognitiveLevelFilterOptions(buildCognitiveLevelOptions(res.data));
    }).catch((err) => console.error('Failed to load cognitive levels', err));
  }, []);

  // Loại câu hỏi — lấy đúng danh mục "Loại hình câu hỏi" thật từ API, không hard-code (trước đây
  // fix cứng 4 lựa chọn nhưng danh mục thật chỉ có 3, thừa hẳn "Trắc nghiệm nhiều lựa chọn").
  const [questionTypeFilterOptions, setQuestionTypeFilterOptions] = useState<{ value: QuestionType; label: string }[]>([]);

  useEffect(() => {
    questionTypeApi.list().then((res) => {
      setQuestionTypeFilterOptions(buildQuestionTypeFilterOptions(res.data));
    }).catch((err) => console.error('Failed to load question types', err));
  }, []);

  // Người tạo — trước đây fix cứng 3 lựa chọn giả ("Hội đồng Chuyên môn (Tự tạo)", "SmartTest AI
  // Generator"...) không khớp q.creator thật (luôn là fullName người dùng đang đăng nhập lúc tạo,
  // xem `creatorName` ở trên) nên lọc theo Người tạo gần như luôn ra rỗng. Lấy đúng danh sách người
  // dùng thật (Họ và tên) từ màn "Quản lý người dùng", chỉ hiện tài khoản đang hoạt động (status
  // 'active') — khớp đúng dữ liệu q.creator đang lưu.
  const [creatorFilterOptions, setCreatorFilterOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/users`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !Array.isArray(json.data)) return;
        const names = (json.data as SystemUser[])
          .filter((u) => u.status === 'active' && u.fullName)
          .map((u) => u.fullName);
        const uniqueSorted = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'vi'));
        setCreatorFilterOptions(uniqueSorted.map((name) => ({ value: name, label: name })));
      })
      .catch((err) => console.error('Failed to load users for creator filter', err));
  }, []);

  // Questions from API
  const [dbQuestions, setDbQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Search filter query inputs
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<CognitiveLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<QuestionStatus | 'all'>('all');
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<any>(null);

  // Triggered filters matching "Tìm kiếm" button
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    type: 'all',
    level: 'all',
    status: 'all',
    creator: 'all',
    dateRange: null as any
  });

  // Modal / Form state for Add New
  const [activeModalType, setActiveModalType] = useState<QuestionType | null>(null);

  // Phân trang bảng "Kết quả tìm kiếm" — trước đây do antd Table tự quản lý nội bộ, giờ bảng dùng
  // module resizableTable dùng chung (giống tab "Quản lý đề gốc") nên tự cầm state phân trang.
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  // Độ rộng từng cột bảng "Kết quả tìm kiếm" — co giãn được, viền dọc rõ ràng giữa các cột — dùng
  // chung module resizableTable với tab "Quản lý đề gốc" (ExamManagementModule).
  // Thứ tự: checkbox, STT, Mã câu hỏi, Nội dung câu hỏi, Loại câu hỏi, Cấp độ tư duy, Người tạo,
  // Thành phần năng lực, Thuộc chủ đề, Ngày tạo, Trạng thái, Thao tác.
  const { colGroup: qbColGroup, startResize: startQbColResize, totalWidth: qbTotalWidth } = useResizableColumns(
    [40, 56, 110, 350, 100, 110, 120, 140, 130, 100, 130, 110]
  );

  // Row selection & Bulk Action states
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSendReviewOpen, setIsSendReviewOpen] = useState(false);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<Question | null>(null);
  const [pendingSendReviewQuestion, setPendingSendReviewQuestion] = useState<Question | null>(null);

  // AI Generation State
  const [isAIOpen, setIsAIOpen] = useState(false);

  // File import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<string | null>(null);

  // History modal state
  const [historyQuestion, setHistoryQuestion] = useState<Question | null>(null);

  // Detail modal state
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Update modal state
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateQuestion, setUpdateQuestion] = useState<Question | null>(null);

  // Fetch subjects, grades, and topics from API
  const fetchFiltersAndTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const [subRes, grRes, topRes] = await Promise.all([
        subjectCategoryApi.list(),
        gradeLevelApi.list(),
        topicsApi.list(),
      ]);
      const mappedMonHoc = subRes.data.map((i: any) => ({ id: i.id, code: i.code, name: i.name, IsActive: i.is_active }));
      const { filteredSubjects, isRestricted } = getUserSubjectFilter(mappedMonHoc, currentUser);
      setIsSubjectRestricted(isRestricted);
      const subjectOptions = filteredSubjects.map((s: any) => ({ value: s.name, label: s.name }));
      const gradeOptions = grRes.data.map((g: any) => ({ value: g.name, label: g.name }));

      setApiSubjects(subjectOptions);
      setApiGrades(gradeOptions);
      setAllTopicsRaw(topRes.data);

      if (subjectOptions.length > 0) {
        if (isRestricted && subjectOptions.length < 2) {
          setSelectedSubject(subjectOptions[0].value);
        } else {
          setSelectedSubject('');
        }
      }
    } catch (e) {
      console.error('Không thể tải dữ liệu môn học / chủ đề:', e);
    } finally {
      setTopicsLoading(false);
    }
  }, [currentUser]);

  // Fetch questions from bank API
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const res = await bankQuestionApi.list();
      if (res.success && res.data) {
        // Câu hỏi "sinh cả đề bằng AI" (ModalTaoDeTuDong.tsx > Theo AI, ModalSinhDeHoanVi.tsx) coi
        // như riêng tư của đề đó, không hiện ở Ngân hàng câu hỏi lẫn tab Thẩm định (dùng chung
        // dbQuestions này) — khác câu hỏi sinh bằng AI ngay tại đây (source 'ai_bank'), vẫn hiện
        // bình thường.
        const visibleData = res.data.filter((q) => q.source !== 'ai_exam');
        // Map API response to Question type
        const mapped: Question[] = visibleData.map((q) => ({
          id: q.id,
          code: q.code,
          text: q.text,
          type: q.type as any,
          level: q.level as any,
          status: q.status as any,
          subject: q.subject,
          grade: q.grade,
          topicId: q.topicId || '',
          topicName: q.topicName || '',
          subTopicName: q.subTopicName || '',
          nangLucId: q.nangLucId,
          nangLuc: q.nangLuc || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          creator: q.creator || '',
          createdAt: q.createdAt || new Date().toISOString(),
          feedback: q.feedback || '',
          statements: q.statements || [],
        }));
        setDbQuestions(mapped);
      }
    } catch (e) {
      console.error('Không thể tải câu hỏi từ ngân hàng:', e);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiltersAndTopics();
    fetchQuestions();
  }, [fetchFiltersAndTopics, fetchQuestions]);


  const subjectDropdownOptions = useMemo(
    () => {
      const options = [];
      if (!isSubjectRestricted || apiSubjects.length >= 2) {
        options.push({ value: '', label: 'Tất cả' });
      }
      options.push(...(apiSubjects.length > 0 ? apiSubjects : (isSubjectRestricted ? [] : SUBJECTS)));
      return options;
    },
    [apiSubjects, isSubjectRestricted]
  );
  // Grades dropdown: prefer API data, fallback to static
  const gradeDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...(apiGrades.length > 0 ? apiGrades : GRADES)
    ],
    [apiGrades]
  );

  const selectedTopicObj = useMemo(() => {
    if (!selectedTopicKey) return null;
    return allTopicsRaw.find((t: any) => t.id === selectedTopicKey);
  }, [selectedTopicKey, allTopicsRaw]);

  const actualSubject = useMemo(() => {
    if (selectedSubject) return selectedSubject;
    return selectedTopicObj?.subject_name || '';
  }, [selectedSubject, selectedTopicObj]);

  const actualGrade = useMemo(() => {
    if (selectedGrade) return selectedGrade;
    return selectedTopicObj?.grade_name || '';
  }, [selectedGrade, selectedTopicObj]);

  // Build topic tree from API data filtered by selected subject & grade
  const topicTreeData = useMemo(() => {
    // Filter topics matching selected subject (and optionally grade)
    const filtered = allTopicsRaw.filter((t: any) => {
      const matchSubject = !selectedSubject || t.subject_name === selectedSubject;
      const matchGrade = !selectedGrade || t.grade_name === selectedGrade;
      return matchSubject && matchGrade;
    });

    // Only show approved topics (status === 2) in the tree
    const approved = filtered.filter((t: any) => t.status === 2);

    // Build tree structure
    const map: { [id: string]: any } = {};
    const roots: any[] = [];

    approved.forEach((t: any) => {
      map[t.id] = { key: t.id, title: t.name, children: [] };
    });

    approved.forEach((t: any) => {
      const node = map[t.id];
      if (t.parent_id && map[t.parent_id]) {
        map[t.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Remove empty children arrays
    const clean = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          clean(n.children);
        }
      });
    };
    clean(roots);

    return roots;
  }, [allTopicsRaw, selectedSubject, selectedGrade]);

  // Handle tree node selection
  const handleSelectTopicNode = (selectedKeys: any[], info: any) => {
    if (selectedKeys.length > 0) {
      setSelectedTopicKey(selectedKeys[0]);
    } else {
      setSelectedTopicKey(null);
    }
  };

  // Danh sách chủ đề dạng phẳng — chỉ dùng để tính treeExpandedKeys (mở hết cây), KHÔNG còn dùng
  // làm nguồn cho dropdown riêng của ô tìm kiếm nữa (xem topicSearch/filteredTopicTreeData bên dưới).
  const topicSearchOptions = useMemo(() => {
    const flatten = (nodes: any[], parentPath: string[] = []): { value: string; label: string }[] =>
      nodes.flatMap((n) => {
        const path = [...parentPath, n.title];
        const own = { value: n.key, label: path.join(' › ') };
        return n.children && n.children.length > 0 ? [own, ...flatten(n.children, path)] : [own];
      });
    return flatten(topicTreeData);
  }, [topicTreeData]);

  // Ô "Chọn chủ đề" chỉ để LỌC cây chủ đề hiện sẵn bên dưới (Cây chủ đề môn học) khi gõ — không mở
  // dropdown danh sách riêng như Select showSearch trước đây. Giữ cả node khớp tên lẫn tổ tiên/con
  // của nó để không mất ngữ cảnh cây khi đang lọc.
  const filteredTopicTreeData = useMemo(() => {
    const term = debouncedTopicSearch.trim().toLowerCase();
    if (!term) return topicTreeData;
    const filterNodes = (nodes: any[]): any[] =>
      nodes.reduce((acc: any[], n: any) => {
        const ownMatch = String(n.title).toLowerCase().includes(term);
        const matchedChildren = n.children ? filterNodes(n.children) : [];
        if (ownMatch) {
          acc.push(n); // Tên khớp — giữ nguyên cả nhánh con, không lọc tiếp bên trong.
        } else if (matchedChildren.length > 0) {
          acc.push({ ...n, children: matchedChildren });
        }
        return acc;
      }, []);
    return filterNodes(topicTreeData);
  }, [topicTreeData, debouncedTopicSearch]);

  // Cây chủ đề luôn hiện đầy đủ (giữ hành vi defaultExpandAll cũ) — nhưng phải chủ động tính lại mỗi
  // khi topicTreeData đổi (đổi môn học/khối lớp), vì defaultExpandAll của antd Tree chỉ tự áp dụng
  // đúng 1 lần lúc mount, không tự mở lại khi treeData thay đổi sau đó.
  const [treeExpandedKeys, setTreeExpandedKeys] = useState<React.Key[]>([]);
  useEffect(() => {
    setTreeExpandedKeys(topicSearchOptions.map((o) => o.value));
  }, [topicSearchOptions]);

  // Chọn chủ đề qua ô search bên trên phải cuộn cây chủ đề tới đúng node tương ứng để người dùng
  // thấy ngay vị trí vừa chọn, không phải tự dò trong cây.
  const topicTreeRef = useRef<any>(null);
  useEffect(() => {
    if (selectedTopicKey) {
      topicTreeRef.current?.scrollTo({ key: selectedTopicKey, align: 'auto' });
    }
  }, [selectedTopicKey]);

  // Perform filtering of questions (using DB-fetched data)
  const filteredQuestions = useMemo(() => {
    return dbQuestions.filter((q) => {
      // 1. Filter by subject (skip if no subject selected yet)
      if (selectedSubject && q.subject !== selectedSubject) return false;
      // 2. Filter by grade (if not empty)
      if (selectedGrade && q.grade !== selectedGrade) return false;
      // 3. Filter by selected topic (tree node) if any is selected
      if (selectedTopicKey) {
        // Match either the subTopicId or look at parents if hierarchy matches
        const hasTopicMatch = q.topicId === selectedTopicKey || q.id === selectedTopicKey;
        const topicNode = topicTreeData.find(t => t.key === selectedTopicKey);
        // If they selected a parent topic, match all questions listed in that parent topic
        const isChildMatch = topicNode?.children?.some(c => c.key === q.topicId);
        if (!hasTopicMatch && !isChildMatch) return false;
      }

      // Match actions based on clicking the "Tìm kiếm" button (appliedFilters state)
      // 4. Keyword search
      const kwKeyword = appliedFilters.keyword.trim();
      if (kwKeyword) {
        const textToSearch = `${q.code} ${stripHtmlToText(q.text)} ${q.creator}`.toLowerCase();
        if (!textToSearch.includes(kwKeyword.toLowerCase())) return false;
      }
      // 5. Question Type
      if (appliedFilters.type !== 'all' && q.type !== appliedFilters.type) return false;
      // 6. Cognitive Level
      if (appliedFilters.level !== 'all' && q.level !== appliedFilters.level) return false;
      // 7. Status badge
      if (appliedFilters.status !== 'all' && q.status !== appliedFilters.status) return false;
      // 8. Creator filter
      if (appliedFilters.creator !== 'all' && q.creator !== appliedFilters.creator) return false;
      // 9. Date Range filter
      if (appliedFilters.dateRange && appliedFilters.dateRange.length === 2) {
        const startDate = appliedFilters.dateRange[0].startOf('day').toDate();
        const endDate = appliedFilters.dateRange[1].endOf('day').toDate();
        const qDate = new Date(q.createdAt);
        if (qDate < startDate || qDate > endDate) return false;
      }

      return true;
    });
  }, [dbQuestions, selectedSubject, selectedGrade, selectedTopicKey, appliedFilters, topicTreeData]);

  // Kết quả lọc thay đổi (tìm kiếm mới, đổi bộ lọc...) — quay về trang 1 để tránh đứng ở 1 trang
  // trống nếu tập kết quả mới ít hơn.
  useEffect(() => {
    setTablePage(1);
  }, [filteredQuestions]);

  const paginatedQuestions = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredQuestions.slice(start, start + tablePageSize);
  }, [filteredQuestions, tablePage, tablePageSize]);

  const handleSearchAction = () => {
    setAppliedFilters({
      keyword: searchKeyword,
      type: filterType,
      level: filterLevel,
      status: filterStatus,
      creator: filterCreator,
      dateRange: filterDateRange
    });
    toast.success('Đã áp dụng bộ lọc câu hỏi!');
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setFilterType('all');
    setFilterLevel('all');
    setFilterStatus('all');
    setFilterCreator('all');
    setFilterDateRange(null);
    setAppliedFilters({
      keyword: '',
      type: 'all',
      level: 'all',
      status: 'all',
      creator: 'all',
      dateRange: null
    });
    setSelectedTopicKey(null);
    setTopicSearch('');
    setDebouncedTopicSearch(''); // reset lọc ngay, không chờ debounce 300ms
    toast.info('Đã làm mới bộ lọc.');
  };

  const getQuestionTypeLabelShort = (type: QuestionType) => {
    switch (type) {
      case 'single': return 'TN';
      case 'multiple': return 'TLN';
      case 'true_false': return 'DS';
      case 'short': return 'TL';
      default: return 'TN';
    }
  };

  const getCognitiveLevelLabelShort = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet': return 'NB';
      case 'thong_hieu': return 'TH';
      case 'van_dung': return 'VD';
      case 'van_dung_cao': return 'VDC';
      default: return 'NB';
    }
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '20/05/2025';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '20/05/2025';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '20/05/2025';
    }
  };



  const handleImportMockFiles = () => {
    toast.loading('Đang phân tích cấu trúc dữ liệu tệp tin nhập vào...');
    const targetSubject = actualSubject || 'Toán học';
    const targetGrade = actualGrade || 'Khối 12';
    setTimeout(() => {
      // Add two questions
      const importQ1: Question = {
        id: `q-imp-1-${Date.now()}`,
        code: `IMP-${targetSubject.substring(0, 3).toUpperCase()}-101`,
        text: `[Imported] Câu hỏi trắc nghiệm tích hợp số 1 môn ${targetSubject} bám sát cấu trúc ôn tập năm nay.`,
        type: 'single',
        level: 'nhan_biet',
        status: 'pending',
        subject: targetSubject,
        grade: targetGrade,
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Phương án A',
        options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      const importQ2: Question = {
        id: `q-imp-2-${Date.now()}`,
        code: `IMP-${targetSubject.substring(0, 3).toUpperCase()}-102`,
        text: `[Imported] Tìm mệnh đề kiểm tra kiến thức kỹ năng liên môn nâng cao thực hành thực tế.`,
        type: 'short',
        level: 'van_dung_cao',
        status: 'approved',
        subject: targetSubject,
        grade: targetGrade,
        topicId: selectedTopicKey || topicTreeData[0]?.children?.[0]?.key || 'math-sub1.1',
        topicName: 'Danh mục nhập khẩu',
        correctAnswer: 'Kết quả tính toán sau khảo sát thực nghiệm',
        creator: 'Nhập tệp Word/Excel',
        createdAt: new Date().toISOString()
      };

      onAddQuestion?.(importQ1);
      onAddQuestion?.(importQ2);
      setIsImportOpen(false);
      toast.success('Nhập tệp tin hoàn tất! Đã thêm thành công 02 câu hỏi mới vào ngân hàng.');
    }, 1500);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteQuestion) {
      try {
        await bankQuestionApi.delete(pendingDeleteQuestion.id);
        onDeleteQuestion?.(pendingDeleteQuestion.id);
        toast.success(`Đã xóa câu hỏi ${pendingDeleteQuestion.code} khỏi ngân hàng.`);
        fetchQuestions(); // refresh from API
        setSelectedRowKeys((prev) => prev.filter((k) => k !== pendingDeleteQuestion.id));
        setPendingDeleteQuestion(null);
        setIsDeleteOpen(false);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi xóa câu hỏi');
      }
    } else if (selectedRowKeys.length > 0) {
      try {
        // 1 request duy nhất (bulk-delete) thay vì Promise.all N request DELETE riêng lẻ — mỗi
        // request cũ vẫn tốn round-trip + transaction DB riêng dù chạy song song ở FE, nên xóa
        // hàng chục/trăm câu cùng lúc rất chậm trước đây.
        const res = await bankQuestionApi.bulkDelete(selectedRowKeys as string[]);
        if (res.deletedCount > 0) {
          selectedRowKeys.forEach((key) => onDeleteQuestion?.(key as string));
        }
        if (res.blocked.length > 0) {
        } else {
          toast.success(`Đã xóa ${res.deletedCount} câu hỏi khỏi ngân hàng.`);
        }
        fetchQuestions(); // refresh from API
        setSelectedRowKeys([]);
        setIsDeleteOpen(false);
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi xóa câu hỏi');
      }
    } else {
      setIsDeleteOpen(false);
    }
  };

  const handleSendReviewConfirm = async () => {
    if (pendingSendReviewQuestion) {
      try {
        await bankQuestionApi.submit(pendingSendReviewQuestion.id, creatorName);
        const updated = { ...pendingSendReviewQuestion, status: 'pending' as QuestionStatus };
        onUpdateQuestion?.(updated, { silent: true });
        toast.success(`Đã gửi câu hỏi ${pendingSendReviewQuestion.code} đi thẩm định!`);
        fetchQuestions();
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi gửi thẩm định');
      }
      setPendingSendReviewQuestion(null);
    } else if (selectedRowKeys.length > 0) {
      try {
        for (const key of selectedRowKeys) {
          const quest = dbQuestions.find((q) => q.id === key);
          if (quest && (quest.status === 'draft' || quest.status === 'rejected')) {
            await bankQuestionApi.submit(quest.id, creatorName);
            onUpdateQuestion?.({ ...quest, status: 'pending' as QuestionStatus }, { silent: true });
          }
        }
        toast.success(`Đã gửi ${selectedRowKeys.length} câu hỏi đi thẩm định!`);
        fetchQuestions();
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi gửi thẩm định');
      }
      setSelectedRowKeys([]);
    }
    setIsSendReviewOpen(false);
  };

  // Review Modal State & Handlers
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReviewQuestion, setSelectedReviewQuestion] = useState<Question | null>(null);

  const handleOpenReviewInternal = (q: Question) => {
    setSelectedReviewQuestion(q);
    setIsReviewOpen(true);
  };

  const handleApproveQuestion = async (id: string, feedback: string) => {
    try {
      await bankQuestionApi.approve(id, feedback, creatorName);
      fetchQuestions();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi phê duyệt câu hỏi');
    }
  };

  const handleRejectQuestion = async (id: string, feedback: string) => {
    try {
      await bankQuestionApi.reject(id, feedback, creatorName);
      fetchQuestions();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi từ chối câu hỏi');
    }
  };

  const handleBulkReviewQuestions = async (ids: string[], verdict: 'approve' | 'reject', comment: string) => {
    try {
      await bankQuestionApi.bulkReview(ids, verdict, comment, creatorName);
      fetchQuestions();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi thẩm định câu hỏi');
    }
  };

  const getQuestionStatusLabel = (status: QuestionStatus): string => {
    switch (status) {
      case 'approved': return 'Đã thẩm định';
      case 'pending': return 'Chờ thẩm định';
      case 'rejected': return 'Từ chối';
      case 'draft':
      default: return 'Tạo mới';
    }
  };

  // Base dùng chung cho cả 4 trạng thái — width cố định + căn giữa để viền bao quanh bằng nhau bất
  // kể độ dài chữ (trước đây span tự co theo nội dung, "Chờ thẩm định" dài hơn hẳn "Tạo mới"/"Từ
  // chối" nhìn lệch hàng). 96px đủ rộng cho nhãn dài nhất ("Chờ thẩm định") ở cỡ chữ text-[10px].
  const QUESTION_STATUS_BADGE_BASE = "inline-flex items-center justify-center w-24 py-0.5 rounded border font-bold text-[10px] text-center";

  const renderQuestionStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className={`${QUESTION_STATUS_BADGE_BASE} border-emerald-300 bg-emerald-50 text-emerald-700`}>
            Đã thẩm định
          </span>
        );
      case 'pending':
        return (
          <span className={`${QUESTION_STATUS_BADGE_BASE} border-amber-300 bg-amber-50 text-amber-700`}>
            Chờ thẩm định
          </span>
        );
      case 'rejected':
        return (
          <span className={`${QUESTION_STATUS_BADGE_BASE} border-rose-300 bg-rose-50 text-rose-600`}>
            Từ chối
          </span>
        );
      case 'draft':
      default:
        return (
          <span className={`${QUESTION_STATUS_BADGE_BASE} border-slate-300 bg-slate-50 text-slate-700`}>
            Tạo mới
          </span>
        );
    }
  };

  const renderQuestionActions = (record: Question) => {
    const canSendReview = record.status === 'draft' || record.status === 'rejected';
    // Chỉ cho sửa khi "Tạo mới"/"Từ chối" (chưa gửi hoặc bị từ chối thẩm định) — "Chờ thẩm định"/"Đã
    // thẩm định" coi như đã chốt, không cho sửa nữa (ẩn hẳn nút thay vì chỉ disable).
    const canEditQuestion = record.status === 'draft' || record.status === 'rejected';
    const showEye = record.status === 'pending' || record.status === 'approved' || record.status === 'rejected';

    const menuItems: MenuProps['items'] = [];

    if (canSendReview) {
      menuItems.push({
        key: 'send-review',
        label: <span className="text-xs font-semibold text-slate-700">Gửi thẩm định/phản biện</span>,
        icon: <SendOutlined className="text-slate-500 text-xs" style={{ transform: 'rotate(-45deg)' }} />,
        onClick: () => {
          setPendingSendReviewQuestion(record);
          setIsSendReviewOpen(true);
        }
      });
    }

    menuItems.push({
      key: 'history',
      label: <span className="text-xs font-semibold text-slate-700">Lịch sử chỉnh sửa, thẩm định</span>,
      icon: <HistoryOutlined className="text-slate-500 text-xs" />,
      onClick: () => {
        setHistoryQuestion(record);
      }
    });

    menuItems.push({
      key: 'delete',
      label: <span className="text-xs font-semibold text-red-655">Xóa câu hỏi</span>,
      icon: <DeleteOutlined className="text-red-500 text-xs" />,
      danger: true,
      onClick: () => {
        setPendingDeleteQuestion(record);
        setIsDeleteOpen(true);
      }
    });

    return (
      <div className="flex items-center justify-center gap-1.5">
        {showEye && (
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined className="text-blue-600 text-xs" />}
              className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
              onClick={() => {
                setDetailQuestion(record);
                setIsDetailOpen(true);
              }}
              style={{ cursor: 'pointer' }}
            />
          </Tooltip>
        )}
        {canEditQuestion && (
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined className="text-blue-600 text-xs" />}
              className="flex items-center justify-center w-7 h-7 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
              onClick={() => {
                setUpdateQuestion(record);
                setIsUpdateOpen(true);
              }}
              style={{ cursor: 'pointer' }}
            />
          </Tooltip>
        )}
        <Tooltip title="Xem thêm">
          <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight">
            <Button
              type="text"
              icon={<MoreOutlined className="text-slate-500 text-xs" />}
              className="flex items-center justify-center w-7 h-7 hover:bg-slate-100 rounded"
              style={{ cursor: 'pointer' }}
            />
          </Dropdown>
        </Tooltip>
      </div>
    );
  };

  // Cột xuất Excel — khớp đúng các cột đang hiển thị ở bảng "Kết quả tìm kiếm", dùng chung module
  // excelExport với tab "Quản lý đề gốc" (ExamManagementModule).
  const questionExcelColumns: ExcelColumn<Question>[] = [
    { header: 'STT', accessor: (_row, i) => i + 1, width: 6, align: 'center' },
    { header: 'Mã câu hỏi', accessor: row => row.code, width: 16 },
    { header: 'Nội dung câu hỏi', accessor: row => stripHtmlToText(row.text), width: 60 },
    { header: 'Loại câu hỏi', accessor: row => getQuestionTypeLabelShort(row.type), width: 12, align: 'center' },
    { header: 'Cấp độ tư duy', accessor: row => getCognitiveLevelLabelShort(row.level), width: 12, align: 'center' },
    { header: 'Người tạo', accessor: row => row.creator || '', width: 20 },
    { header: 'Thành phần năng lực', accessor: row => row.nangLuc || '', width: 20 },
    { header: 'Thuộc chủ đề', accessor: row => row.topicName || '', width: 20 },
    { header: 'Ngày tạo', accessor: row => formatDateString(row.createdAt), width: 12, align: 'center' },
    { header: 'Trạng thái', accessor: row => getQuestionStatusLabel(row.status), width: 16 },
  ];

  // Xuất Excel đúng bảng "Kết quả tìm kiếm" đang hiển thị (đã áp dụng bộ lọc tìm kiếm hiện tại).
  const handleExportExcel = () => {
    if (filteredQuestions.length === 0) {
      return;
    }
    const fileName = `NganHangCauHoi_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(filteredQuestions, questionExcelColumns, fileName, 'Câu hỏi');
    toast.success('Xuất báo cáo Excel thành công!');
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tab Headers */}
      <div className="flex gap-1 border-b border-gray-300 relative mb-2">
        {canManageOrSubmit && (
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'bank'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'bank' ? '#eff6ff' : undefined,
              cursor: 'pointer'
            }}
          >
            Ngân hàng câu hỏi
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border transition-all relative z-10 -mb-px ${activeTab === 'review'
              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-800'
              }`}
            style={{
              borderBottomColor: activeTab === 'review' ? '#eff6ff' : undefined,
              cursor: 'pointer'
            }}
          >
            Thẩm định ngân hàng câu hỏi
          </button>
        )}
      </div>

      {activeTab === 'bank' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch lg:max-h-[calc(100vh-170px)] animate-in fade-in duration-300" id="question-bank-container">

          {/* 20% Left Column Sidebar Filters Card — vị trí cố định, không di chuyển theo scroll */}
          <div
            id="question-bank-left-sidebar"
            className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white shadow-xs p-4 lg:max-h-[calc(100vh-170px)] overflow-y-auto flex flex-col"
          >
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide">
                <FilterOutlined className="text-blue-900" />
                <span>Phân loại kiểm tra</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Môn học</label>
                <Select
                  id="select-subject-filter"
                  value={selectedSubject}
                  onChange={(val) => {
                    setSelectedSubject(val);
                    setSelectedTopicKey(null); // reset topic key
                    setTopicSearch(''); // reset ô lọc chủ đề — cây chủ đề đổi hẳn theo môn học khác
                    setDebouncedTopicSearch('');
                  }}
                  options={subjectDropdownOptions}
                  className="w-full text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tìm kiếm</label>
                <Input
                  id="select-topic-search-filter"
                  allowClear
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Nhập tên chủ đề để lọc cây bên dưới..."
                  className="w-full text-xs font-bold"
                />
              </div>
            </div>

            {/* Tree Menu Subjects/Topics */}
            <div className="flex-1 mt-4 overflow-y-auto pr-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cây chủ đề môn học</label>
              <Spin spinning={topicsLoading} size="small">
                {filteredTopicTreeData.length > 0 ? (
                  <Tree
                    ref={topicTreeRef}
                    showLine={{ showLeafIcon: false }}
                    blockNode
                    expandedKeys={treeExpandedKeys}
                    onExpand={(keys) => setTreeExpandedKeys(keys)}
                    onSelect={handleSelectTopicNode}
                    treeData={filteredTopicTreeData}
                    selectedKeys={selectedTopicKey ? [selectedTopicKey] : []}
                    className="text-xs font-medium text-slate-700 bg-transparent"
                  />
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    {topicsLoading
                      ? 'Đang tải chủ đề...'
                      : debouncedTopicSearch.trim()
                        ? 'Không tìm thấy chủ đề phù hợp'
                        : 'Chưa có chủ đề đã thẩm định cho môn học này'}
                  </div>
                )}
              </Spin>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Button
                className="w-full text-[11px] font-extrabold bg-slate-50 border-slate-200 text-slate-600 rounded-lg py-1 hover:bg-slate-100 cursor-pointer"
                onClick={handleResetFilters}
              >
                Làm sạch bộ lọc
              </Button>
            </div>
          </div>

          {/* 80% Right Column Content Area */}
          <div className="lg:col-span-4 flex flex-col space-y-4 lg:max-h-[calc(100vh-170px)] lg:overflow-y-auto lg:pr-1" id="question-bank-right-content">

            {/* Tìm kiếm thông tin Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300">
              <div
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`flex items-center justify-between text-slate-800 font-extrabold text-xs uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none ${isFilterExpanded ? 'pb-3 mb-4 border-b border-slate-100' : 'pb-0 mb-0'
                  }`}
              >
                <div className="flex items-center gap-1">
                  <span>Tìm kiếm thông tin</span>
                  <span className="text-[12px] font-bold text-slate-500 ml-1">
                    {isFilterExpanded ? '^' : 'v'}
                  </span>
                </div>
              </div>

              {isFilterExpanded && (
                <div className="animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ID, Nội dung câu hỏi</label>
                      <Input
                        placeholder="Nhập"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        className="rounded border-slate-350 text-xs"
                        onPressEnter={handleSearchAction}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Khối lớp</label>
                      <Select
                        mode="multiple"
                        maxTagCount="responsive"
                        value={selectedGrade ? [selectedGrade] : []}
                        onChange={(val) => setSelectedGrade(val[val.length - 1] || '')}
                        className="w-full text-xs font-medium"
                        options={gradeDropdownOptions}
                        placeholder="Tất cả"
                        style={{ borderRadius: '4px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Loại câu hỏi</label>
                      <Select
                        value={filterType}
                        onChange={setFilterType}
                        className="w-full text-xs font-medium"
                        options={[{ value: 'all', label: 'Tất cả' }, ...questionTypeFilterOptions]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Cấp độ tư duy</label>
                      <Select
                        value={filterLevel}
                        onChange={setFilterLevel}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          ...cognitiveLevelFilterOptions
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Trạng thái</label>
                      <Select
                        value={filterStatus}
                        onChange={setFilterStatus}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'approved', label: 'Đã thẩm định' },
                          { value: 'pending', label: 'Chờ thẩm định' },
                          { value: 'draft', label: 'Tạo mới' }
                        ]}
                      />
                    </div>

                    <div className="hidden md:block"></div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Người tạo</label>
                      <Select
                        value={filterCreator}
                        onChange={setFilterCreator}
                        className="w-full text-xs font-medium"
                        options={[
                          { value: 'all', label: 'Tất cả' },
                          ...creatorFilterOptions,
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày tạo:</label>
                      <DatePicker.RangePicker
                        placeholder={['Bắt đầu', 'Kết thúc']}
                        value={filterDateRange}
                        onChange={(dates) => setFilterDateRange(dates)}
                        format="DD-MM-YYYY"
                        className="w-full rounded border-slate-350 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center mt-5">
                    <Button
                      type="primary"
                      onClick={handleSearchAction}
                      className="bg-[#1a4f9c] border-transparent text-white font-extrabold text-xs px-8 py-1.5 h-9 rounded hover:bg-blue-800 cursor-pointer flex items-center justify-center"
                      style={{ cursor: 'pointer' }}
                    >
                      Tìm kiếm
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Kết quả tìm kiếm Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[#002147] font-black text-sm uppercase tracking-tight">
                    Kết quả tìm kiếm
                  </h2>
                  {selectedRowKeys.length > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                      Đã chọn <span className="font-bold">{selectedRowKeys.length}</span> câu hỏi
                    </span>
                  )}
                </div>

                {/* Action button group */}
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button
                    type="default"
                    icon={<PlusOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (!selectedTopicKey) {
                        toast.error('Vui lòng chọn chủ đề/tiểu mục ở sidebar bên trái trước khi thêm mới câu hỏi.');
                        return;
                      }
                      setActiveModalType('single');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Thêm mới
                  </Button>
                  <Button
                    type="default"
                    icon={<ThunderboltOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsAIOpen(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    Thêm bằng AI
                  </Button>
                  <Button
                    type="default"
                    icon={<SendOutlined />}
                    className="border border-blue-600 text-blue-600 bg-white rounded hover:border-blue-700 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (selectedRowKeys.length === 0) {
                        return;
                      }
                      setPendingSendReviewQuestion(null);
                      setIsSendReviewOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Gửi thẩm định
                  </Button>
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    className="border border-red-600 text-red-650 bg-white rounded hover:border-red-700 hover:text-red-700 hover:bg-red-50 font-bold text-xs px-4 h-8 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (selectedRowKeys.length === 0) {
                        return;
                      }
                      setPendingDeleteQuestion(
                        selectedRowKeys.length === 1
                          ? dbQuestions.find((q) => q.id === selectedRowKeys[0]) || null
                          : null
                      );
                      setIsDeleteOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Xóa
                  </Button>
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    onClick={handleExportExcel}
                    className="!bg-green-600 !border-green-600 !text-white font-semibold text-xs rounded hover:!bg-green-700 cursor-pointer h-8 flex items-center justify-center"
                  >
                    Xuất Excel
                  </Button>
                </div>
              </div>



              <ResizableTableStyles />
              <div className="overflow-x-auto">
                {questionsLoading ? (
                  <div className="py-20 text-center">
                    <Spin size="large" />
                    <p className="text-xs text-slate-400 font-bold mt-2">Đang tải câu hỏi...</p>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <Empty description="Không có câu hỏi nào." className="py-12" />
                ) : (
                  <table
                    id="question-bank-main-table"
                    style={{ minWidth: qbTotalWidth }}
                    className={`w-full text-xs font-normal text-black border-collapse table-fixed ${RESIZABLE_TABLE_CLASS}`}
                  >
                    {qbColGroup}
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-black font-bold">
                        <th className="relative py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-[#2c3e9e]"
                            checked={paginatedQuestions.length > 0 && paginatedQuestions.every((q) => selectedRowKeys.includes(q.id))}
                            onChange={() => {
                              const pageIds = paginatedQuestions.map((q) => q.id);
                              const allSelected = pageIds.every((id) => selectedRowKeys.includes(id));
                              if (allSelected) setSelectedRowKeys((prev) => prev.filter((k) => !pageIds.includes(k as string)));
                              else setSelectedRowKeys((prev) => Array.from(new Set([...prev, ...pageIds])));
                            }}
                          />
                          <ColResizeHandle onMouseDown={startQbColResize(0)} />
                        </th>
                        <th className="relative py-3 px-3 text-center font-bold">STT<ColResizeHandle onMouseDown={startQbColResize(1)} /></th>
                        <th className="relative py-3 px-3 text-left font-bold">Mã câu hỏi<ColResizeHandle onMouseDown={startQbColResize(2)} /></th>
                        <th className="relative py-3 px-3 text-left font-bold">Nội dung câu hỏi<ColResizeHandle onMouseDown={startQbColResize(3)} /></th>
                        <th className="relative py-3 px-3 text-center font-bold">Loại câu hỏi<ColResizeHandle onMouseDown={startQbColResize(4)} /></th>
                        <th className="relative py-3 px-3 text-center font-bold">Cấp độ tư duy<ColResizeHandle onMouseDown={startQbColResize(5)} /></th>
                        <th className="relative py-3 px-3 text-left font-bold">Người tạo<ColResizeHandle onMouseDown={startQbColResize(6)} /></th>
                        <th className="relative py-3 px-3 text-left font-bold">Thành phần năng lực<ColResizeHandle onMouseDown={startQbColResize(7)} /></th>
                        <th className="relative py-3 px-3 text-left font-bold">Thuộc chủ đề<ColResizeHandle onMouseDown={startQbColResize(8)} /></th>
                        <th className="relative py-3 px-3 text-center font-bold">Ngày tạo<ColResizeHandle onMouseDown={startQbColResize(9)} /></th>
                        <th className="relative py-3 px-3 text-center font-bold">Trạng thái<ColResizeHandle onMouseDown={startQbColResize(10)} /></th>
                        <th className="relative py-3 px-3 text-center font-bold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedQuestions.map((record, idx) => (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-50/50 transition-colors ${selectedRowKeys.includes(record.id) ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              className="cursor-pointer accent-[#2c3e9e]"
                              checked={selectedRowKeys.includes(record.id)}
                              onChange={() => setSelectedRowKeys((prev) => prev.includes(record.id) ? prev.filter((k) => k !== record.id) : [...prev, record.id])}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center text-black text-[11px] font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3"><TruncatedText text={record.code} className="text-black text-[11px] font-semibold" /></td>
                          <td className="py-2.5 px-3"><TruncatedText text={renderQuestionPreview(record.text)} tooltipText={renderQuestionPreview(record.text)} className="text-black text-[11px]" /></td>
                          <td className="py-2.5 px-3 text-center text-black text-[11px]">{getQuestionTypeLabelShort(record.type)}</td>
                          <td className="py-2.5 px-3 text-center text-black text-[11px]">{getCognitiveLevelLabelShort(record.level)}</td>
                          <td className="py-2.5 px-3"><TruncatedText text={record.creator || ''} className="text-black text-[11px]" /></td>
                          <td className="py-2.5 px-3"><TruncatedText text={record.nangLuc || '.........................'} className="text-black text-[11px]" /></td>
                          <td className="py-2.5 px-3"><TruncatedText text={record.topicName || '.........................'} className="text-black text-[11px]" /></td>
                          <td className="py-2.5 px-3 text-center text-black text-[11px]">{formatDateString(record.createdAt)}</td>
                          <td className="py-2.5 px-3 text-center">{renderQuestionStatusBadge(record.status)}</td>
                          <td className="py-2.5 px-3 text-center">{renderQuestionActions(record)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredQuestions.length > 0 && (
                <div className="flex justify-end mt-6">
                  <Pagination
                    current={tablePage}
                    pageSize={tablePageSize}
                    total={filteredQuestions.length}
                    showTotal={(total, range) => `${range[0]} - ${range[1]} / ${total} bản ghi`}
                    showSizeChanger
                    pageSizeOptions={['10', '20', '50', '100']}
                    locale={{ items_per_page: '/ trang' }}
                    onChange={(page, pageSize) => {
                      setTablePage(page);
                      setTablePageSize(pageSize);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MODAL: ADD NEW QUESTION - ALL TYPES */}
          <CreateQuestionModal
            open={activeModalType !== null}
            initialType={activeModalType || 'single'}
            onClose={() => setActiveModalType(null)}
            onSave={(q: Question) => {
              onAddQuestion?.(q);
              fetchQuestions(); // refresh from API
              setActiveModalType(null);
            }}
            onSendReview={(q: Question) => {
              onAddQuestion?.(q);
              fetchQuestions(); // refresh from API
              setActiveModalType(null);
            }}
            subject={actualSubject}
            grade={actualGrade}
            selectedTopicKey={selectedTopicKey}
            topicTreeData={topicTreeData}
            creatorName={creatorName}
          />

          {/* MODAL 2: INTERACTIVE AI SMART GENERATOR */}
          <AIGenerateQuestionModal
            open={isAIOpen}
            onClose={() => setIsAIOpen(false)}
            onSave={(q) => {
              onAddQuestion?.(q);
              fetchQuestions();
            }}
            defaultSubject={actualSubject}
            defaultGrade={actualGrade}
            subjectOptions={apiSubjects}
            gradeOptions={apiGrades}
            allTopicsRaw={allTopicsRaw}
          />

          {/* MODAL 3: IMPORT DATA FROM FILE */}
          <Modal
            title={
              <div className="flex items-center gap-1.5 pb-2 border-b border-emerald-100">
                <UploadOutlined className="text-emerald-700" />
                <span className="font-extrabold uppercase text-slate-800 text-[14px]">Import câu hỏi từ File bên ngoài</span>
              </div>
            }
            open={isImportOpen}
            onCancel={() => setIsImportOpen(false)}
            footer={null}
            width={500}
            centered
          >
            <div className="space-y-4 pt-3">
              <div className="bg-emerald-50/50 border border-emerald-250 p-4 rounded-xl text-xs text-emerald-950 font-medium leading-relaxed">
                💡 Tải xuống <strong>file mẫu excel</strong> hoặc <strong>word</strong> để định dạng đúng quy chuẩn phân loại của hệ thống trước khi tải lên.
                <div className="mt-2 text-[11px] text-blue-900 underline font-bold cursor-pointer hover:text-slate-900">
                  ⬇️ Tải file mẫu word (.docx) cấu trúc câu hỏi (.zip)
                </div>
              </div>

              <div
                className="border-2 border-dashed border-slate-300 rounded-2xl py-10 px-5 text-center bg-slate-50 hover:bg-white hover:border-emerald-600 transition-all cursor-pointer flex flex-col items-center justify-center space-y-2"
                onClick={handleImportMockFiles}
              >
                <UploadOutlined className="text-4xl text-slate-400" />
                <strong className="text-xs text-slate-800 block">Kích vào đây để tải file tài liệu chứa câu hỏi (.docx, .xlsx)</strong>
                <span className="text-[10px] text-slate-400 max-w-sm block">Hệ thống tự nhận biệt câu hỏi qua các từ khóa: Câu 1, Câu 2, A., B., C., D. và dấu sao chỉ đáp án đúng.</span>
              </div>
            </div>
          </Modal>

          {/* History Modal */}
          <QuestionHistoryModal
            question={historyQuestion}
            mode="ngan-hang"
            onClose={() => setHistoryQuestion(null)}
          />

          {/* Detail Modal */}
          <QuestionDetailModal
            open={isDetailOpen}
            question={detailQuestion}
            onClose={() => {
              setIsDetailOpen(false);
              setDetailQuestion(null);
            }}
          />

          {/* CUSTOM CONFIRMATION POPUPS */}
          <DeleteConfirmModal
            open={isDeleteOpen}
            onClose={() => {
              setIsDeleteOpen(false);
              setPendingDeleteQuestion(null);
            }}
            onConfirm={handleDeleteConfirm}
            recordCode={pendingDeleteQuestion?.code}
            selectedCount={selectedRowKeys.length}
          />

          <SendReviewConfirmModal
            open={isSendReviewOpen}
            onClose={() => {
              setIsSendReviewOpen(false);
              setPendingSendReviewQuestion(null);
            }}
            onConfirm={handleSendReviewConfirm}
            recordName={pendingSendReviewQuestion?.code}
            selectedCount={selectedRowKeys.length}
          />

          <ReviewModal
            visible={isReviewOpen}
            onClose={() => {
              setIsReviewOpen(false);
              setSelectedReviewQuestion(null);
            }}
            question={selectedReviewQuestion}
            onApprove={handleApproveQuestion}
            onReject={handleRejectQuestion}
          />

        </div>
      ) : (
        <ThamDinhCauHoiTab
          questions={dbQuestions}
          onUpdateQuestion={onUpdateQuestion}
          onOpenReview={handleOpenReviewInternal}
          apiSubjects={apiSubjects}
          apiGrades={apiGrades}
          cognitiveLevelOptions={cognitiveLevelFilterOptions}
          questionTypeOptions={questionTypeFilterOptions}
          allTopicsRaw={allTopicsRaw}
          topicsLoading={topicsLoading}
          onApproveQuestion={handleApproveQuestion}
          onRejectQuestion={handleRejectQuestion}
          onBulkReviewQuestions={handleBulkReviewQuestions}
          onEditQuestion={(record) => {
            setUpdateQuestion(record);
            setIsUpdateOpen(true);
          }}
        />
      )}

      {/* Luôn mount modal Cập nhật bất kể đang ở tab nào — vì nút "Chỉnh sửa" có thể được bấm
          từ cả tab Ngân hàng câu hỏi và tab Thẩm định */}
      <UpdateQuestionModal
        open={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setUpdateQuestion(null);
        }}
        onSave={(q) => {
          if (onUpdateQuestion) onUpdateQuestion(q);
          fetchQuestions();
        }}
        onSendReview={(q) => {
          if (onUpdateQuestion) onUpdateQuestion(q);
          fetchQuestions();
        }}
        initialType="single"
        subject={actualSubject || updateQuestion?.subject || ''}
        grade={actualGrade || updateQuestion?.grade || ''}
        selectedTopicKey={selectedTopicKey}
        topicTreeData={topicTreeData}
        initialQuestion={updateQuestion || undefined}
        creatorName={creatorName}
      />
    </div>
  );
}
