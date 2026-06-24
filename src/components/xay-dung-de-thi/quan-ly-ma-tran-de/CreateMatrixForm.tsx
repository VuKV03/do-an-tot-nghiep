import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input, Select, Button, Tree, Radio, InputNumber, Spin, message, Tooltip, Empty } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';

const getShortCode = (ma: string, ten: string) => {
  const lowerTen = ten.toLowerCase();
  if (lowerTen.includes('nhiều lựa chọn') || lowerTen === 'trắc nghiệm') return 'TN';
  if (lowerTen.includes('đúng sai') || lowerTen.includes('đúng/sai')) return 'ĐS';
  if (lowerTen.includes('trả lời ngắn') || lowerTen.includes('tự luận ngắn') || lowerTen === 'trả lời ngắn') return 'TLN';
  if (lowerTen.includes('tự luận')) return 'TL';
  return ma;
};
import type { TreeDataNode, TreeProps } from 'antd';
import {
  apiGetMonHoc, apiGetCaiDatMaTran, apiGetChuDe, apiSaveMaTran,
  apiGetMatrixConfigDetail, apiUpdateMaTran,
  MonHocOption, CaiDatMaTran, ChuDeNode, MaTranData, ItemMaTranData,
} from './mockData';

interface Props {
  onBack: () => void;
  editingId?: string;
}

