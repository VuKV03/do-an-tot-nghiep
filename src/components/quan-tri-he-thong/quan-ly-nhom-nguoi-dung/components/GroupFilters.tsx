import React, { useState } from 'react';
import { Input, Button } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

interface GroupFiltersProps {
  searchCode: string;
  setSearchCode: (val: string) => void;
  searchName: string;
  setSearchName: (val: string) => void;
}
// component bộ lọc nhóm người dùng
export default function GroupFilters({
  searchCode,
  setSearchCode,
  searchName,
  setSearchName
}: GroupFiltersProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg p-5">
      <div
        className="flex items-center gap-2 cursor-pointer select-none w-fit mb-4"
        onClick={() => setIsSearchExpanded(!isSearchExpanded)}
      >
        <h2 className="text-[#1a3b70] font-bold text-sm m-0">Tìm kiếm thông tin</h2>
        {isSearchExpanded ? <UpOutlined className="text-xs text-[#1a3b70]" /> : <DownOutlined className="text-xs text-[#1a3b70]" />}
      </div>

      {isSearchExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã nhóm</label>
              <Input
                placeholder="Nhập mã nhóm"
                className="rounded text-sm py-1.5"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên nhóm</label>
              <Input
                placeholder="Nhập tên nhóm"
                className="rounded text-sm py-1.5"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button
              type="primary"
              className="bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-semibold rounded px-8"
            >
              Tìm kiếm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
