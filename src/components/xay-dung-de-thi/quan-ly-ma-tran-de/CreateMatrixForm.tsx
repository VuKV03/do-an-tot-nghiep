import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input, Select, Button, Tree, InputNumber, Spin, message, Tooltip, Empty } from 'antd';
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
  apiSaveMaTran,
  apiGetMatrixConfigDetail, apiUpdateMaTran,
  MonHocOption, CaiDatMaTran, ChuDeNode, MaTranData, ItemMaTranData,
} from './mockData';
import {
  subjectCategoryApi, topicsApi, competencyComponentApi, cognitiveLevelApi, questionTypeApi, bankQuestionApi,
  subjectConfigApi, type TopicAPI, type SubjectConfigAPI, type QuestionTypeAPI,
} from '../../../services/danhMucApi.ts';

const countKey = (topicId: string, levelId: string | null, typeId: string | null, competencyId: string | null) =>
  `${topicId}|${levelId}|${typeId}|${competencyId}`;

const countKeyNoCompetency = (topicId: string, levelId: string | null, typeId: string | null) =>
  `${topicId}|${levelId}|${typeId}`;

interface QuestionCountMaps {
  exact: Map<string, number>;
  noCompetency: Map<string, number>;
}

const EMPTY_COUNT_MAPS: QuestionCountMaps = { exact: new Map(), noCompetency: new Map() };

// Câu hỏi chưa gắn "Thành phần năng lực" (competency_component_id = null trong ngân hàng câu hỏi
// — hiện luồng thêm câu hỏi chưa hỗ trợ chọn năng lực) được cộng vào MỌI cột năng lực cùng
// chủ đề/mức độ/loại câu hỏi thay vì bị loại vì không khớp cột nào.
const sumQuestionCount = (
  maps: QuestionCountMaps,
  topicId: string, levelId: string | null, typeId: string | null, competencyId: string | null,
): number => {
  const exact = maps.exact.get(countKey(topicId, levelId, typeId, competencyId)) ?? 0;
  const fallback = maps.noCompetency.get(countKeyNoCompetency(topicId, levelId, typeId)) ?? 0;
  return exact + fallback;
};

const fetchQuestionCounts = async (topicIds: string[]): Promise<QuestionCountMaps> => {
  const exact = new Map<string, number>();
  const noCompetency = new Map<string, number>();
  const ids = Array.from(new Set(topicIds.filter(Boolean)));
  if (ids.length === 0) return { exact, noCompetency };
  try {
    const res = await bankQuestionApi.countByTopic(ids);
    (res.data || []).forEach(row => {
      if (row.competency_component_id) {
        exact.set(countKey(row.topic_id, row.level_id, row.type_id, row.competency_component_id), row.count);
      } else {
        const key = countKeyNoCompetency(row.topic_id, row.level_id, row.type_id);
        noCompetency.set(key, (noCompetency.get(key) ?? 0) + row.count);
      }
    });
  } catch (err) {
    console.error('Lỗi khi đếm số câu hỏi trong ngân hàng theo chủ đề:', err);
  }
  return { exact, noCompetency };
};

const buildTopicTree = (flatList: TopicAPI[]): ChuDeNode[] => {
  const map: { [key: string]: ChuDeNode } = {};
  const roots: ChuDeNode[] = [];

  flatList.forEach((item) => {
    map[item.id] = {
      id: item.id,
      ma: item.code,
      ten: item.name,
      so_tiet: 10,
      is_dung_sai: false,
      children: []
    };
  });

  flatList.forEach((item) => {
    const cloned = map[item.id];
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(cloned);
    } else {
      roots.push(cloned);
    }
  });

  return roots;
};

const toNum = (v: unknown): number => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);