export default function CreateMatrixForm({ onBack, editingId }: Props) {
  // --- State ---
  const [monHocList, setMonHocList] = useState<MonHocOption[]>([]);
  const [monHocId, setMonHocId] = useState<string | null>(null);
  const [maMatran, setMaMatran] = useState('');
  const [tenMatran, setTenMatran] = useState('');
  const [loai, setLoai] = useState<number>(1); // 1=Thủ công
  const [isChangingSubject, setIsChangingSubject] = useState(false);
  const [saving, setSaving] = useState(false);

  const [caiDat, setCaiDat] = useState<CaiDatMaTran | null>(null);
  const [dataChuDe, setDataChuDe] = useState<ChuDeNode[]>([]);
  const [dataChuDeSelect, setDataChuDeSelect] = useState<TreeDataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<{ checked: React.Key[]; halfChecked: React.Key[] }>({ checked: [], halfChecked: [] });
  const [searchValue, setSearchValue] = useState('');
  const [obj, setObj] = useState<MaTranData[]>([]);

  // --- Step 1: Chọn Môn ---
  const changeMonHoc = async (value: string) => {
    setIsChangingSubject(true);
    setCheckedKeys({ checked: [], halfChecked: [] }); setObj([]);
    setMonHocId(value);
    const cd = await apiGetCaiDatMaTran(value);
    setCaiDat(cd);
    const chuDe = await apiGetChuDe(value);
    setDataChuDe(chuDe);
    setDataChuDeSelect(formatChuDeItems(chuDe));
    setIsChangingSubject(false);
    return { cd, chuDe };
  };

  useEffect(() => {
    const loadDetail = async () => {
      if (!editingId) return;
      try {
        const res = await apiGetMatrixConfigDetail(editingId);
        if (res.success && res.data) {
          const mId = res.data.mon_hoc_id;
          
          // Load subject data
          setIsChangingSubject(true);
          setMonHocId(mId);
          const cd = await apiGetCaiDatMaTran(mId);
          setCaiDat(cd);
          const chuDe = await apiGetChuDe(mId);
          setDataChuDe(chuDe);
          setDataChuDeSelect(formatChuDeItems(chuDe));
          setIsChangingSubject(false);

          // Now populate the fields
          setTenMatran(res.data.name);
          setMaMatran(res.data.code);

          // Populate tree selection
          const ds = res.data.ds_cau_truc || [];
          const keys = ds.map((row: any) => row.don_vi_id);
          setCheckedKeys({ checked: keys, halfChecked: [] });

          // Populate matrix structure
          setObj(ds);
        } else {
          message.error(res.message || 'Lỗi khi tải chi tiết ma trận.');
        }
      } catch (e) {
        message.error('Lỗi khi tải chi tiết ma trận.');
      }
    };

    apiGetMonHoc().then(list => {
      setMonHocList(list);
      loadDetail();
    });
  }, [editingId]);

  // --- Format helpers ---
  const formatChuDeItems = (items: ChuDeNode[]): TreeDataNode[] =>
    items?.map(item => ({
      title: item.ten,
      key: item.id,
      children: item.children?.length ? formatChuDeItems(item.children) : undefined,
    })) || [];

  const flattenTree = (nodes: TreeDataNode[]): TreeDataNode[] => {
    let r: TreeDataNode[] = [];
    nodes.forEach(n => {
      r.push({ ...n, children: undefined });
      if (n.children) r = r.concat(flattenTree(n.children));
    });
    return r;
  };

  // --- Bước 6-7: Tick chọn chủ đề → Tạo data table ---
  const layTatCaId = (ids: React.Key[], tree: ChuDeNode[]): { child: ChuDeNode; parent: ChuDeNode }[] => {
    const result: { child: ChuDeNode; parent: ChuDeNode }[] = [];
    tree.forEach(parent => {
      parent.children?.forEach(child => {
        if (ids.includes(child.id)) result.push({ child, parent });
      });
    });
    return result;
  };

  const taoDanhSachMaTran = (
    items: { child: ChuDeNode; parent: ChuDeNode }[],
    nangLuc: CaiDatMaTran['ds_dm_thanh_phan_nang_luc'],
    mucDo: CaiDatMaTran['ds_dm_muc_do'],
    loaiCH: CaiDatMaTran['ds_loai_cau_hoi'],
  ): MaTranData[] => {
    return items.map(({ child, parent }) => {
      const dsCH: ItemMaTranData[] = [];
      loaiCH.forEach(lch => {
        nangLuc.forEach(nl => {
          mucDo.forEach(md => {
            const found = child.ds_cau_hoi?.find(
              q => q.muc_do_id === md.id && q.loai_cau_hoi_id === lch.loai_cau_hoi_id && q.nang_luc_id === nl.id
            );
            dsCH.push({
              muc_do_id: md.id, loai_cau_hoi_id: lch.loai_cau_hoi_id, nang_luc_id: nl.id,
              so_cau: 0, tong_so_cau: found?.so_luong ?? 0, diem: lch.diem,
            });
          });
        });
      });
      return {
        noi_dung_kien_thuc: parent.ten, noi_dung_id: parent.id, ma_noi_dung: parent.ma,
        don_vi_kien_thuc: child.ten, don_vi_id: child.id, ma_don_vi: child.ma,
        so_tiet: parent.so_tiet || 0, is_dung_sai: parent.is_dung_sai || false,
        ds_loai_cau_hoi: dsCH, ti_le: '0',
      };
    });
  };

  const onCheck: TreeProps['onCheck'] = (checkedKeysVal, info) => {
    if (!caiDat) return;
    const keysObj = checkedKeysVal as { checked: React.Key[]; halfChecked: React.Key[] };
    setCheckedKeys(keysObj);
    const ids = keysObj.checked;
    const found = layTatCaId(ids, dataChuDe);
    const newData = taoDanhSachMaTran(found, caiDat.ds_dm_thanh_phan_nang_luc, caiDat.ds_dm_muc_do, caiDat.ds_loai_cau_hoi);
    setObj(prev => {
      const kept = prev.filter(r => ids.includes(r.don_vi_id));
      newData.forEach(item => { if (!kept.some(e => e.don_vi_id === item.don_vi_id)) kept.push(item); });
      kept.sort((a, b) => (a.noi_dung_kien_thuc || '').localeCompare(b.noi_dung_kien_thuc || '') || a.don_vi_kien_thuc.localeCompare(b.don_vi_kien_thuc));
      return [...kept];
    });
  };

  // --- Sinh ma trận ngẫu nhiên ---
  const handleAutoGenerateMatrix = () => {
    if (!caiDat || dataChuDe.length === 0) return;
    const pairs: { child: ChuDeNode; parent: ChuDeNode }[] = [];
    dataChuDe.forEach(parent => {
      parent.children?.forEach(child => {
        pairs.push({ child, parent });
      });
    });
    if (pairs.length === 0) return;
    const selectedPairs = pairs.slice(0, Math.min(pairs.length, 3));
    const selectedKeys = selectedPairs.map(p => p.child.id);
    setCheckedKeys({ checked: selectedKeys, halfChecked: [] });
    const generatedData = taoDanhSachMaTran(selectedPairs, caiDat.ds_dm_thanh_phan_nang_luc, caiDat.ds_dm_muc_do, caiDat.ds_loai_cau_hoi);
    generatedData.forEach((row, rIdx) => {
      row.ds_loai_cau_hoi.forEach((cell) => {
        if (cell.loai_cau_hoi_id === 'lch-tn') {
          cell.so_cau = 4;
        } else if (cell.loai_cau_hoi_id === 'lch-tln') {
          cell.so_cau = rIdx === 1 ? 1 : 2;
        } else if (cell.loai_cau_hoi_id === 'lch-ds') {
          cell.so_cau = rIdx === 1 ? 2 : 1;
        }
        cell.diem = cell.diem || 0.25;
      });
      const totalDiem = row.ds_loai_cau_hoi.reduce((s, c) => s + (c.so_cau || 0) * (c.diem || 0), 0);
      row.ti_le = totalDiem.toFixed(2);
    });
    setObj(generatedData);
    message.success('Đã tự động phân bổ câu hỏi ngẫu nhiên chuẩn 10 điểm!');
  };

  // --- Bước 10: Nhập số câu ---
  const handleInputChange = (rowIdx: number, cellIdx: number, val: number | null) => {
    setObj(prev => {
      const next = [...prev];
      const row = { ...next[rowIdx], ds_loai_cau_hoi: [...next[rowIdx].ds_loai_cau_hoi] };
      row.ds_loai_cau_hoi[cellIdx] = { ...row.ds_loai_cau_hoi[cellIdx], so_cau: val ?? 0 };
      // recalc ti_le
      const totalCau = row.ds_loai_cau_hoi.reduce((s, c) => s + (c.so_cau || 0), 0);
      const totalDiem = row.ds_loai_cau_hoi.reduce((s, c) => s + (c.so_cau || 0) * (c.diem || 0), 0);
      row.ti_le = totalDiem.toFixed(2);
      next[rowIdx] = row;
      return next;
    });
  };

  const handleRemoveRow = (donViId: string) => {
    setCheckedKeys(prev => {
      const nextChecked = prev.checked.filter(k => k !== donViId);
      return { ...prev, checked: nextChecked };
    });
    setObj(prev => prev.filter(r => r.don_vi_id !== donViId));
  };

  // --- Search tree ---
  const treeData = useMemo(() => {
    if (!searchValue) return dataChuDeSelect;
    const loop = (data: TreeDataNode[]): TreeDataNode[] =>
      data.map(item => {
        const title = String(item.title);
        const idx = title.toLowerCase().indexOf(searchValue.toLowerCase());
        const label = idx > -1
          ? <span>{title.substring(0, idx)}<span className="text-red-500 font-bold">{title.substring(idx, idx + searchValue.length)}</span>{title.substring(idx + searchValue.length)}</span>
          : <span>{title}</span>;
        return { ...item, title: label, children: item.children ? loop(item.children) : undefined } as TreeDataNode;
      }).filter(item => {
        const orig = dataChuDeSelect && flattenTree(dataChuDeSelect).find(n => n.key === item.key);
        const origTitle = String(orig?.title || '');
        const match = origTitle.toLowerCase().includes(searchValue.toLowerCase());
        return match || (item.children && item.children.length > 0);
      });
    return loop(dataChuDeSelect);
  }, [dataChuDeSelect, searchValue]);

  // --- Dynamic columns ---
  const colGroups = useMemo(() => {
    if (!caiDat) return [];
    return caiDat.ds_loai_cau_hoi.map(lch => ({
      loaiCH: lch,
      nangLucs: caiDat.ds_dm_thanh_phan_nang_luc.map(nl => ({
        nangLuc: nl,
        mucDos: caiDat.ds_dm_muc_do,
      })),
    }));
  }, [caiDat]);

  // --- rowSpan calculation ---
  const getRowSpan = (idx: number): number => {
    if (idx > 0 && obj[idx].noi_dung_id === obj[idx - 1].noi_dung_id) return 0;
    return obj.filter(r => r.noi_dung_id === obj[idx].noi_dung_id).length;
  };

  // --- Summary ---
  const summaryByCellIdx = useMemo(() => {
    if (!obj.length || !caiDat) return [];
    const cellCount = obj[0]?.ds_loai_cau_hoi.length || 0;
    return Array.from({ length: cellCount }, (_, ci) =>
      obj.reduce((s, r) => s + (r.ds_loai_cau_hoi[ci]?.so_cau || 0), 0)
    );
  }, [obj, caiDat]);

  const totalQuestions = summaryByCellIdx.reduce((s, v) => s + v, 0);
  const totalScore = useMemo(() => {
    if (!obj.length) return 0;
    return obj.reduce((s, r) => s + r.ds_loai_cau_hoi.reduce((ss, c) => ss + (c.so_cau || 0) * (c.diem || 0), 0), 0);
  }, [obj]);

  // --- Save ---
  const handleSave = async () => {
    if (!monHocId) { message.warning('Vui lòng chọn môn học.'); return; }
    if (!tenMatran.trim()) { message.warning('Vui lòng nhập tên ma trận.'); return; }
    if (obj.length === 0) { message.warning('Vui lòng chọn ít nhất 1 tiểu mục chủ đề.'); return; }
    setSaving(true);
    let res;
    if (editingId) {
      res = await apiUpdateMaTran(editingId, { mon_hoc_id: monHocId, ma: maMatran, ten: tenMatran, ds_cau_truc: obj });
    } else {
      res = await apiSaveMaTran({ mon_hoc_id: monHocId, ma: maMatran, ten: tenMatran, ds_cau_truc: obj });
    }
    setSaving(false);
    if (res.success) {
      message.success(res.message);
      onBack();
    } else {
      message.error(res.message || 'Lỗi khi lưu ma trận.');
    }
  };

  // --- Cell index finder ---
  const getCellIndex = (loaiCHId: string, nlId: string, mdId: string): number => {
    if (!obj.length) return -1;
    return obj[0].ds_loai_cau_hoi.findIndex(c => c.loai_cau_hoi_id === loaiCHId && c.nang_luc_id === nlId && c.muc_do_id === mdId);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack} className="cursor-pointer" />
          <h2 className="text-[#1a3c8b] font-bold text-base m-0">
            {editingId ? 'Chỉnh sửa Ma trận đề thi' : 'Thêm mới Ma trận đề thi'}
          </h2>
        </div>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}
          className="bg-[#2c3e9e] border-transparent text-white font-semibold text-xs rounded cursor-pointer">
          Lưu ma trận
        </Button>
      </div>

      {/* Thông tin chung */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h3 className="text-[#1a3c8b] font-bold text-sm italic m-0 mb-4">Thông tin chung</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Môn học <span className="text-red-500">*</span></label>
            <Select placeholder="Chọn môn học" className="w-full text-xs" loading={monHocList.length === 0}
              value={monHocId} onChange={changeMonHoc} disabled={!!editingId}
              options={monHocList.map(m => ({ value: m.id, label: m.ten }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mã ma trận</label>
            <Input placeholder="Nhập mã" className="text-xs" value={maMatran} onChange={e => setMaMatran(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận <span className="text-red-500">*</span></label>
            <Input placeholder="Nhập tên" className="text-xs" value={tenMatran} onChange={e => setTenMatran(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Loại</label>
            <Radio.Group value={loai} onChange={e => setLoai(e.target.value)} className="text-xs">
              <Radio value={1} className="text-xs">Thủ công</Radio>
              <Radio value={2} className="text-xs">Ngẫu nhiên</Radio>
            </Radio.Group>
          </div>
        </div>
      </div>

      {/* Content: Tree + Table */}
      {monHocId && (
        <Spin spinning={isChangingSubject} tip="Đang tải dữ liệu...">
          <div className="flex gap-4" style={{ minHeight: 400 }}>
            {/* Left: Cây chủ đề */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs" style={{ width: 300, flexShrink: 0 }}>
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="text-[#1a3c8b] font-bold text-xs italic m-0 mb-2">Chọn chủ đề</h3>
                <Input size="small" placeholder="Tìm kiếm..." prefix={<SearchOutlined className="text-slate-400" />}
                  className="text-xs" value={searchValue} onChange={e => setSearchValue(e.target.value)} allowClear
                  disabled={loai === 2} />
              </div>
              <div className="p-3 overflow-y-auto" style={{ maxHeight: 500 }}>
                {loai === 2 ? (
                  <div className="space-y-4 p-2 text-xs">
                    <div className="text-slate-500 font-medium leading-relaxed bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-amber-800">
                      Chế độ sinh ngẫu nhiên sẽ tự động phân bổ câu hỏi từ Ngân hàng câu hỏi theo cấu trúc chuẩn.
                    </div>
                    <Button 
                      type="primary" 
                      onClick={handleAutoGenerateMatrix}
                      className="w-full bg-[#2c3e9e] hover:bg-[#243590] border-transparent text-white font-semibold rounded text-xs py-1.5 cursor-pointer"
                    >
                      Tự động phân bổ câu hỏi
                    </Button>
                  </div>
                ) : dataChuDeSelect.length > 0 ? (
                  <Tree checkable checkStrictly blockNode treeData={treeData}
                    onCheck={onCheck} checkedKeys={checkedKeys}
                    className="text-xs" />
                ) : (
                  <Empty description="Chọn môn học để xem chủ đề" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            </div>

            {/* Right: Bảng ma trận */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-[#1a3c8b] font-bold text-xs m-0">Chi tiết ma trận đề</h3>
                {obj.length > 0 && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                    Tổng: {totalQuestions} câu | {totalScore.toFixed(2)} điểm
                  </span>
                )}
              </div>
              <div className="overflow-auto" style={{ maxHeight: 520 }}>
                {obj.length === 0 ? (
                  <div className="p-8">
                    <Empty description="Tick chọn tiểu mục ở cây bên trái để tạo bảng ma trận" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  <table className="w-full text-[11px] border-collapse" style={{ minWidth: 600 }}>
                    <thead>
                      {/* Row 1: Năng lực header */}
                      <tr className="bg-slate-50">
                        <th rowSpan={3} className="border border-slate-200 px-2 py-2 text-center font-bold w-10 sticky left-0 bg-slate-50 z-10">STT</th>
                        <th rowSpan={3} className="border border-slate-200 px-2 py-2 text-left font-bold sticky bg-slate-50 z-10" style={{ minWidth: 140, left: 40 }}>Nội dung kiến thức</th>
                        <th rowSpan={3} className="border border-slate-200 px-2 py-2 text-left font-bold" style={{ minWidth: 160 }}>Đơn vị kiến thức</th>
                        {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) => (
                          <th key={nl.id} colSpan={caiDat.ds_dm_muc_do.length * caiDat.ds_loai_cau_hoi.length}
                            className="border border-slate-200 px-2 py-1.5 text-center font-bold bg-blue-50 text-[#1a3c8b]">
                            {nl.ten}
                          </th>
                        ))}
                        <th rowSpan={3} className="border border-slate-200 px-2 py-2 text-center font-bold w-16 bg-amber-50">Tổng % điểm</th>
                      </tr>
                      {/* Row 2: Mức độ */}
                      <tr className="bg-slate-50">
                        {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) =>
                          caiDat.ds_dm_muc_do.map((md) => {
                            let shortName = md.ten;
                            if (md.ten === 'Nhận biết') shortName = 'Nhận biết';
                            else if (md.ten === 'Thông hiểu') shortName = 'Thông hiểu';
                            else if (md.ten === 'Vận dụng') shortName = 'Vận dụng';
                            else if (md.ten === 'Vận dụng cao') shortName = 'Vận dụng cao';
                            return (
                              <th key={`${nl.id}-${md.id}`} colSpan={caiDat.ds_loai_cau_hoi.length}
                                className="border border-slate-200 px-1 py-1 text-center font-semibold text-[10px] bg-indigo-50 text-indigo-700">
                                {shortName}
                              </th>
                            );
                          })
                        )}
                      </tr>
                      {/* Row 3: Loại câu hỏi */}
                      <tr className="bg-slate-50">
                        {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) =>
                          caiDat.ds_dm_muc_do.map((md) =>
                            caiDat.ds_loai_cau_hoi.map((lch) => {
                              const shortCode = getShortCode(lch.dm_loai_cau_hoi.ma, lch.dm_loai_cau_hoi.ten);
                              return (
                                <th key={`${nl.id}-${md.id}-${lch.loai_cau_hoi_id}`}
                                  className="border border-slate-200 px-1 py-1 text-center font-medium text-[9px] bg-slate-100 text-slate-600 whitespace-nowrap"
                                  style={{ minWidth: 45 }}>
                                  {shortCode}
                                </th>
                              );
                            })
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {obj.map((row, ri) => {
                        const rs = getRowSpan(ri);
                        return (
                          <tr key={row.don_vi_id} className="hover:bg-blue-50/30 transition-colors">
                            {rs > 0 && (
                              <>
                                <td rowSpan={rs} className="border border-slate-200 px-2 py-1.5 text-center font-medium sticky left-0 bg-white z-10">
                                  {ri + 1}
                                </td>
                                <td rowSpan={rs} className="border border-slate-200 px-2 py-1.5 text-left font-semibold text-slate-800 sticky bg-white z-10" style={{ left: 40 }}>
                                  {row.noi_dung_kien_thuc}
                                </td>
                              </>
                            )}
                            <td className="border border-slate-200 px-2 py-1.5 text-left text-slate-700">
                              <div className="flex items-center justify-between gap-1 group">
                                <span className="font-medium">{row.don_vi_kien_thuc}</span>
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined className="text-red-500 text-[10px]" />}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0 h-5 w-5 flex items-center justify-center border border-red-200 bg-red-50 hover:bg-red-100 rounded cursor-pointer shrink-0"
                                  onClick={() => handleRemoveRow(row.don_vi_id)}
                                />
                              </div>
                            </td>
                            {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) =>
                              caiDat.ds_dm_muc_do.map((md) =>
                                caiDat.ds_loai_cau_hoi.map((lch) => {
                                  const ci = getCellIndex(lch.loai_cau_hoi_id, nl.id, md.id);
                                  const cell = ci >= 0 ? row.ds_loai_cau_hoi[ci] : null;
                                  const isOver = cell && (cell.so_cau || 0) > (cell.tong_so_cau || 0);
                                  return (
                                    <td key={`${nl.id}-${md.id}-${lch.loai_cau_hoi_id}`} className="border border-slate-200 px-0.5 py-0.5 text-center">
                                      <div className="flex items-center justify-center gap-0.5">
                                        <InputNumber size="small" min={0} value={cell?.so_cau ?? 0}
                                          onChange={v => ci >= 0 && handleInputChange(ri, ci, v)}
                                          className="text-[10px]" style={{ width: 36 }} controls={false} />
                                        {cell && cell.tong_so_cau > 0 && (
                                          <Tooltip title={`Ngân hàng: ${cell.tong_so_cau} câu`}>
                                            <span className={`text-[9px] ${isOver ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                              /{cell.tong_so_cau}
                                            </span>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })
                              )
                            )}
                            {rs > 0 && (
                              <td rowSpan={rs} className="border border-slate-200 px-2 py-1.5 text-center font-bold text-amber-700 bg-amber-50/50">
                                {(() => {
                                  const totalScoreVal = obj.reduce((s, r) => s + r.ds_loai_cau_hoi.reduce((ss, c) => ss + (c.so_cau || 0) * (c.diem || 0), 0), 0);
                                  const chudeScore = obj
                                    .filter(r => r.noi_dung_id === row.noi_dung_id)
                                    .reduce((s, r) => s + r.ds_loai_cau_hoi.reduce((ss, c) => ss + (c.so_cau || 0) * (c.diem || 0), 0), 0);
                                  const pct = totalScoreVal > 0 ? Math.round((chudeScore / totalScoreVal) * 100) : 0;
                                  return `${pct}%`;
                                })()}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Summary */}
                    <tfoot>
                      {/* Row 1: Tổng lệnh hỏi */}
                      <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                        <td colSpan={3} className="border border-slate-200 px-2 py-2 text-right text-xs font-bold bg-slate-50">Tổng lệnh hỏi</td>
                        {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) =>
                          caiDat.ds_dm_muc_do.map((md) =>
                            caiDat.ds_loai_cau_hoi.map((lch) => {
                              // Calculate sum for this column
                              let colCount = 0;
                              let colTotal = 0;
                              obj.forEach((r) => {
                                const ci = getCellIndex(lch.loai_cau_hoi_id, nl.id, md.id);
                                if (ci >= 0) {
                                  const cell = r.ds_loai_cau_hoi[ci];
                                  if (cell) {
                                    colCount += cell.so_cau || 0;
                                    colTotal += cell.tong_so_cau || 0;
                                  }
                                }
                              });
                              return (
                                <td key={`${nl.id}-${md.id}-${lch.loai_cau_hoi_id}`} className="border border-slate-200 px-1 py-1.5 text-center text-[10px] font-bold bg-slate-50 text-slate-700">
                                  {colCount}/{colTotal}
                                </td>
                              );
                            })
                          )
                        )}
                        <td className="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-amber-700 bg-amber-50">
                          {totalQuestions} câu
                        </td>
                      </tr>
                      {/* Row 2: Tỉ lệ lệnh hỏi */}
                      <tr className="bg-slate-50 font-semibold border-t border-slate-200">
                        <td colSpan={3} className="border border-slate-200 px-2 py-2 text-right text-xs font-bold bg-slate-50">Tỉ lệ lệnh hỏi</td>
                        {caiDat?.ds_dm_thanh_phan_nang_luc.map((nl) =>
                          caiDat.ds_dm_muc_do.map((md) => {
                            // Sum questions in this specific Năng lực & Mức độ
                            let mdQuestions = 0;
                            obj.forEach((r) => {
                              caiDat.ds_loai_cau_hoi.forEach((lch) => {
                                const ci = getCellIndex(lch.loai_cau_hoi_id, nl.id, md.id);
                                if (ci >= 0) {
                                  mdQuestions += r.ds_loai_cau_hoi[ci]?.so_cau || 0;
                                }
                              });
                            });

                            let pctText = '0%';
                            if (totalQuestions > 0) {
                              pctText = `${Math.round((mdQuestions / totalQuestions) * 100)}%`;
                            } else {
                              if (md.id === 'md-1') pctText = '40%';
                              else if (md.id === 'md-2') pctText = '30%';
                              else if (md.id === 'md-3') pctText = '20%';
                              else if (md.id === 'md-4') pctText = '10%';
                            }

                            return (
                              <td key={`${nl.id}-${md.id}`} colSpan={caiDat.ds_loai_cau_hoi.length}
                                className="border border-slate-200 px-1 py-1.5 text-center text-[10px] font-bold bg-slate-50 text-[#1a3c8b]">
                                {pctText}
                              </td>
                            );
                          })
                        )}
                        <td className="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-500 bg-slate-50"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>
        </Spin>
      )}

      {/* Bảng cấu hình tổng hợp */}
      {obj.length > 0 && caiDat && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5">
          <h3 className="text-[#1a3c8b] font-bold text-xs italic m-0 mb-3">Bảng cấu hình tổng hợp theo loại câu hỏi</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-left font-bold">Loại câu hỏi</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-bold">Số câu yêu cầu</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-bold">Số câu cấu hình</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-bold">Điểm/câu</th>
                <th className="border border-slate-200 px-3 py-2 text-center font-bold">Tổng điểm</th>
              </tr>
            </thead>
            <tbody>
              {caiDat.ds_loai_cau_hoi.map(lch => {
                const soCauConfig = obj.reduce((s, r) =>
                  s + r.ds_loai_cau_hoi.filter(c => c.loai_cau_hoi_id === lch.loai_cau_hoi_id).reduce((ss, c) => ss + (c.so_cau || 0), 0), 0);
                return (
                  <tr key={lch.loai_cau_hoi_id} className="hover:bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2">{lch.noi_dung_phan}</td>
                    <td className="border border-slate-200 px-3 py-2 text-center">{lch.so_luong_cau}</td>
                    <td className={`border border-slate-200 px-3 py-2 text-center font-bold ${soCauConfig > lch.so_luong_cau ? 'text-red-500' : soCauConfig === lch.so_luong_cau ? 'text-green-600' : ''}`}>
                      {soCauConfig}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 text-center">{lch.diem}</td>
                    <td className="border border-slate-200 px-3 py-2 text-center font-bold text-amber-700">{(soCauConfig * lch.diem).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
