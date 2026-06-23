# Đặc tả luồng Module "Quản lý Ma trận Đề thi" - Chức năng Thêm mới

## 1. Tổng quan
Module cho phép tạo ma trận đề thi bằng cách: Chọn Môn → Load Chủ đề (Tree) → Tick chọn Tiểu mục → Sinh bảng ma trận (hàng = tiểu mục, cột = năng lực × mức độ) → Nhập số câu.

**Tech stack**: React + TypeScript + Ant Design (Form, Table, Tree, Radio, Input). State dùng `useState`.

---

## 2. Các API liên quan

### 2.1 Lấy danh sách Môn học
```
GET /api/cau-hoi/chu-de/selectDM?other=mon_hoc
Response: { data: [{ id, ten }] }
```

### 2.2 Lấy Cài đặt Ma trận theo Môn
```
GET /api/cau-hoi/ma-tran/cai-dat-ma-tran/{mon_hoc_id}
Response: {
  ds_dm_muc_do: [{ id, ma, ten }],              // VD: Biết(1), Hiểu(2), Vận dụng(3)
  ds_dm_thanh_phan_nang_luc: [{ id, ten }],      // VD: Ngôn ngữ, Văn học
  ds_loai_cau_hoi: [{
    loai_cau_hoi_id, so_luong_cau, noi_dung_phan,
    dm_loai_cau_hoi: { id, ma, ten },            // VD: TN, TLN, DS
    diem
  }]
}
```

### 2.3 Lấy Chủ đề theo Môn (cây cha-con)
```
GET /api/cau-hoi/chu-de?mon_thi_id={id}&page=1&page_size=1000000
Response: {
  data: [{
    id, ma, ten, so_tiet, ten_khoi_lop, is_dung_sai,
    children: [{                    // Tiểu mục (node con)
      id, ma, ten, ten_khoi_lop,
      ds_cau_hoi: [{               // Thống kê câu hỏi có sẵn trong ngân hàng
        muc_do_id, loai_cau_hoi_id, nang_luc_id, so_luong
      }],
      children: []
    }]
  }]
}
```

### 2.4 Sinh Ma trận Ngẫu nhiên (Step1 + Step3)
```
POST /api/cau-hoi/de-thi/ma-tran-ngau-nhien/step1
Body: { mon_thi_id, khoi_cau_hoi_cau_neo_id }

POST /api/cau-hoi/de-thi/ma-tran-ngau-nhien/step3
Body: { mon_thi_id, ds_chu_de, khoi_cau_hoi_cau_neo_id, is_use_nhch }
```

### 2.5 Lưu / Cập nhật
```
POST /api/cau-hoi/ma-tran           (tạo mới)
PUT  /api/cau-hoi/ma-tran/{id}      (cập nhật)
```

---

## 3. Interface chính

```typescript
interface MaTranData {
  id?: string;
  noi_dung_kien_thuc: string | null;  // Tên chủ đề cha
  noi_dung_id: string | null;         // ID chủ đề cha
  ma_noi_dung?: string;
  don_vi_kien_thuc: string;           // Tên tiểu mục
  don_vi_id: string;                  // ID tiểu mục
  ma_don_vi?: string;
  so_tiet: number;
  is_dung_sai: boolean;
  ds_loai_cau_hoi: ItemMaTranData[];  // Mảng ô nhập liệu
  ti_le?: string;
}

interface ItemMaTranData {
  id?: string;
  muc_do_id: string | null;
  loai_cau_hoi_id: string | null;
  nang_luc_id?: any;
  so_cau: number | null;        // User nhập
  tong_so_cau?: number | null;  // Từ ngân hàng (để validate)
  diem?: number | null;
}
```

---

## 4. Các State quan trọng

| State | Kiểu | Mô tả |
|-------|------|-------|
| `monHocId` | `string` | ID môn đang chọn |
| `dataChuDe` | `any[]` | Raw data cây chủ đề từ API |
| `dataChuDeSelect` | `TreeDataNode[]` | Data format cho Tree component |
| `dataChuDeFormat` | `any[]` | Data flatten (phẳng) cho search |
| `checkedKeys` | `React.Key[]` | DS ID tiểu mục đã tick |
| `caiDat` | `object` | Cấu hình: mức độ, năng lực, loại câu hỏi |
| `obj` | `MaTranData[]` | Data bảng ma trận (mỗi item = 1 hàng) |
| `dataCauHinh` | `any[]` | Data bảng cấu hình (tổng hợp theo loại câu) |
| `loai` | `number` | 1 = Thủ công, 2 = Ngẫu nhiên |
| `colCauTruc` | `any[]` | Dynamic columns cho Table |

---

## 5. Luồng xử lý chi tiết

