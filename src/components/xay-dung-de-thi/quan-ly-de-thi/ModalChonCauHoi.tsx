import React, { useState, useMemo } from 'react';
import { Modal, Button, Select, Input, Tree, Empty, Tooltip, Tag } from 'antd';
import { SearchOutlined, EyeOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { topicsApi } from '../../../services/danhMucApi';
import { Question } from '../../../types';
import { stripHtmlToText } from '../../../utils/htmlContent';
import ModalChiTietCauHoi from './ModalChiTietCauHoi';

interface ModalChonCauHoiProps {
  open: boolean;
  subject: string;
  onCancel: () => void;
  onSelect: (questions: Question[]) => void;
  /** 'multi' = UC46.3 chọn nhiều, 'single' = UC46.4 thay thế 1 câu */
  mode: 'multi' | 'single';
  /** IDs đã có trong đề, loại khỏi kết quả */
  excludeIds?: string[];
  /** Lọc sẵn theo loại câu hỏi (cho UC46.4) */
  filterType?: string;
  /** Lọc sẵn theo mức độ (cho UC46.4) */
  filterLevel?: string;
  /** Tiêu đề modal tuỳ chỉnh */
  title?: string;
  /** Pool câu hỏi */
  questionPool: Question[];
}

const getLevelLabel = (l: string) => {
  switch (l) {
    case 'nhan_biet': return 'NB';
    case 'thong_hieu': return 'TH';
    case 'van_dung': return 'VD';
    case 'van_dung_cao': return 'VDC';
    default: return l;
  }
};

const getTypeLabel = (t: string) => {
  switch (t) {
    case 'single': return 'Một lựa chọn';
    case 'true_false': return 'Đúng Sai';
    case 'short': return 'Trả lời ngắn';
    case 'multiple': return 'Tự luận';
    default: return t;
  }
};

export default function ModalChonCauHoi({
  open, subject, onCancel, onSelect, mode, excludeIds = [],
  filterType, filterLevel, title, questionPool,
}: ModalChonCauHoiProps) {
  // Search / filter state
  const [searchName, setSearchName] = useState('');
  const [fGrade, setFGrade] = useState<string>('all');
  const [fType, setFType] = useState<string>(filterType || 'all');
  const [fLevel, setFLevel] = useState<string>(filterLevel || 'all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  const [topicSearch, setTopicSearch] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [rawTopics, setRawTopics] = useState<any[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detail modal
  const [detailQ, setDetailQ] = useState<any>(null);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setSearchName('');
      setFGrade('all');
      setFType(filterType || 'all');
      setFLevel(filterLevel || 'all');
      setFStatus('all');
      setSelectedTopicKey(null);

      const fetchTopics = async () => {
        try {
          const res = await topicsApi.list();
          if (res.success && res.data) {
            setRawTopics(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch topics:', err);
        }
      };
      fetchTopics();
    }
  }, [open, filterType, filterLevel]);

  // Topic tree constructed dynamically from rawTopics
  const topicTree = useMemo(() => {
    if (rawTopics.length === 0) return [];
    
    const filteredTopics = rawTopics.filter(t => t.subject_name === subject);
    const map: { [key: string]: any } = {};
    filteredTopics.forEach(t => {
      map[t.id] = {
        key: t.id,
        title: `${t.code ? t.code + '. ' : ''}${t.name}`,
        parent_id: t.parent_id,
        children: []
      };
    });
    
    const tree: any[] = [];
    filteredTopics.forEach(t => {
      const node = map[t.id];
      if (t.parent_id && map[t.parent_id]) {
        map[t.parent_id].children.push(node);
      } else {
        tree.push(node);
      }
    });

    const filterTreeBySearch = (nodes: any[], query: string): any[] => {
      return nodes
        .map(node => {
          const match = node.title.toLowerCase().includes(query.toLowerCase());
          const filteredChildren = node.children && node.children.length > 0 
            ? filterTreeBySearch(node.children, query) 
            : [];
          
          if (match || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren.length > 0 ? filteredChildren : undefined
            };
          }
          return null;
        })
        .filter((node): node is any => node !== null);
    };

    const cleanTree = (nodes: any[]) => {
      nodes.forEach(n => {
        if (n.children && n.children.length === 0) {
          delete n.children;
        } else if (n.children) {
          cleanTree(n.children);
        }
      });
    };
    
    if (topicSearch.trim()) {
      const searched = filterTreeBySearch(tree, topicSearch.trim());
      cleanTree(searched);
      return searched;
    }

    cleanTree(tree);
    return tree;
  }, [rawTopics, subject, topicSearch]);

  // Filtered questions
  const filtered = useMemo(() => {
    return questionPool.filter(q => {
      if (q.subject !== subject) return false;
      if (excludeIds.includes(q.id)) return false;
      if (fGrade !== 'all' && q.grade !== fGrade) return false;
      if (fType !== 'all' && q.type !== fType) return false;
      if (fLevel !== 'all' && q.level !== fLevel) return false;
      if (fStatus !== 'all' && q.status !== fStatus) return false;
      if (searchName.trim() && !`${q.code} ${stripHtmlToText(q.text)}`.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (selectedTopicKey) {
        const isMatchOrDescendant = (nodeId: string, targetId: string): boolean => {
          if (nodeId === targetId) return true;
          const topic = rawTopics.find(t => t.id === nodeId);
          if (topic && topic.parent_id) {
            return isMatchOrDescendant(topic.parent_id, targetId);
          }
          return false;
        };
        if (!q.topicId || !isMatchOrDescendant(q.topicId, selectedTopicKey)) return false;
      }
      return true;
    });
  }, [questionPool, subject, excludeIds, fGrade, fType, fLevel, fStatus, searchName, selectedTopicKey, topicTree, rawTopics]);

  const toggleRow = (id: string) => {
    if (mode === 'single') {
      setSelectedIds([id]);
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const handleConfirm = () => {
    const selected = questionPool.filter(q => selectedIds.includes(q.id));
    onSelect(selected);
  };

  const defaultTitle = mode === 'multi'
    ? 'Chọn câu hỏi cho đề thi riêng lẻ'
    : 'Chọn câu hỏi thay thế';

  return (
    <Modal
      title={<span className="font-bold text-sm text-[#1a3c8b]">{title || defaultTitle}</span>}
      open={open}
      onCancel={onCancel}
      width={960}
      centered
      footer={[
        <Button key="close" onClick={onCancel} className="rounded font-semibold text-xs">Đóng</Button>,
        <Button key="select" type="primary" onClick={handleConfirm}
          disabled={selectedIds.length === 0}
          className="bg-[#2c3e9e] border-transparent text-white rounded font-semibold text-xs hover:bg-[#243590]">
          Chọn câu hỏi{mode === 'multi' && selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
        </Button>
      ]}
    >
      <div className="flex gap-4 pt-2" style={{ minHeight: 420 }}>
        {/* LEFT: Topic tree */}
        <div className="shrink-0" style={{ width: 200 }}>
          <div className="mb-2">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Môn học</label>
            <Select value={subject} disabled className="w-full text-xs" options={[{ value: subject, label: subject }]} />
          </div>
          <div className="text-[11px] font-bold text-slate-700 mb-1">Chọn chủ đề</div>
          <Input size="small" placeholder="Tìm kiếm chủ đề" prefix={<SearchOutlined className="text-slate-400" />}
            className="text-xs mb-2" value={topicSearch} onChange={e => setTopicSearch(e.target.value)} allowClear />
          <div className="overflow-y-auto border border-slate-200 rounded p-1.5" style={{ maxHeight: 310 }}>
            {topicTree.length > 0 ? (
              <Tree
                treeData={topicTree as any}
                blockNode
                className="text-[11px]"
                selectedKeys={selectedTopicKey ? [selectedTopicKey] : []}
                onSelect={(keys) => setSelectedTopicKey(keys.length > 0 ? String(keys[0]) : null)}
              />
            ) : (
              <Empty description="Không có chủ đề" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </div>

        {/* RIGHT: Filters + Results */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
            <div className="flex items-center gap-1.5 cursor-pointer mb-2" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <span className="text-[#1a3c8b] font-bold text-xs italic">Tìm kiếm thông tin</span>
              {isFilterExpanded ? <UpOutlined className="text-[9px] text-[#1a3c8b]" /> : <DownOutlined className="text-[9px] text-[#1a3c8b]" />}
            </div>
            {isFilterExpanded && (
              <>
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 text-[11px]">
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Tên câu hỏi</label>
                    <Input size="small" placeholder="Nhập" className="text-xs" value={searchName} onChange={e => setSearchName(e.target.value)} allowClear />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Khối lớp</label>
                    <Select size="small" value={fGrade} onChange={setFGrade} className="w-full text-xs"
                      options={[{ value: 'all', label: 'Tất cả' }, { value: 'Khối 10', label: 'Khối 10' }, { value: 'Khối 11', label: 'Khối 11' }, { value: 'Khối 12', label: 'Khối 12' }]} />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Loại câu hỏi</label>
                    <Select size="small" value={fType} onChange={setFType} className="w-full text-xs"
                      disabled={mode === 'single' && !!filterType}
                      options={[{ value: 'all', label: 'Tất cả' }, { value: 'single', label: 'Một lựa chọn' }, { value: 'true_false', label: 'Đúng Sai' }, { value: 'short', label: 'Trả lời ngắn' }]} />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Mức độ câu hỏi</label>
                    <Select size="small" value={fLevel} onChange={setFLevel} className="w-full text-xs"
                      disabled={mode === 'single' && !!filterLevel}
                      options={[{ value: 'all', label: 'Tất cả' }, { value: 'nhan_biet', label: 'Nhận biết' }, { value: 'thong_hieu', label: 'Thông hiểu' }, { value: 'van_dung', label: 'Vận dụng' }, { value: 'van_dung_cao', label: 'Vận dụng cao' }]} />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-0.5">Trạng thái</label>
                    <Select size="small" value={fStatus} onChange={setFStatus} className="w-full text-xs"
                      options={[{ value: 'all', label: 'Tất cả' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'draft', label: 'Nháp' }]} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Results */}
          <div className="text-[#1a3c8b] font-bold text-xs italic mb-2">Kết quả tìm kiếm</div>
          <div className="overflow-auto border border-slate-200 rounded" style={{ maxHeight: 280 }}>
            <table className="w-full text-[11px] font-medium text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 font-semibold">
                  <th className="py-2 px-2 text-center w-8">
                    {mode === 'multi' && (
                      <input type="checkbox" className="cursor-pointer accent-[#2c3e9e]"
                        checked={filtered.length > 0 && filtered.every(q => selectedIds.includes(q.id))}
                        onChange={() => {
                          if (filtered.every(q => selectedIds.includes(q.id))) {
                            setSelectedIds(prev => prev.filter(id => !filtered.map(q => q.id).includes(id)));
                          } else {
                            setSelectedIds(prev => [...new Set([...prev, ...filtered.map(q => q.id)])]);
                          }
                        }}
                      />
                    )}
                  </th>
                  <th className="py-2 px-2 text-center w-10">STT</th>
                  <th className="py-2 px-2 text-left">Mã câu hỏi</th>
                  <th className="py-2 px-2 text-left" style={{ minWidth: 180 }}>Nội dung câu hỏi</th>
                  <th className="py-2 px-2 text-center">Loại câu hỏi</th>
                  <th className="py-2 px-2 text-center">Cấp độ tư duy</th>
                  <th className="py-2 px-2 text-left">Thuộc chủ đề</th>
                  <th className="py-2 px-2 text-center">Ngày tạo</th>
                  <th className="py-2 px-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center"><Empty description="Không tìm thấy câu hỏi" image={Empty.PRESENTED_IMAGE_SIMPLE} /></td></tr>
                ) : filtered.map((q, idx) => {
                  const checked = selectedIds.includes(q.id);
                  return (
                    <tr key={q.id} className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${checked ? 'bg-blue-50/40' : ''}`}
                      onClick={() => toggleRow(q.id)}>
                      <td className="py-2 px-2 text-center">
                        <input type={mode === 'single' ? 'radio' : 'checkbox'} className="cursor-pointer accent-[#2c3e9e]"
                          checked={checked} onChange={() => toggleRow(q.id)} onClick={e => e.stopPropagation()} />
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono text-[10px]">{q.code}</td>
                      <td className="py-2 px-2">
                        <span className="block max-w-[200px] truncate">{stripHtmlToText(q.text)}</span>
                      </td>
                      <td className="py-2 px-2 text-center">{getTypeLabel(q.type)}</td>
                      <td className="py-2 px-2 text-center">
                        <Tag className="rounded-full text-[9px] font-bold px-1.5 m-0 border-transparent" color="blue">{getLevelLabel(q.level)}</Tag>
                      </td>
                      <td className="py-2 px-2 text-[10px] text-slate-500">{q.topicName || '—'}</td>
                      <td className="py-2 px-2 text-center text-[10px] text-slate-400">{q.createdAt?.slice(0, 10) || '—'}</td>
                      <td className="py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                        <Tooltip title="Xem chi tiết">
                          <Button size="small" type="text" icon={<EyeOutlined className="text-[#2c3e9e]" />}
                            onClick={() => setDetailQ(q)} className="cursor-pointer" />
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
            {filtered.length} bản ghi
            {selectedIds.length > 0 && <span className="ml-2 text-blue-600 font-bold">• Đã chọn {selectedIds.length}</span>}
          </div>
        </div>
      </div>

      {/* Sub-modal: chi tiết câu hỏi */}
      <ModalChiTietCauHoi open={!!detailQ} question={detailQ} onClose={() => setDetailQ(null)} />
    </Modal>
  );
}
