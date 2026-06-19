import React, { useState } from 'react';
import { Tree, Select, Input, Button, message, Space, Modal, Tag, Tooltip } from 'antd';
import {
  FolderOpenOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  BookOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { SUBJECTS, TOPICS_TREE } from '../data';
import { TopicNode, Question } from '../types';

interface QuestionTopicsModuleProps {
  questions: Question[];
  onTopicsUpdate?: (updatedTree: { [key: string]: TopicNode[] }) => void;
}

export default function QuestionTopicsModule({ questions, onTopicsUpdate }: QuestionTopicsModuleProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('Toán học');
  const [localTopicsTree, setLocalTopicsTree] = useState<{ [key: string]: TopicNode[] }>(TOPICS_TREE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Forms state
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newSubTopicTitle, setNewSubTopicTitle] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // List of topics for the current selected subject
  const currentSubjectTopics = localTopicsTree[selectedSubject] || [];

  // Helper to count questions mapped to high level Topic ID or low level SubTopic
  const getQuestionCountForTopic = (topicKey: string): number => {
    return questions.filter(q => 
      q.subject === selectedSubject && 
      (q.topicId === topicKey || q.topicName.includes(topicKey) || q.subTopicName?.includes(topicKey))
    ).length;
  };

  // Convert topics to antd tree data format with dynamic badge counts
  const getTreeData = () => {
    const filterAndMap = (nodes: TopicNode[]): any[] => {
      return nodes
        .map(node => {
          const count = getQuestionCountForTopic(node.key);
          const hasMatchedChild = node.children && node.children.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesQuery = node.title.toLowerCase().includes(searchQuery.toLowerCase()) || hasMatchedChild;

          if (searchQuery && !matchesQuery) {
            return null;
          }

          return {
            key: node.key,
            title: (
              <div className="flex items-center justify-between w-full group py-0.5 pr-2">
                <span className={`text-xs ${selectedKey === node.key ? 'font-bold text-blue-900' : 'text-slate-700'}`}>
                  {node.title}
                </span>
                <div className="flex items-center gap-2 ml-4">
                  <Tag className="text-[9px] font-extrabold px-1.5 py-0 rounded-full border-none bg-slate-100 text-slate-500">
                    {count} câu
                  </Tag>
                </div>
              </div>
            ),
            children: node.children ? filterAndMap(node.children) : undefined
          };
        })
        .filter(Boolean);
    };

    return filterAndMap(currentSubjectTopics);
  };

  // Trigger global data synchronization if callback provided
  const triggerUpdate = (newTree: { [key: string]: TopicNode[] }) => {
    setLocalTopicsTree(newTree);
    if (onTopicsUpdate) {
      onTopicsUpdate(newTree);
    }
  };

  // Action: Add top-level parent topic
  const handleAddParentTopic = () => {
    if (!newTopicTitle.trim()) {
      message.warning('Vui lòng nhập tên chuyên đề chính!');
      return;
    }

    const newKey = `topic-${Date.now()}`;
    const newTopic: TopicNode = {
      key: newKey,
      title: `${currentSubjectTopics.length + 1}. ${newTopicTitle.trim()}`,
      children: []
    };

    const updatedTree = {
      ...localTopicsTree,
      [selectedSubject]: [...currentSubjectTopics, newTopic]
    };

    triggerUpdate(updatedTree);
    setNewTopicTitle('');
    message.success('Đã thêm chuyên đề chính mới thành công!');
  };

  // Action: Add subtopic to chosen parent node
  const handleAddSubTopic = () => {
    if (!selectedKey) {
      message.warning('Vui lòng chọn một chuyên đề cha trên cây thư mục trước!');
      return;
    }
    if (!newSubTopicTitle.trim()) {
      message.warning('Vui lòng nhập tên chủ đề con!');
      return;
    }

    const updatedList = currentSubjectTopics.map(parent => {
      // Find parent matching selectedKey
      if (parent.key === selectedKey) {
        const subIndex = (parent.children?.length || 0) + 1;
        const indexText = parent.title.split(' ')[0]; // E.g., "1." -> "1.1"
        const indexPrefix = indexText.endsWith('.') ? indexText : `${indexText}.`;
        const newSub: TopicNode = {
          key: `sub-${Date.now()}`,
          title: `${indexPrefix}${subIndex}. ${newSubTopicTitle.trim()}`
        };
        return {
          ...parent,
          children: [...(parent.children || []), newSub]
        };
      }
      return parent;
    });

    const updatedTree = { ...localTopicsTree, [selectedSubject]: updatedList };
    triggerUpdate(updatedTree);
    setNewSubTopicTitle('');
    message.success('Đã thêm chủ đề con mới thành công!');
  };

  // Click on tree item
  const handleSelectTreeNode = (keys: any[]) => {
    if (keys && keys.length > 0) {
      setSelectedKey(keys[0]);
      // Pre-populate edit title based on key lookup
      const findNode = (nodes: TopicNode[]): TopicNode | null => {
        for (const n of nodes) {
          if (n.key === keys[0]) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return null;
      };
      const node = findNode(currentSubjectTopics);
      if (node) {
        setEditTitle(node.title.replace(/^\d+(\.\d+)*\.\s*/, '')); // Strip index numbers for editing raw name
      }
    } else {
      setSelectedKey(null);
    }
  };

  // Open modal to edit selected node
  const handleOpenEdit = () => {
    if (!selectedKey) {
      message.warning('Vui lòng chọn chuyên đề cần chỉnh sửa trên cây!');
      return;
    }
    setIsEditModalOpen(true);
  };

  // Save edited title
  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      message.warning('Tên không được để trống!');
      return;
    }

    const updateTitleInList = (nodes: TopicNode[]): TopicNode[] => {
      return nodes.map(n => {
        if (n.key === selectedKey) {
          // Keep the original prefix if present
          const prefixMatch = n.title.match(/^\d+(\.\d+)*\.\s*/);
          const prefix = prefixMatch ? prefixMatch[0] : '';
          return {
            ...n,
            title: `${prefix}${editTitle.trim()}`
          };
        }
        if (n.children) {
          return {
            ...n,
            children: updateTitleInList(n.children)
          };
        }
        return n;
      });
    };

    const updatedTree = {
      ...localTopicsTree,
      [selectedSubject]: updateTitleInList(currentSubjectTopics)
    };

    triggerUpdate(updatedTree);
    setIsEditModalOpen(false);
    message.success('Cập nhật tên chuyên đề thành công!');
  };

  // Action: Delete node
  const handleDeleteNode = () => {
    if (!selectedKey) {
      message.warning('Vui lòng chọn chuyên đề cần xóa trên cây!');
      return;
    }

    const count = getQuestionCountForTopic(selectedKey);
    if (count > 0) {
      message.error(`Không thể xóa chuyên đề này vì đang có ${count} câu hỏi được phân bổ ở ngân hàng!`);
      return;
    }

    Modal.confirm({
      title: 'Xác nhận xóa chuyên đề?',
      content: 'Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa chuyên đề này ra khỏi chương trình học?',
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy bỏ',
      centered: true,
      onOk: () => {
        const deleteFromList = (nodes: TopicNode[]): TopicNode[] => {
          return nodes
            .filter(n => n.key !== selectedKey)
            .map(n => {
              if (n.children) {
                return {
                  ...n,
                  children: deleteFromList(n.children)
                };
              }
              return n;
            });
        };

        const updatedTree = {
          ...localTopicsTree,
          [selectedSubject]: deleteFromList(currentSubjectTopics)
        };

        triggerUpdate(updatedTree);
        setSelectedKey(null);
        message.success('Đã xóa chuyên đề thành công!');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2" id="question-topics-container">
      
      {/* Big Tree View (2 cols or 3 cols) */}
      <div 
        id="topics-tree-section" 
        className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col h-[calc(100vh-140px)] overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="border-b border-slate-100 pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-slate-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 my-0">
              <FolderOpenOutlined className="text-[#002147]" />
              Cấu trúc chương trình học & Chuyên đề
            </h3>
            
            {/* Subject picker */}
            <Select
              id="select-subject-topic-picker"
              value={selectedSubject}
              onChange={(val) => {
                setSelectedSubject(val);
                setSelectedKey(null);
              }}
              style={{ width: 150 }}
              className="text-xs font-bold font-sans"
              options={SUBJECTS}
              size="small"
            />
          </div>

          <div className="relative">
            <Input
              id="search-topics-tree"
              placeholder="Tìm kiếm chuyên đề, từ khóa, chủ đề chính..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg text-xs"
              size="middle"
              allowClear
            />
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1 scrollbar-thin select-none">
          {getTreeData().length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              Không tìm thấy chủ đề nào phù hợp. Bạn có thể tự khởi tạo chuyên đề mới ở bảng bên phải!
            </div>
          ) : (
            <Tree
              showLine={{ showLeafIcon: false }}
              showIcon={false}
              blockNode
              onSelect={handleSelectTreeNode}
              treeData={getTreeData()}
              className="text-xs font-medium text-slate-700"
              selectedKeys={selectedKey ? [selectedKey] : []}
            />
          )}
        </div>

        {/* Quick bottom action toolbar */}
        {selectedKey && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Chuyên đề đã chọn: <strong className="text-blue-900">{selectedKey}</strong>
            </span>
            <Space size="small">
              <Tooltip title="Chỉnh sửa tên chuyên đề">
                <Button 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={handleOpenEdit}
                  className="rounded-lg border-slate-200 text-slate-600 hover:text-blue-600 active:scale-95 text-xs font-bold"
                >
                  Sửa tên
                </Button>
              </Tooltip>
              <Tooltip title="Xóa chuyên đề (Không cho phép nếu đã có câu hỏi)">
                <Button 
                  size="small" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={handleDeleteNode}
                  className="rounded-lg text-xs font-bold"
                >
                  Xóa bỏ
                </Button>
              </Tooltip>
            </Space>
          </div>
        )}
      </div>

      {/* Forms & Specifications Sidebar (2 cols) */}
      <div className="lg:col-span-2 space-y-5" id="topics-management-forms">
        
        {/* Card 1: Add Parent Topic */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
            <FolderAddOutlined className="text-[#002147] text-sm" />
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900">Thêm chuyên đề chính (Cấp lớn)</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Môn học áp dụng</label>
              <Input value={selectedSubject} disabled className="bg-slate-50 font-bold text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tên chuyên đề lớn muốn tạo</label>
              <Input
                placeholder="Ví dụ: Giới hạn và Hàm số liên tục"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddParentTopic}
              className="w-full bg-[#002147] border-transparent text-white rounded-xl text-xs font-black shadow-xs active:scale-98 cursor-pointer h-9"
            >
              Tạo chuyên đề lớn
            </Button>
          </div>
        </div>

        {/* Card 2: Add Subtopic to Selected */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
            <PlusOutlined className="text-blue-600 text-sm animate-pulse" />
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-900">Thêm chủ đề con (Cấp độ chi tiết)</span>
          </div>
          <div className="space-y-4">
            {!selectedKey ? (
              <div className="text-center py-4 text-slate-400 text-[11px] font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200 p-3 leading-relaxed">
                👉 Vui lòng nhấp chọn một chuyên đề chính trên cây thư mục bên trái để làm chuyên đề gốc trước khi thêm chủ đề con!
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Chuyên đề cha đang chọn</label>
                  <Input value={selectedKey} disabled className="bg-slate-100 font-bold text-xs text-blue-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tên chủ đề chi tiết mới</label>
                  <Input
                    placeholder="Ví dụ: Phương trình tiếp tuyến của đồ thị"
                    value={newSubTopicTitle}
                    onChange={(e) => setNewSubTopicTitle(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button
                  onClick={handleAddSubTopic}
                  type="primary"
                  className="w-full bg-blue-600 border-transparent text-white rounded-xl text-xs font-black shadow-xs active:scale-98 cursor-pointer h-9"
                >
                  Tạo chủ đề con
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Overview matrix stat info */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-slate-50 to-sky-50/50 p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#002147]/5 flex items-center justify-center text-lg shrink-0 mt-0.5">
              <BookOutlined className="text-[#002147]" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Quy tắc mã hóa cây danh mục</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Sắp xếp theo thứ tự số tự nhiên liên tục giúp hệ thống <strong className="text-slate-800">SmartTest AI Engine</strong> hiểu đúng thứ tự chương trình Sách giáo khoa chuẩn quốc gia để tự động tráo xóc ma trận đề thi đồng đều nhất.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Form Modal */}
      <Modal
        title={
          <div className="border-b pb-2 flex items-center gap-1.5">
            <EditOutlined className="text-blue-600" />
            <span className="font-extrabold uppercase text-[12px] text-slate-800">Thay đổi tên chuyên đề</span>
          </div>
        }
        open={isEditModalOpen}
        onOk={handleSaveEdit}
        onCancel={() => setIsEditModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy bỏ"
        centered
        width={400}
      >
        <div className="pt-4 space-y-3">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tên chuyên đề mới</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-xs"
              autoFocus
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
