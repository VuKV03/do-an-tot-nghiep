import React from 'react';
import DanhMucKhoiLop from './quan-ly-danh-muc/danh-muc-khoi-lop';
import DanhMucMonHoc from './quan-ly-danh-muc/danh-muc-mon-hoc';
import DanhMucCapDoTuDuy from './quan-ly-danh-muc/cap-do-tu-duy';
import DanhMucLoaiHinhCauHoi from './quan-ly-danh-muc/loai-hinh-cau-hoi';
import DanhMucThanhPhanNangLuc from './quan-ly-danh-muc/thanh-phan-nang-luc';

interface CategoryAdminModuleProps {
  currentTabKey: string; // 'danh-muc-mon-hoc' | 'danh-muc-khoi-lop' | 'cap-do-tu-duy' | 'loai-hinh-cau-hoi'
  onNavigateTab: (key: string) => void;
}

export default function CategoryAdminModule({
  currentTabKey,
  onNavigateTab
}: CategoryAdminModuleProps) {
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
    </div>
  );
}