### Bước 1: User chọn Môn học → `changeMonHoc(value)`
```typescript
const changeMonHoc = async (value: string) => {
  setIsChangingSubject(true);
  // Reset toàn bộ state cũ khi tạo mới
  if (itemRecord?.is_edit != true) {
    setCheckedKeys([]);
    setObj([]);
    setDataCauHinh([]);
    onChange?.({ ds_cau_truc: [], ds_cau_hinh: [] });
  }
  setMonHocId(value);

  // B1: Lấy cài đặt ma trận (mức độ, năng lực, loại câu hỏi)
  const caiDatNew = await fetchData(value);
  // B2: Lấy danh sách chủ đề
  await FetchChuDe(value, caiDatNew);

  setIsChangingSubject(false);
};
```

### Bước 2: `fetchData(value)` → Lấy cài đặt ma trận
```typescript
const fetchData = async (value: string) => {
  const res = await GetCaiDatMaTran(value);
  // GET /api/cau-hoi/ma-tran/cai-dat-ma-tran/{mon_hoc_id}

  const sortedData = {
    ...res.data,
    ds_dm_muc_do: [...res.data.ds_dm_muc_do].sort((a, b) => Number(a.ma) - Number(b.ma)),
  };
  setCaiDat(sortedData);
  // → Trigger useEffect sinh colCauTruc (dynamic columns)
  return res.data;
};
```

### Bước 3: `FetchChuDe(mon_hoc_id)` → Lấy & format chủ đề
```typescript
const FetchChuDe = async (mon_hoc_id, caiDatNew) => {
  const [res] = await Promise.all([getChuDeSelect(mon_hoc_id)]);
  // GET /api/cau-hoi/chu-de?mon_thi_id={id}&page_size=1000000

  const dataRender = res.data.data; // Mảng cây cha-con

  setDataChuDe(dataRender);                                    // Raw
  setDataChuDeSelect(formatChuDeItems(dataRender));             // Cho Tree
  setDataChuDeFormat(flattenTree(formatChuDeItems(dataRender)));// Cho search

  // Tạo mới → reset obj
  if (itemRecord?.is_edit != true) {
    setObj([]); setDataCauHinh([]);
  }
};
```

### Bước 4: Format data cho Tree
```typescript
const formatChuDeItems = (items: any[]): TreeDataNode[] => {
  return items?.map((item) => ({
    title: item.ten,
    key: item.id,
    id: item.id,
    children: item.children ? formatChuDeItems(item.children) : undefined,
  }));
};

// Flatten cho search
const flattenTree = (nodes: TreeDataNode[]): TreeDataNode[] => {
  let result: TreeDataNode[] = [];
  nodes.forEach(node => {
    result.push({ ...node, children: undefined });
    if (node.children) result = result.concat(flattenTree(node.children));
  });
  return result;
};
```

### Bước 5: Render Tree (UI)
```tsx
<Tree
  checkable
  checkStrictly        // Chọn cha KHÔNG tự chọn con
  blockNode
  treeData={treeData}  // Có search highlight
  onCheck={onCheck}
  checkedKeys={checkedKeys}
  disabled={loai != 1} // Chỉ bật khi loại = Thủ công
/>
```

Search hoạt động bằng `useMemo` filter `dataChuDeSelect` theo `searchValue`.

### Bước 6: User tick chọn → `onCheck`
```typescript
const onCheck: TreeProps["onCheck"] = (checkedKeysValue, info) => {
  const checkedIds = info.checkedNodes.map((node) => node.key);
  setCheckedKeys(checkedIds);
  TaoDataTable(
    caiDat.ds_dm_thanh_phan_nang_luc,
    caiDat.ds_dm_muc_do,
    caiDat.ds_loai_cau_hoi,
    checkedIds,
    false // is_tao_moi = false → merge với data cũ
  );
};
```

### Bước 7: `TaoDataTable` → Chuyển checkedIds thành hàng bảng
```typescript
const TaoDataTable = (ds_nang_luc, ds_muc_do, ds_loai_ch, checkedIds, is_tao_moi) => {
  // B1: Tìm node con đã chọn + parent info
  const dschuDe = layTatCaId(checkedIds, dataChuDe);

  // B2: Tạo MaTranData[] (1 item = 1 hàng trong bảng)
  const dsMaTran = taoDanhSachMaTran(dschuDe, diemDefault, ds_nang_luc, ds_muc_do, ds_loai_ch);

  // B3: Merge với data cũ hoặc tạo mới
  setObj(prevObj => {
    const updatedCauTruc = is_tao_moi ? [] : prevObj.filter(/*giữ item còn trong checkedIds*/);
    dsMaTran.forEach(item => {
      if (!updatedCauTruc.some(e => e.don_vi_id === item.don_vi_id))
        updatedCauTruc.push(item);
    });
    updatedCauTruc.sort(/*theo tên chủ đề rồi tên tiểu mục*/);
    return updatedCauTruc;
  });
};
```

**`layTatCaId`**: Duyệt đệ quy cây `dataChuDe`, tìm các node có `id` nằm trong `checkedIds`, trả về node kèm parent.

**`taoDanhSachMaTran`**: Mỗi tiểu mục tạo 1 `MaTranData`, trong đó `ds_loai_cau_hoi` = tích Descartes (năng_lực × mức_độ × loại_câu_hỏi), mỗi phần tử chứa `so_cau = 0` và `tong_so_cau` (từ `ds_cau_hoi` của API).

