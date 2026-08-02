# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This guidance applies to `src/components/xay-dung-de-thi/quan-ly-ma-tran-de/` — the **"Quản lý Ma trận Đề thi"** (Exam Matrix Management) feature: building the blueprint that defines how many questions of each cognitive level / question type / competency an exam must contain per topic, before an exam is actually assembled from the question bank.

## Files

- `MatrixConfigModule.tsx` — list screen (tabs: "Ma trận đề" / "Thẩm định ma trận đề"). Owns pagination/search/status-change against `GET/PUT/DELETE /matrix-configs`. Switches to `CreateMatrixForm` via local `viewMode` state, not routing.
- `CreateMatrixForm.tsx` — the actual create/edit form (no modal/AntD Form, no `onChange` prop — a standalone page taking `onBack`/`editingId`). All the real logic lives here: subject/topic tree loading, pulling column structure from "Cấu hình môn học" (`subjectConfigApi`), counting available bank questions per cell, and saving `ds_cau_truc`.
- `mockData.ts` — despite the name, this now holds **real** interfaces (`MaTranData`, `ItemMaTranData`, `ChuDeNode`, `CaiDatMaTran`) and **real** network calls (`apiSaveMaTran`, `apiUpdateMaTran`, `apiGetMatrixConfigDetail` all hit `/matrix-configs` on the real backend). It also still contains unused mock leftovers (`MOCK_MON_HOC`, `MOCK_CHU_DE_MAP`, `apiGetMonHoc`, `apiGetChuDe`) that nothing imports anymore (safe to delete if cleaning up — confirmed via grep, no other consumers in `src/`).

**Tech stack**: React + TypeScript + Ant Design (Select, Tree, InputNumber). Matrix table and the (currently hidden) summary-config table are drawn with plain HTML `<table>`, not `antd/Table`. State via `useState`/`useMemo`, no Redux/Context.

> The "Ngẫu nhiên" (random-generate) mode (`loai`, `Radio.Group`, `handleAutoGenerateMatrix`) has been **fully removed** from UI and code — only the manual flow (tick topics on the Tree) remains. If re-adding a fast-generate mode later, design it to actually pull weighted-random questions from the bank rather than hard-coding like the old version.

## Architecture / cross-feature coupling

