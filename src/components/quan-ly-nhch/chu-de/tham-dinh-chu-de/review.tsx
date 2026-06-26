import React, { useState } from 'react';
import { Modal, Button, Select } from 'antd';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Quote, 
  List, 
  ListOrdered, 
  Outdent, 
  Indent, 
  Link2, 
  Image as ImageIcon, 
  Video, 
  Heading1, 
  Heading2, 
  Sigma, 
  Grid3X3, 
  Type
} from 'lucide-react';

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  record: {
    Id: string;
    Ma: string;
    Ten: string;
    MonThi: string;
    KhoiLop: string;
    NgayTao: string;
    TrangThai: string;
    NguoiTao?: string;
    NguoiDuyetCuoi?: string;
    NgayDuyetCuoi?: string;
  } | null;
  onApprove?: (comment: string) => void;
  onReject?: (comment: string) => void;
}

export default function ReviewModal({ open, onClose, record, onApprove, onReject }: ReviewModalProps) {
  const [comment, setComment] = useState('');
  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({});

  const toggleStyle = (style: string) => {
    setActiveStyles(prev => ({ ...prev, [style]: !prev[style] }));
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove(comment);
    }
    setComment('');
    onClose();
  };

  const handleReject = () => {
    if (onReject) {
      onReject(comment);
    }
    setComment('');
    onClose();
  };

  return (
    <Modal
      title={
        <div className="text-gray-800 text-lg font-bold pb-2 border-b border-gray-100">
          Thẩm định thông tin chủ đề
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="custom-review-modal"
    >
      <div className="flex flex-col gap-6 py-4">
        {/* Section: Thông tin chủ đề */}
        <div>
          <h3 className="text-[#1e3a8a] font-semibold text-base mb-4">
            Thông tin chủ đề
          </h3>
          
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-gray-500 text-sm mb-1">Tên chủ đề</div>
              <div className="text-gray-800 font-medium text-base">
                {record?.Ten || 'Tên chủ đề 01'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-gray-500 text-sm mb-1">Người tạo</div>
                <div className="text-gray-800 font-medium">
                  {record?.NguoiTao || 'Nguyễn Văn An'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Người duyệt lần cuối</div>
                <div className="text-gray-800 font-medium">
                  {record?.NguoiDuyetCuoi || 'Chưa có thông tin'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">Ngày duyệt lần cuối</div>
                <div className="text-gray-800 font-medium">
                  {record?.NgayDuyetCuoi || 'Chưa có thông tin'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Nhận xét */}
        <div>
          <h3 className="text-gray-700 font-semibold text-sm mb-2">
            Nhận xét
          </h3>

          {/* Custom Rich Text Editor Workspace */}
          <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            {/* Rich Text Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-300 text-gray-600 select-none">
              {/* Heading Group */}
              <button 
                type="button"
                onClick={() => toggleStyle('h1')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['h1'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="Tiêu đề 1"
              >
                <Heading1 size={16} />
              </button>
              <button 
                type="button"
                onClick={() => toggleStyle('h2')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['h2'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="Tiêu đề 2"
              >
                <Heading2 size={16} />
              </button>
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Font Family Selector */}
              <Select
                defaultValue="sans-serif"
                size="small"
                variant="borderless"
                className="w-28 text-sm"
                options={[
                  { value: 'sans-serif', label: 'Chữ không chân (Sans Serif)' },
                  { value: 'serif', label: 'Chữ có chân (Serif)' },
                  { value: 'monospace', label: 'Chữ đơn cách (Monospace)' },
                ]}
              />
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Font Size Selector */}
              <Select
                defaultValue="normal"
                size="small"
                variant="borderless"
                className="w-24 text-sm"
                options={[
                  { value: 'small', label: 'Nhỏ' },
                  { value: 'normal', label: 'Thường' },
                  { value: 'large', label: 'Lớn' },
                  { value: 'huge', label: 'Rất lớn' },
                ]}
              />
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Text Styles Group */}
              <button 
                type="button"
                onClick={() => toggleStyle('bold')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center font-bold ${activeStyles['bold'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="In đậm"
              >
                <Bold size={15} />
              </button>
              <button 
                type="button"
                onClick={() => toggleStyle('italic')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['italic'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="In nghiêng"
              >
                <Italic size={15} />
              </button>
              <button 
                type="button"
                onClick={() => toggleStyle('underline')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['underline'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="Gạch chân"
              >
                <Underline size={15} />
              </button>
              <button 
                type="button"
                onClick={() => toggleStyle('strike')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['strike'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="Gạch ngang"
              >
                <Strikethrough size={15} />
              </button>
              <button 
                type="button"
                onClick={() => toggleStyle('quote')}
                className={`p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center ${activeStyles['quote'] ? 'bg-gray-200 text-blue-600' : ''}`}
                title="Trích dẫn"
              >
                <Quote size={15} />
              </button>
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Lists Group */}
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Danh sách số"
              >
                <ListOrdered size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Danh sách ký hiệu"
              >
                <List size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Giảm thụt lề"
              >
                <Outdent size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Tăng thụt lề"
              >
                <Indent size={15} />
              </button>
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Inserts Group */}
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Chèn liên kết"
              >
                <Link2 size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Chèn ảnh"
              >
                <ImageIcon size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Chèn video"
              >
                <Video size={15} />
              </button>
 
              <div className="w-px h-5 bg-gray-300 mx-1" />
 
              {/* Format Paint, Sigma, Table */}
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Sao chép định dạng"
              >
                <Type size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Chèn công thức toán học (Sigma)"
              >
                <Sigma size={15} />
              </button>
              <button 
                type="button"
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                title="Chèn bảng"
              >
                <Grid3X3 size={15} />
              </button>
            </div>

            {/* Editable Text Area */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập"
              className="w-full min-h-[160px] p-4 text-gray-800 border-none outline-none focus:ring-0 resize-y text-sm leading-relaxed font-sans"
              style={{
                fontFamily: activeStyles['monospace'] ? 'monospace' : activeStyles['serif'] ? 'serif' : 'sans-serif',
                fontWeight: activeStyles['bold'] ? 'bold' : 'normal',
                fontStyle: activeStyles['italic'] ? 'italic' : 'normal',
                textDecoration: `${activeStyles['underline'] ? 'underline' : ''} ${activeStyles['strike'] ? 'line-through' : ''}`.trim() || 'none',
              }}
            />
          </div>
        </div>

        {/* Footer Actions (Centered) */}
        <div className="flex justify-center gap-4 mt-4">
          <Button 
            className="border-blue-700 text-blue-700 hover:bg-blue-50 px-8 h-10 font-semibold"
            onClick={onClose}
          >
            Đóng
          </Button>
          <Button 
            danger
            className="bg-[#d91b29] hover:bg-[#b01420] border-none text-white px-6 h-10 font-semibold"
            onClick={handleReject}
          >
            Chưa đạt yêu cầu
          </Button>
          <Button 
            type="primary" 
            className="bg-[#1d4ed8] hover:bg-[#1e40af] border-none px-8 h-10 font-semibold"
            onClick={handleApprove}
          >
            Đạt yêu cầu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