// Xây ds_loai_cau_hoi từ "Cấu hình môn học" (subject_configs: Phần I/II/III cố định), thay cho
// suy luận cứng theo code TN/DS/TLN trước đây. Trả về ChuDeNode[] (cây chủ đề) đi kèm để dùng chung
// cho cả changeMonHoc (Thêm mới) và loadDetail (Edit) — tránh lặp code.
const fetchSubjectMatrixConfig = async (
  selectedSubj: { id: string; code: string },
): Promise<{ cd: CaiDatMaTran; chuDe: ChuDeNode[]; subjectConfig: SubjectConfigAPI | null }> => {
  const cd: CaiDatMaTran = { ds_dm_muc_do: [], ds_dm_thanh_phan_nang_luc: [], ds_loai_cau_hoi: [] };
  let chuDe: ChuDeNode[] = [];

  const topicsRes = await topicsApi.list();
  const rawTopics = topicsRes.data || [];
  chuDe = buildTopicTree(rawTopics.filter(t => t.subject_id === selectedSubj.id));

  const nlRes = await competencyComponentApi.list();
  const rawNL = nlRes.data || [];
  cd.ds_dm_thanh_phan_nang_luc = rawNL
    .filter((nl: any) => nl.subject_id === selectedSubj.id && nl.is_active)
    .map((nl: any) => ({ id: nl.id, ma: nl.code, ten: nl.name }));

  const mdRes = await cognitiveLevelApi.list();
  cd.ds_dm_muc_do = (mdRes.data || []).map((md: any) => ({ id: md.id, ma: md.code, ten: md.name }));

  const [subjectConfig, typesRes] = await Promise.all([
    subjectConfigApi.getBySubjectId(selectedSubj.id).then(res => res.data).catch(() => null),
    questionTypeApi.list(),
  ]);
  const typeMap = new Map<string, QuestionTypeAPI>((typesRes.data || []).map(t => [t.id, t]));

  if (!subjectConfig) {
    message.warning('Môn học chưa được cấu hình (Cấu hình môn học) — vui lòng cấu hình trước khi tạo ma trận.');
    cd.ds_loai_cau_hoi = [];
    return { cd, chuDe, subjectConfig: null };
  }

  // Mỗi phần tự quyết định cách tính điểm dựa trên loại câu hỏi đã chọn: loại có mã
  // 'DS' (Đúng/Sai) tính theo số ý đúng (dùng mức 4 ý đúng làm điểm đại diện cho cả
  // phần, giống cách tính cũ vốn chỉ áp dụng cho Phần II), các loại khác tính theo câu.
  const isDsCode = (code?: string) => (code ?? '').trim().toUpperCase() === 'DS';

  const buildPart = (
    typeId: string | null | undefined,
    from: number | null | undefined,
    to: number | null | undefined,
    content: string | null | undefined,
    answerPoints: unknown,
    ideaPoints: [unknown, unknown, unknown, unknown],
  ) => {
    const type = typeId ? typeMap.get(typeId) : undefined;
    if (isDsCode(type?.code)) {
      return {
        typeId, from, to, content,
        diem: toNum(ideaPoints[3]),
        diem_theo_y: {
          y1: toNum(ideaPoints[0]),
          y2: toNum(ideaPoints[1]),
          y3: toNum(ideaPoints[2]),
          y4: toNum(ideaPoints[3]),
        },
      };
    }
    return { typeId, from, to, content, diem: toNum(answerPoints) };
  };

  const parts = [
    buildPart(
      subjectConfig.type_id_p1, subjectConfig.p1_from, subjectConfig.p1_to, subjectConfig.content_p1,
      subjectConfig.points_for_a_correct_answers_p1,
      [
        subjectConfig.points_for_1_correct_idea_p1,
        subjectConfig.points_for_2_correct_idea_p1,
        subjectConfig.points_for_3_correct_idea_p1,
        subjectConfig.points_for_4_correct_idea_p1,
      ],
    ),
    buildPart(
      subjectConfig.type_id_p2, subjectConfig.p2_from, subjectConfig.p2_to, subjectConfig.content_p2,
      subjectConfig.points_for_a_correct_answers_p2,
      [
        subjectConfig.points_for_1_correct_idea_p2,
        subjectConfig.points_for_2_correct_idea_p2,
        subjectConfig.points_for_3_correct_idea_p2,
        subjectConfig.points_for_4_correct_idea_p2,
      ],
    ),
    buildPart(
      subjectConfig.type_id_p3, subjectConfig.p3_from, subjectConfig.p3_to, subjectConfig.content_p3,
      subjectConfig.points_for_a_correct_answers_p3,
      [
        subjectConfig.points_for_1_correct_idea_p3,
        subjectConfig.points_for_2_correct_idea_p3,
        subjectConfig.points_for_3_correct_idea_p3,
        subjectConfig.points_for_4_correct_idea_p3,
      ],
    ),
  ];

  cd.ds_loai_cau_hoi = parts
    .filter(p => p.typeId && typeMap.has(p.typeId))
    .map(p => {
      const t = typeMap.get(p.typeId!)!;
      const soLuongCau = p.from != null && p.to != null ? Math.max(0, p.to - p.from + 1) : 0;
      return {
        loai_cau_hoi_id: t.id,
        diem: p.diem,
        so_luong_cau: soLuongCau,
        noi_dung_phan: `${p.content || ''}: ${t.name}`.trim(),
        dm_loai_cau_hoi: { id: t.id, ma: t.code, ten: t.name },
        diem_theo_y: (p as any).diem_theo_y,
      };
    });

  return { cd, chuDe, subjectConfig };
};