### Bước 8: Sinh dynamic columns
```typescript
useEffect(() => {
  // Tạo columns: Năng lực > Mức độ > Ô nhập
  const ds_col = generateColumnGroupsNgauNhien(
    caiDat.ds_dm_thanh_phan_nang_luc,  // Cấp 1: header
    caiDat.ds_dm_muc_do,                // Cấp 2: sub-header
    caiDat.ds_loai_cau_hoi              // Render cell input
  );
  setColCauTruc(ds_col);
}, [diemDefault, loai]);
```

### Bước 9: Render Table
```tsx
<Table
  columns={[
    { title: "STT", fixed: "left", width: "80px" },
    { title: "Chủ đề", fixed: "left", width: "180px",
      onCell: (record, index) => ({ rowSpan: /*merge hàng cùng chủ đề*/ }) },
    { title: "Tiểu mục chủ đề", fixed: "left", width: "220px" },
    ...colCauTruc  // Dynamic columns (Năng lực > Mức độ)
  ]}
  dataSource={obj}     // MaTranData[]
  pagination={false}
  bordered
  summary={() => renderTableSummary(caiDat)}  // Tổng câu, tỉ lệ
/>
```

Mỗi cell chứa Input để nhập `so_cau`, hiển thị `/tong_so_cau` bên cạnh (đỏ nếu vượt).

### Bước 10: User nhập số câu → `handleInputValueChange`
Cập nhật `so_cau` trong `obj[index].ds_loai_cau_hoi`, tính lại `ti_le`, `dataCauHinh`, gọi `onChange` để sync lên form cha.

---

## 6. Layout UI tổng thể

```
┌──────────────────────────────────────────────────────────────┐
│ Thông tin chung                                              │
│ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│ │ Môn học  │ │ Mã MT    │ │ Tên MT   │ │ Loại: ○Thu công  │  │
│ │(Select)  │ │(Input)   │ │(Input)   │ │       ○Ngẫu nhiên│  │
│ └─────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
├──────────┬───────────────────────────────────────────────────┤
│ Cây chủ  │  Bảng Ma trận                                    │
│ đề (15%) │  ┌────┬────────┬──────────┬──────────────────┐   │
│          │  │STT │Chủ đề  │Tiểu mục  │NăngLực1│NăngLực2│   │
│ [Search] │  │    │        │          │ B│H│VD │ B│H│VD │   │
│ ☑ CĐ1   │  ├────┼────────┼──────────┼──┼──┼───┼──┼──┼──┤   │
│  ☑ TM1.1 │  │ 1  │CĐ1    │TM1.1     │  │  │   │  │  │  │   │
│  ☑ TM1.2 │  │ 2  │(merge) │TM1.2     │  │  │   │  │  │  │   │
│ ☑ CĐ2   │  │ 3  │CĐ2    │TM2.1     │  │  │   │  │  │  │   │
│  ☐ TM2.1 │  ├────┴────────┴──────────┼──┴──┴───┴──┴──┴──┤   │
│          │  │ Tổng lệnh hỏi          │  x │ y │ z │...  │   │
│          │  │ Tỉ lệ cấp độ tư duy(%) │  ...              │   │
│          │  └────────────────────────┴───────────────────┘   │
├──────────┴───────────────────────────────────────────────────┤
│ Bảng Cấu hình (TableCauHinhMaTran)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Luồng Edit (Chỉnh sửa)

Khác biệt so với Tạo mới:
1. Môn học Select bị **disabled**
2. Chủ đề load tự động 1 lần qua `useEffect` + flag `hasLoadedChuDe`
3. Data `ds_cau_truc` có sẵn từ `itemRecord` → merge với chủ đề mới load qua `formaDuLieuCauTruc`
4. `checkedKeys` được set từ `itemRecord.du_lieu_ma_tran.ds_cau_truc.map(item => item.don_vi_id)`

---

## 8. Tóm tắt flow dưới dạng chuỗi gọi hàm

```
User chọn Môn
  → changeMonHoc(value)
    → fetchData(value)           // GET cài đặt → setCaiDat
    → FetchChuDe(value)          // GET chủ đề  → setDataChuDe, setDataChuDeSelect
      → formatChuDeItems()       // Raw → TreeDataNode[]
      → flattenTree()            // Flatten cho search

User tick chủ đề trên Tree
  → onCheck(checkedKeys)
    → TaoDataTable(caiDat, checkedIds)
      → layTatCaId()             // Tìm node con + parent
      → taoDanhSachMaTran()      // Tạo MaTranData[] (tích Descartes)
      → setObj()                 // → Table render
      → TaoDuLieuBang()          // → dataCauHinh
      → onChange()               // Sync lên form cha

User nhập số câu vào ô Input
  → handleInputValueChange()
    → Update obj[i].ds_loai_cau_hoi[j].so_cau
    → Tính lại ti_le, dataCauHinh
    → onChange()                 // Sync lên form cha
```