- The matrix's column structure (`ds_loai_cau_hoi`: which question types exist, how many questions each needs, scoring) is **not** matrix-specific config — it's derived from **"Cấu hình môn học"** (`subject_configs` table, edited at `src/components/quan-ly-danh-muc/danh-muc-mon-hoc/config.tsx`), fixed to exactly 3 parts (Phần I/II/III). Each part independently scores "per answer" or "per correct idea" depending on whether its selected question type's `code` is `'DS'` (Đúng/Sai) — not hardcoded to Phần II anymore; any part can be DS. A subject with no Cấu hình môn học yields a matrix with zero columns (`message.warning` shown, `ds_loai_cau_hoi = []`).
- `CreateMatrixForm.tsx` exports nothing, but its sibling `mockData.ts` is imported cross-feature by `../quan-ly-de-thi/ModalTaoDeTuDong.tsx` (`apiGetMatrixConfigDetail`, `MaTranData` type) for the "Thêm mới tự động" exam-generation wizard, which reads a saved matrix's `ds_cau_truc` and auto-picks matching questions from the bank. Changing the `ds_cau_truc` row/cell shape here breaks that wizard too.
- `MatrixConfig` (backend model) only stores `subject` as the subject's **`code`** (e.g. `"toan"`), not its display name, and has no grade field at all — grade filtering only happens indirectly through topics (`topics.grade_id`), never on the matrix record itself.
- Question-bank availability counts (`tong_so_cau`) come from `GET /bank-questions/count-by-topic`, which treats any bank question with `competency_component_id = NULL` as matching **every** competency column (most questions today have no competency tag, since the question-creation form doesn't expose that field yet) — don't "fix" this to a strict match without re-checking whether that field has since been added to question creation.

## Real APIs used

No `/api/cau-hoi/...`-style endpoints exist. Actual calls (via `src/services/danhMucApi.ts`):

| Fn | Endpoint | Purpose |
|---|---|---|
| `subjectCategoryApi.list()` | `GET /subject-categories/` | "Môn học" combobox (`is_active` only) |
| `topicsApi.list()` | `GET /topics/` | Flat topic list for ALL subjects, filtered client-side by `subject_id`, tree built via `buildTopicTree()` |
| `competencyComponentApi.list()` | `GET /competency-components/` | Competencies, filtered client-side by `subject_id` + `is_active` |
| `cognitiveLevelApi.list()` | `GET /cognitive-levels/` | Cognitive levels (Nhận biết/Thông hiểu/Vận dụng...) — **not sorted by `ma`**, order follows API response |
| `questionTypeApi.list()` | `GET /question-types/` | Question type names by `type_id_p1/p2/p3` |
| `subjectConfigApi.getBySubjectId(id)` | `GET /subject-configs/by-subject/{subject_id}` | 3-part config (Phần I/II/III) + time/total-questions/scale |
| `bankQuestionApi.countByTopic(topicIds)` | `GET /bank-questions/count-by-topic?topic_ids=...&status=2` | Available question counts per cell (only approved, `status=2`) |
| `apiSaveMaTran` / `apiUpdateMaTran` / `apiGetMatrixConfigDetail` | `POST/PUT/GET /matrix-configs[/{id}]` | Save/update/load a matrix |

All category APIs above are **not filtered server-side by subject** (except by-id endpoints) — client filters by `subject_id`/`grade_id`. There is no `GET /chu-de?mon_hoc_id=...` — topic tree is built client-side by `buildTopicTree()` (`CreateMatrixForm.tsx:70-95`) from the flat list using `parent_id`, 2 levels only (no recursion beyond parent/child). Every node is hard-coded `so_tiet: 10, is_dung_sai: false` (not real DB values).

### Cấu hình môn học → `ds_loai_cau_hoi`

Both `changeMonHoc` and `loadDetail` (Edit) share one function, `fetchSubjectMatrixConfig(selectedSubj)` (`CreateMatrixForm.tsx:102-193`), which calls `GET /subject-configs/by-subject/{subject_id}` and builds `ds_loai_cau_hoi` via `buildPart()` (up to 3 parts, skipping any part missing `type_id_pN`):
- `so_luong_cau = pN_to - pN_from + 1` (0 if `from`/`to` missing).
- `diem`: each part checks its own selected question type's `code` (via `typeMap`) — if the code is `'DS'` (case-insensitive), the part is scored per-idea (`points_for_1_correct_idea_pN` … `points_for_4_correct_idea_pN`, backend columns per part since the schema restructure), and `diem` uses the **max value** (`points_for_4_correct_idea_pN`) as the representative score. Otherwise the part is scored per-answer, `diem` = `points_for_a_correct_answers_pN`. Every part (`_p1`, `_p2`, `_p3`) has both column sets available in `subject_configs` — which one holds real data depends purely on which question type was picked in Cấu hình môn học.
- `diem_theo_y` (only present on parts using per-idea scoring): keeps all 4 levels `{y1,y2,y3,y4}` for that part, shown in the "Bảng cấu hình tổng hợp" which is currently **hidden** (`{false && ...}` at `CreateMatrixForm.tsx:776`).
- Score fields come back as `Decimal` → string from backend (e.g. `"0.25000..."`) — use `toNum(v)` helper to coerce.
- If subject has no Cấu hình môn học (404), shows `message.warning`, `ds_loai_cau_hoi = []`.

`subjectConfig` state (raw object) is shown read-only under "Môn học/Mã/Tên" (`CreateMatrixForm.tsx:533-537`): time/total-questions/scale — informational only, **not enforced** (see risks).

### Question counting (`tong_so_cau`)

`fetchQuestionCounts(topicIds)` (`CreateMatrixForm.tsx:24-68`) builds two maps: `exact` (4-key: topic+level+type+competency, for tagged questions) and `noCompetency` (3-key, for `competency_component_id = null`). `sumQuestionCount(...)` = exact match + noCompetency pass-through added to **every** competency column sharing topic/level/type — so one untagged question can count toward multiple competency totals simultaneously (workaround, not exclusive allocation; see risk #6 below).

`onCheck` awaits `fetchQuestionCounts` before rebuilding `MaTranData[]`, using `checkRequestSeqRef` to drop stale responses from rapid re-ticking. On Edit, after `setObj(ds_cau_truc)` from saved data, counts are re-fetched and patched in fresh (not the frozen values from save time).

### Save/update/detail (backend: `backend/exam_service/routes/matrix_configs.py`)

```
GET    /matrix-configs                 (list, paginated/search/filter subject+status)
GET    /matrix-configs/{id}            (detail, used for Edit)
POST   /matrix-configs/                (create)
PUT    /matrix-configs/{id}            (update)
PUT    /matrix-configs/status          (change approval status — "Thẩm định" tab)
DELETE /matrix-configs/{id}            (delete one)
DELETE /matrix-configs                 (delete many, body { ids })
```

Payload: `{ mon_hoc_id, ma, ten, ds_cau_truc }` where `ds_cau_truc = obj` (client `MaTranData[]` state as-is; server just `json.dumps`s it into `structure` column and derives `totalScore`/`totalQuestions` from it).

⚠️ `mon_hoc_id` sent is the subject's **`code`**, not its display name or real id. Backend has a `SUBJECT_MAP` hard-coded to only 3 old values (`mh-toan`/`mh-ly`/`mh-anh` → Vietnamese names) used to resolve/display subject name. For real DB codes outside those 3, `SUBJECT_MAP.get(x, x)` passes through `x`, so matching-by-code still works, but the *displayed* subject name on detail load (`inv_map`) can be wrong/default to `"mh-toan"`.

## Key interfaces (`mockData.ts`)

```typescript
export interface ItemMaTranData {
  id?: string;
  muc_do_id: string | null;
  loai_cau_hoi_id: string | null;
  nang_luc_id?: any;
  so_cau: number | null;        // entered via InputNumber
  tong_so_cau?: number | null;  // from count-by-topic, with null-competency fallback
  diem?: number | null;
}

export interface MaTranData {
  id?: string;
  noi_dung_kien_thuc: string | null;  // parent topic name
  noi_dung_id: string | null;         // parent topic id
  ma_noi_dung?: string;
  don_vi_kien_thuc: string;           // sub-topic name
  don_vi_id: string;                  // sub-topic id (= real topic id)
  ma_don_vi?: string;
  so_tiet: number;                    // always 10 (hard-coded in buildTopicTree)
  is_dung_sai: boolean;               // always false (hard-coded in buildTopicTree)
  ds_loai_cau_hoi: ItemMaTranData[];  // Cartesian product: question type × competency × level
  ti_le?: string;                     // actually stores the ROW'S TOTAL SCORE (toFixed(2)), not a percent
}

export interface ChuDeNode {
  id: string; ma: string; ten: string;
  so_tiet?: number; ten_khoi_lop?: string; is_dung_sai?: boolean;
  ds_cau_hoi?: { muc_do_id: string; loai_cau_hoi_id: string; nang_luc_id: string; so_luong: number }[];
  children: ChuDeNode[];
}

export interface CaiDatMaTran {
  ds_dm_muc_do: { id: string; ma: string; ten: string }[];
  ds_dm_thanh_phan_nang_luc: { id: string; ten: string }[];
  ds_loai_cau_hoi: {
    loai_cau_hoi_id: string; so_luong_cau: number; noi_dung_phan: string;
    dm_loai_cau_hoi: { id: string; ma: string; ten: string }; diem: number;
    diem_theo_y?: { y1: number; y2: number; y3: number; y4: number };  // Phần II only
  }[];
}
```

## Key state (`CreateMatrixForm`)

| State | Type | Notes |
|-------|------|-------|
| `monHocId` | `string \| null` | Actually the subject's **`code`**, not a real DB id |
| `fullSubjects` | `any[]` | Raw `subjectCategoryApi.list()`, used to look up real id by `code` |
| `caiDat` | `CaiDatMaTran \| null` | From `fetchSubjectMatrixConfig()` |
| `subjectConfig` | `SubjectConfigAPI \| null` | Read-only "Cấu hình môn học" display; `null` if subject unconfigured |
| `dataChuDe` / `dataChuDeSelect` | `ChuDeNode[]` / `TreeDataNode[]` | Topic tree, raw and AntD-Tree-formatted |
| `checkedKeys` | AntD Tree checked state | |
| `obj` | `MaTranData[]` | Matrix table data — **also the save payload** (`ds_cau_truc: obj`) |
| `editingId` | prop | Present → Edit mode |

No `dataCauHinh`/`colCauTruc` state exists — the summary table and dynamic columns are computed inline in JSX via `useMemo`/nested `.map()`.

## Flow summary

1. Mount → `subjectCategoryApi.list()` fills subject dropdown; `loadDetail()` runs only if `editingId` set (Edit mode).
2. Pick subject → `changeMonHoc(code)` → `fetchSubjectMatrixConfig()` loads topics/competencies/levels/Cấu hình môn học in one shared call → sets `caiDat`, `dataChuDe`, `subjectConfig`.
3. Tick topics on `<Tree>` (`checkable`, no `checkStrictly`) → `onCheck` → `layTatCaId()` resolves ticked ids to `{child, parent}` pairs (2-level tree only) → `fetchQuestionCounts()` → `taoDanhSachMaTran()` builds Cartesian-product rows/cells → merged into `obj`, preserving still-ticked existing rows.
4. Matrix table (plain `<table>`, 3-tier header: Năng lực → Mức độ → Loại câu hỏi) renders `obj`; cells looked up via `getCellIndex(loaiCHId, nlId, mdId)` (matched by key, not position). `tfoot` shows totals; empty-table ratio row falls back to hard-coded 40/30/20/10% keyed to `md-1..md-4` (only correct for old mock IDs).
5. Entering a count → `handleInputChange` updates `obj[row].ds_loai_cau_hoi[cell].so_cau` and recomputes `row.ti_le` (= row's total score, not a %). No API call, no `onChange` to parent (standalone page).
6. Summary config table is present in code but **hidden** (`{false && ...}`, `CreateMatrixForm.tsx:776`) — remove the `false &&` to re-enable.
7. Save → `handleSave()` validates `monHocId`/`tenMatran`/`obj.length`, then `apiSaveMaTran`/`apiUpdateMaTran` → `onBack()`.

### Edit mode differences

- Subject `<Select>` is `disabled` when `editingId` set.
- `loadDetail` (same mount `useEffect`) calls `GET /matrix-configs/{id}`, then reuses `fetchSubjectMatrixConfig` for the saved subject.
- `setObj(ds_cau_truc)` is assigned **directly** from saved data — not rebuilt via `taoDanhSachMaTran` — so if category structure (competencies/levels/Cấu hình môn học) changed since creation, displayed columns can be misaligned (`getCellIndex` misses → blank `0` input). `tong_so_cau` alone is refreshed live via `fetchQuestionCounts`.

## Known risks / maintenance gotchas

1. Backend `SUBJECT_MAP` (`matrix_configs.py`) only has 3 hard-coded subjects — display-name mismatch for any other subject (code-matching itself still works).
2. Edit does not rebuild `ds_loai_cau_hoi` against current `caiDat` — columns can drift from an updated Cấu hình môn học/category structure.
3. No validation blocks entering more than `tong_so_cau`, and total questions/time vs. `questions_number`/`time` from Cấu hình môn học is never enforced — UI only shows info + red highlight (`isOver`), doesn't block Save.
4. `count-by-topic` only counts `status = 2` (approved) and infers subject/grade purely from each topic's own `subject_id`/`grade_id` — inconsistent `questions.topic_id` data would produce wrong counts.
5. Random-generate mode was fully removed; if reintroduced, do it properly (weighted random from bank), not hard-coded like before.
6. Manual question creation has no "Thành phần năng lực" field (`QuestionManualCreate` schema / `create_question` in `backend/exam_service/routes/questions.py` hard-code `competency_component_id=None`), so most bank questions are untagged. `sumQuestionCount`'s pass-through-to-every-competency-column behavior is a deliberate workaround, not accurate 1:1 stats — fixing properly requires adding a competency field to the question-creation form/schema/backend.
7. Any part using per-idea (DS) scoring only uses one number (`points_for_4_correct_idea_pN`, the max) for all total-score math — doesn't yet model partial credit by correct-idea count (0.1/0.25/0.5/1.0). The 4-level breakdown (`diem_theo_y`) is retained in data but its display (summary table) is hidden.
8. Subjects without a Cấu hình môn học yield zero-column matrices — must create one at "Quản lý danh mục > Môn học > Cấu hình" first.
9. `mockData.ts` has dead code (`MOCK_MON_HOC`, `MOCK_CHU_DE_MAP` and its `MOCK_CHU_DE_*` children, `apiGetMonHoc`, `apiGetChuDe`) — no longer imported anywhere, safe to delete.

## Commands

Run from the repo root (no separate build for this subfolder):
- `npm run lint` — `tsc --noEmit`, the only fast correctness check available; run this after any edit here.
- `npm run dev` — starts Vite + all Python microservices together (`start_services.py`); needed to actually exercise this feature in the browser, since it depends on the Exam Service (`/matrix-configs`, `/bank-questions`, `/subject-configs`, `/topics`, etc.) being up.