interface Props {
  onBack: () => void;
  editingId?: string;
}

const MA_MAX_LENGTH = 12;
const TEN_MAX_LENGTH = 255;

export default function CreateMatrixForm({ onBack, editingId }: Props) {
  // --- State ---
  const [monHocList, setMonHocList] = useState<MonHocOption[]>([]);
  const [fullSubjects, setFullSubjects] = useState<any[]>([]);
  const [monHocId, setMonHocId] = useState<string | null>(null);
  const [maMatran, setMaMatran] = useState('');
  const [tenMatran, setTenMatran] = useState('');
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [isChangingSubject, setIsChangingSubject] = useState(false);
  const [saving, setSaving] = useState(false);

  const maMatranError = maMatran.length >= MA_MAX_LENGTH
    ? `Mã ma trận không được vượt quá ${MA_MAX_LENGTH} ký tự.`
    : (attemptedSave && !maMatran.trim() ? 'Vui lòng nhập mã ma trận.' : '');
  const tenMatranError = tenMatran.length >= TEN_MAX_LENGTH
    ? `Tên ma trận không được vượt quá ${TEN_MAX_LENGTH} ký tự.`
    : (attemptedSave && !tenMatran.trim() ? 'Vui lòng nhập tên ma trận.' : '');

  const [caiDat, setCaiDat] = useState<CaiDatMaTran | null>(null);
  const [dataChuDe, setDataChuDe] = useState<ChuDeNode[]>([]);
  const [dataChuDeSelect, setDataChuDeSelect] = useState<TreeDataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<{ checked: React.Key[]; halfChecked: React.Key[] }>({ checked: [], halfChecked: [] });
  const [searchValue, setSearchValue] = useState('');
  const [obj, setObj] = useState<MaTranData[]>([]);
  const [subjectConfig, setSubjectConfig] = useState<SubjectConfigAPI | null>(null);
  const checkRequestSeqRef = React.useRef(0);

  // --- Step 1: Chọn Môn ---
  const changeMonHoc = async (value: string) => {
    setIsChangingSubject(true);
    setCheckedKeys({ checked: [], halfChecked: [] }); setObj([]);
    setMonHocId(value);

    let cd: CaiDatMaTran = { ds_dm_muc_do: [], ds_dm_thanh_phan_nang_luc: [], ds_loai_cau_hoi: [] };
    let chuDe: ChuDeNode[] = [];
    let subjectCfg: SubjectConfigAPI | null = null;
    try {
      const selectedSubj = fullSubjects.find(s => s.code === value);
      if (selectedSubj) {
        const result = await fetchSubjectMatrixConfig(selectedSubj);
        cd = result.cd;
        chuDe = result.chuDe;
        subjectCfg = result.subjectConfig;
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chủ đề/năng lực/cấp độ/loại câu hỏi từ database:', err);
    }

    setCaiDat(cd);
    setSubjectConfig(subjectCfg);
    setDataChuDe(chuDe);
    setDataChuDeSelect(formatChuDeItems(chuDe));
    setIsChangingSubject(false);
    return { cd, chuDe };
  };

  useEffect(() => {
    const loadDetail = async (subjectsList: any[]) => {
      if (!editingId) return;
      try {
        const res = await apiGetMatrixConfigDetail(editingId);
        if (res.success && res.data) {
          const mId = res.data.mon_hoc_id;

          // Load subject data
          setIsChangingSubject(true);
          setMonHocId(mId);

          let cd: CaiDatMaTran = { ds_dm_muc_do: [], ds_dm_thanh_phan_nang_luc: [], ds_loai_cau_hoi: [] };
          let chuDe: ChuDeNode[] = [];
          try {
            const selectedSubj = subjectsList.find(s => s.code === mId);
            if (selectedSubj) {
              const result = await fetchSubjectMatrixConfig(selectedSubj);
              cd = result.cd;
              chuDe = result.chuDe;
              setSubjectConfig(result.subjectConfig);
            }
          } catch (err) {
            console.error('Lỗi khi tải dữ liệu chủ đề/năng lực/cấp độ/loại câu hỏi từ database:', err);
          }

          setCaiDat(cd);
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

          // Populate matrix structure (dùng tạm tong_so_cau đã lưu, sẽ làm mới ngay bên dưới)
          setObj(ds);

          // Làm mới tong_so_cau theo dữ liệu Ngân hàng câu hỏi hiện tại (không dùng số cũ đã đóng băng lúc lưu)
          const countMap = await fetchQuestionCounts(keys);
          setObj(prev => prev.map((row: MaTranData) => ({
            ...row,
            ds_loai_cau_hoi: row.ds_loai_cau_hoi.map(cell => ({
              ...cell,
              tong_so_cau: sumQuestionCount(countMap, row.don_vi_id, cell.muc_do_id, cell.loai_cau_hoi_id, cell.nang_luc_id ?? null),
            })),
          })));
        } else {
          message.error(res.message || 'Lỗi khi tải chi tiết ma trận.');
        }
      } catch (e) {
        message.error('Lỗi khi tải chi tiết ma trận.');
      }
    };

    subjectCategoryApi.list().then(res => {
      const rawList = res.data || [];
      setFullSubjects(rawList);
      const list = rawList
        .filter((item: any) => item.is_active)
        .map((item: any) => ({
          id: item.code,
          ten: item.name
        }));
      setMonHocList(list);
      loadDetail(rawList);
    }).catch(() => {
      message.error('Lỗi khi tải danh sách môn học từ database.');
      loadDetail([]);
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
    if (!Array.isArray(ids)) return result;
    tree.forEach(parent => {
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          if (ids.includes(child.id)) result.push({ child, parent });
        });
      } else {
        if (ids.includes(parent.id)) {
          result.push({ child: parent, parent });
        }
      }
    });
    return result;
  };

  const taoDanhSachMaTran = (
    items: { child: ChuDeNode; parent: ChuDeNode }[],
    nangLuc: CaiDatMaTran['ds_dm_thanh_phan_nang_luc'],
    mucDo: CaiDatMaTran['ds_dm_muc_do'],
    loaiCH: CaiDatMaTran['ds_loai_cau_hoi'],
    countMaps: QuestionCountMaps = EMPTY_COUNT_MAPS,
  ): MaTranData[] => {
    return items.map(({ child, parent }) => {
      const dsCH: ItemMaTranData[] = [];
      loaiCH.forEach(lch => {
        nangLuc.forEach(nl => {
          mucDo.forEach(md => {
            const tongSoCau = sumQuestionCount(countMaps, child.id, md.id, lch.loai_cau_hoi_id, nl.id);
            dsCH.push({
              muc_do_id: md.id, loai_cau_hoi_id: lch.loai_cau_hoi_id, nang_luc_id: nl.id,
              so_cau: 0, tong_so_cau: tongSoCau, diem: lch.diem,
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

  const onCheck: TreeProps['onCheck'] = async (checkedKeysVal, info: any) => {
    if (!caiDat) return;
    let ids: React.Key[] = [];
    let nextCheckedKeys: { checked: React.Key[]; halfChecked: React.Key[] } = { checked: [], halfChecked: [] };

    if (Array.isArray(checkedKeysVal)) {
      ids = checkedKeysVal;
      nextCheckedKeys = { checked: checkedKeysVal, halfChecked: info.halfCheckedKeys || [] };
    } else if (checkedKeysVal && typeof checkedKeysVal === 'object' && 'checked' in checkedKeysVal) {
      ids = checkedKeysVal.checked || [];
      nextCheckedKeys = checkedKeysVal as { checked: React.Key[]; halfChecked: React.Key[] };
    }

    setCheckedKeys(nextCheckedKeys);
    const found = layTatCaId(ids, dataChuDe);

    const seq = ++checkRequestSeqRef.current;
    const countMap = await fetchQuestionCounts(found.map(f => f.child.id));
    if (seq !== checkRequestSeqRef.current) return; // có lượt tick mới hơn đã tới sau, bỏ kết quả cũ này

    const newData = taoDanhSachMaTran(found, caiDat.ds_dm_thanh_phan_nang_luc, caiDat.ds_dm_muc_do, caiDat.ds_loai_cau_hoi, countMap);
    setObj(prev => {
      const kept = prev.filter(r => ids.includes(r.don_vi_id));
      newData.forEach(item => { if (!kept.some(e => e.don_vi_id === item.don_vi_id)) kept.push(item); });
      kept.sort((a, b) => (a.noi_dung_kien_thuc || '').localeCompare(b.noi_dung_kien_thuc || '') || a.don_vi_kien_thuc.localeCompare(b.don_vi_kien_thuc));
      return [...kept];
    });
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
    const kw = searchValue.trim().toLowerCase();
    if (!kw) return dataChuDeSelect;
    const loop = (data: TreeDataNode[]): TreeDataNode[] =>
      data.map(item => {
        const title = String(item.title);
        const idx = title.toLowerCase().indexOf(kw);
        const label = idx > -1
          ? <span>{title.substring(0, idx)}<span className="text-red-500 font-bold">{title.substring(idx, idx + kw.length)}</span>{title.substring(idx + kw.length)}</span>
          : <span>{title}</span>;
        return { ...item, title: label, children: item.children ? loop(item.children) : undefined } as TreeDataNode;
      }).filter(item => {
        const orig = dataChuDeSelect && flattenTree(dataChuDeSelect).find(n => n.key === item.key);
        const origTitle = String(orig?.title || '');
        const match = origTitle.toLowerCase().includes(kw);
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
    setAttemptedSave(true);
    if (!monHocId) { message.warning('Vui lòng chọn môn học.'); return; }
    if (!maMatran.trim()) { message.warning('Vui lòng nhập mã ma trận.'); return; }
    if (maMatran.length > MA_MAX_LENGTH) { message.warning(`Mã ma trận không được vượt quá ${MA_MAX_LENGTH} ký tự.`); return; }
    if (!tenMatran.trim()) { message.warning('Vui lòng nhập tên ma trận.'); return; }
    if (tenMatran.length > TEN_MAX_LENGTH) { message.warning(`Tên ma trận không được vượt quá ${TEN_MAX_LENGTH} ký tự.`); return; }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Môn học <span className="text-red-500">*</span></label>
            <Select placeholder="Chọn môn học" className="w-full text-xs" loading={monHocList.length === 0}
              value={monHocId} onChange={changeMonHoc} disabled={!!editingId}
              options={monHocList.map(m => ({ value: m.id, label: m.ten }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mã ma trận <span className="text-red-500">*</span></label>
            <Input
              placeholder="Nhập mã"
              className="text-xs"
              value={maMatran}
              onChange={e => setMaMatran(e.target.value)}
              maxLength={MA_MAX_LENGTH}
              status={maMatranError ? 'error' : undefined}
            />
            {maMatranError && <div className="text-red-500 text-[11px] mt-1">{maMatranError}</div>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tên ma trận <span className="text-red-500">*</span></label>
            <Input
              placeholder="Nhập tên"
              className="text-xs"
              value={tenMatran}
              onChange={e => setTenMatran(e.target.value)}
              maxLength={TEN_MAX_LENGTH}
              status={tenMatranError ? 'error' : undefined}
            />
            {tenMatranError && <div className="text-red-500 text-[11px] mt-1">{tenMatranError}</div>}
          </div>
        </div>
        {subjectConfig && (
          <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
            Theo <strong>Cấu hình môn học</strong>: Thời gian thi <strong>{subjectConfig.time ?? '—'} phút</strong> · Tổng số câu yêu cầu <strong>{subjectConfig.questions_number ?? '—'}</strong> · Thang điểm <strong>{subjectConfig.scale ?? '—'}</strong>
          </div>
        )}
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
                  className="text-xs" value={searchValue} onChange={e => setSearchValue(e.target.value)} allowClear />
              </div>
              <div className="p-3 overflow-y-auto" style={{ maxHeight: 500 }}>
                {dataChuDeSelect.length > 0 ? (
                  <Tree checkable blockNode treeData={treeData}
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
                              return (
                                <th key={`${nl.id}-${md.id}-${lch.loai_cau_hoi_id}`}
                                  className="border border-slate-200 px-1 py-1 text-center font-medium text-[9px] bg-slate-100 text-slate-600 whitespace-nowrap"
                                  style={{ minWidth: 45 }}>
                                  {lch.dm_loai_cau_hoi.ma}
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

      {/* Bảng cấu hình tổng hợp — tạm ẩn theo yêu cầu, giữ nguyên code để bật lại sau này */}
      {false && obj.length > 0 && caiDat && (
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
                    <td className="border border-slate-200 px-3 py-2 text-center">
                      {lch.diem_theo_y ? (
                        <Tooltip title="Điểm theo số ý đúng: 1 ý / 2 ý / 3 ý / 4 ý">
                          <span>{lch.diem_theo_y.y1}/{lch.diem_theo_y.y2}/{lch.diem_theo_y.y3}/{lch.diem_theo_y.y4}</span>
                        </Tooltip>
                      ) : lch.diem}
                    </td>
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
