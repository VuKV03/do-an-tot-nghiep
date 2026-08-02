# Ngân hàng câu hỏi (Question Bank) — Tài liệu nghiệp vụ & kỹ thuật

> Cập nhật lần cuối: 2026-07-24, sửa bug "Xóa" chỉ xóa state cục bộ chứ không gọi API (xem mục 5). Trước đó: 2026-07-13, sau loạt sửa lớn: rich-text editor thật (đậm/nghiêng/cỡ chữ/ảnh), AI sinh câu hỏi nối backend thật, sửa layout sidebar, sửa bug modal Cập nhật không mở được từ tab Thẩm định. Tài liệu này được viết lại từ việc đọc trực tiếp code hiện tại — không dựa vào suy đoán.

Thư mục này chứa 2 tab con của `QuestionBankModule`:
- **`tab-ngan-hang-cau-hoi/`** — soạn thảo/CRUD câu hỏi (tab "Ngân hàng câu hỏi").
- **`tham-dinh-cau-hoi/`** — thẩm định/phản biện câu hỏi do người khác gửi lên (tab "Thẩm định/phản biện câu hỏi").

Root component: `tab-ngan-hang-cau-hoi/index.tsx` (`QuestionBankModule`), mount tại `src/App.tsx` với menu key `ngan-hang-cau-hoi`. Hai tab dùng chung state (`dbQuestions`, danh mục môn/lớp/chủ đề) từ `QuestionBankModule` — `ThamDinhCauHoiTab` không tự fetch riêng.

Thuật ngữ:
- **NHCH** = Ngân hàng câu hỏi.
- **Thẩm định** = duyệt bởi hội đồng chuyên môn; **Phản biện** = phản biện ngang hàng — trong UI dùng lẫn lộn như đồng nghĩa ("Gửi thẩm định/phản biện").

## 0. Bản đồ file

```
tab-ngan-hang-cau-hoi/
  index.tsx          Component gốc QuestionBankModule — 2 tab, filter, bảng, tất cả modal
  manual-create.tsx  Modal "Thêm mới câu hỏi thủ công"
  update.tsx         Modal "Cập nhật câu hỏi" — DÙNG CHUNG cho cả 2 tab (xem mục 6)
  ai-generate.tsx    Modal "Sinh câu hỏi tự động bằng AI" — đã nối AI thật
  detail.tsx         Modal "Xem chi tiết câu hỏi" (read-only)
  delete.tsx         Modal xác nhận xóa (UI thuần, logic xóa nằm ở index.tsx)
  send-review.tsx    Modal xác nhận gửi thẩm định (UI thuần)
tham-dinh-cau-hoi/
  index.tsx          ThamDinhCauHoiTab — bảng câu hỏi pending/approved/rejected + duyệt/từ chối
  review.tsx         QuestionReviewModule — DEAD CODE, không ai import (xem mục 8.3)
history.tsx          QuestionHistoryModal — dùng chung 2 tab, TOÀN BỘ LÀ MOCK (xem mục 8.2)

Các file dùng chung ngoài thư mục này (không thể hiểu module này nếu bỏ qua):
src/components/RichTextEditor.tsx    Editor rich-text cho "Nội dung câu hỏi" (đậm/nghiêng/cỡ chữ/ảnh)
src/utils/htmlContent.tsx            sanitizeHtml / isLikelyHtml / stripHtmlToText / RichTextView
src/utils/imageCompress.ts           Resize + nén ảnh phía client trước khi nhúng base64
src/utils/htmlToDocx.ts              Chuyển nội dung HTML/text sang Paragraph[] cho export Word
src/utils/examWordExport.ts          Build file .docx thật cho đề thi (dùng htmlToDocx)
backend/ai_service/routes/generate.py   Endpoint AI sinh câu hỏi thật (Gemini)
```

## 1. Data model

### Frontend (`src/types.ts`)
```ts
QuestionType = 'single' | 'multiple' | 'true_false' | 'short'
CognitiveLevel = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao'
QuestionStatus = 'approved' | 'pending' | 'draft' | 'rejected'
```
- **Loại câu hỏi**: `single` = trắc nghiệm đơn (TN), `multiple` = câu hỏi nhóm/nhiều lựa chọn (TLN), `true_false` = Đúng/Sai (DS), `short` = tự luận/trả lời ngắn (TL).
- **Cấp độ tư duy (Bloom)**: nhận biết → thông hiểu → vận dụng → vận dụng cao.
- **Thành phần năng lực**: tag tùy chọn theo môn học (`competencyComponentApi`, bảng `competency_components`). Dropdown chỉ hiện bản ghi `is_active === true` (đã lọc ở `manual-create.tsx`, `update.tsx`, `ai-generate.tsx`).
- **Loại hình câu hỏi** (danh mục `question_types`, quản lý tại `quan-ly-danh-muc/loai-hinh-cau-hoi/`): dropdown trong modal AI (`ai-generate.tsx`) lấy **dữ liệu thật** từ `questionTypeApi.list()`, không còn hard-code. `resolveInternalQuestionType(item)` map `code`/`name` thật (vd `code: "SINGLE"`, `name: "Trắc nghiệm một đáp án"`) về enum nội bộ `single/multiple/true_false/short`.
- **Chủ đề/Tiểu mục**: cây chủ đề phân cấp (`topicsApi`, bảng `topics`, tự tham chiếu `parent_id`). **Chỉ hiển thị chủ đề có `status === 2` (đã duyệt)** để gắn cho câu hỏi mới.
- **Môn học/Khối lớp**: `subjectCategoryApi` / `gradeLevelApi`.
- **`Question.text` (nội dung câu hỏi)**: từ khi có rich-text editor, giá trị này có thể là **text thuần** (dữ liệu cũ, hoặc do AI sinh — Gemini luôn trả text thuần) **hoặc HTML** (soạn từ `RichTextEditor`, có thể chứa `<b>/<i>/<u>/<s>/<font>/<span style>/<h1>/<h2>/<img>/<a>`). Toàn hệ thống phải xử lý **cả 2 dạng** — xem mục 2.

### Backend (`backend/exam_service/models.py`, bảng `questions`)
Không dùng Prisma — backend là FastAPI + SQLAlchemy async (MySQL). Cột quan trọng: `topic_id, subject_id, grade_id, level_id, type_id, competency_component_id, status (Integer), approved_note, statements (JSON text), content (Text)`.
Có thêm bảng `question_histories` (audit log thật: `question_id, actor, action, timestamp, note` — được ghi khi approve/reject/bulk-review, nhưng **không endpoint nào đọc lại** — xem mục 8.2).

**Lệch kiểu dữ liệu status (quan trọng):** DB lưu `status` dạng **int** (`0=draft, 1=pending, 2=approved, -1=rejected`), FE dùng **string enum**. Endpoint list `/bank-questions/` dịch int→string khi đọc; create/update dịch string→int khi ghi.
⚠️ `BankQuestionCreate.status`/`update`/`_status_to_int` (cả `bank_questions.py` và `questions.py`) chỉ map `{"approved":2, "pending":1, "draft":0}` — **không có case `"rejected"`**, nên gửi status "rejected" trực tiếp qua create/update sẽ bị map nhầm về `0` (draft). Chỉ endpoint `/reject` và `/bulk-review` (verdict `reject`) mới set đúng `-1`.

⚠️ **Cột `content` (TEXT, tối đa ~64KB)** giờ có thể chứa HTML + ảnh base64 nhúng trực tiếp. Vì lý do này, `RichTextEditor` **tự resize+nén ảnh phía client** (xem mục 2.3) để không vượt giới hạn cột — không có migration nào đổi cột này sang `LONGTEXT`, và không có endpoint upload ảnh riêng.

## 2. Kiến trúc nội dung rich-text (soạn/lưu/hiển thị "Nội dung câu hỏi")

Đây là phần quan trọng nhất cần hiểu trước khi sửa bất kỳ chỗ nào đụng tới `question.text`.

### 2.1. Soạn nội dung — `src/components/RichTextEditor.tsx`

- Là 1 `contentEditable div` + toolbar thật (không còn là toolbar giả trang trí): H1/H2/Normal, chọn font, chọn cỡ chữ (dùng `document.execCommand('fontSize', ...)` → sinh `<font size>`, được cho phép trong sanitizer), B/I/U/S (`execCommand('bold'/'italic'/'underline'/'strikeThrough')`), chèn link, chèn ảnh, xóa định dạng.
- **Ảnh KHÔNG chèn xen vào giữa dòng chữ.** Chúng được tách thành một dải "đính kèm" riêng, hiển thị **phía trên** vùng nhập text — giống đính kèm ảnh trong chat: thumbnail vuông có nút **×** ở góc trên-phải để xóa riêng ảnh đó, click vào ảnh để zoom xem bản gốc đầy đủ độ phân giải (dùng AntD `Image`/`Image.PreviewGroup`, có thể lướt qua nhiều ảnh).
- Cơ chế: state `attachments: Attachment[]` (mỗi item `{id, src, width, height}`) tách biệt khỏi state của contentEditable (chỉ chứa text/định dạng, KHÔNG có `<img>`).
  - `splitHtmlIntoAttachmentsAndText(html)` — khi load giá trị từ ngoài vào (mở sửa câu hỏi cũ), parse HTML, gom hết `<img>` (bất kể đang nằm ở đâu trong HTML cũ) vào `attachments`, xóa khỏi DOM, phần còn lại (`doc.body.innerHTML`) là text thuần đưa vào contentEditable. **Dữ liệu cũ có ảnh chèn giữa dòng (từ bản trước khi có tính năng đính kèm) khi mở sửa lại sẽ tự động bị "kéo" ảnh lên khu đính kèm** — không mất dữ liệu, chỉ đổi cách trình bày.
  - `buildImgTag(a)` → `<img src="..." width="..." height="..." />`.
  - `emitChange(attachmentsOverride?)`: ghép `combined = attachments.map(buildImgTag).join('') + textHtml_hiện_tại_trong_DOM`, rồi `onChange(sanitizeHtml(combined))`. **⇒ Chuỗi lưu xuống DB luôn có dạng: tất cả `<img>` đứng trước, phần text/định dạng đứng sau.** Đây là quy ước ngầm mà mọi nơi đọc lại `question.text` phải tương thích (và may là chúng tương thích tự nhiên — xem mục 2.4).
  - Component nhận `value`/`onChange` **optional** (không bắt buộc) vì AntD `Form.Item` tự inject 2 prop này qua `cloneElement` lúc runtime — dùng trực tiếp `<RichTextEditor placeholder=... />` bên trong `Form.Item name="text"` mà không cần bọc thêm gì.
  - Paste luôn bị ép về text thuần (`e.preventDefault()` + `execCommand('insertText', clipboardData.getData('text/plain'))`) để tránh mang theo style/script lạ từ nguồn dán ngoài.

### 2.2. Sanitize — `src/utils/htmlContent.tsx`

- `ALLOWED_TAGS = ['b','strong','i','em','u','s','strike','span','font','p','div','br','h1','h2','img','a']`, `ALLOWED_ATTR = ['style','src','alt','width','height','href','target','rel','face','size','color']` — dùng cho `DOMPurify.sanitize()`.
- `sanitizeHtml(html)` — gọi ở **cả 2 đầu**: trước khi lưu (trong `emitChange` của editor) và trước khi render (`RichTextView`) — chống XSS 2 lớp.
- `isLikelyHtml(value)` — regex `/<[a-z][\s\S]*>/i` — dùng để phân biệt dữ liệu HTML (editor mới) và text thuần (AI sinh, dữ liệu cũ) ở **mọi nơi** đọc `question.text`.
- `stripHtmlToText(value)` — bóc hết tag, chỉ giữ text thuần (qua `DOMParser` + `.textContent`), giữ nguyên nếu vốn đã là text thuần. Dùng cho: cột bảng danh sách, tìm kiếm theo từ khóa, các đoạn preview cắt ngắn.
- `RichTextView({html, className})` — hiển thị **có định dạng thật**: nếu là HTML thì `sanitizeHtml` rồi parse bằng `html-react-parser`, thay riêng từng `<img>` thành AntD `Image` thumbnail 140px trong `Image.PreviewGroup` (zoom + lướt nhiều ảnh); nếu là text thuần thì render nguyên văn với `white-space: pre-wrap`. Dùng cho: modal Xem chi tiết, panel thẩm định chi tiết, xem trước đề thi, ReviewModal — **mọi nơi cần xem đầy đủ nội dung**.

**Quy tắc áp dụng xuyên suốt hệ thống**: cột bảng/tìm kiếm → `stripHtmlToText` (text thuần, không đậm, font đồng bộ); modal/panel xem chi tiết → `RichTextView` (giữ định dạng + ảnh thật). Không nơi nào còn render `question.text` thô trực tiếp (`{question.text}`) — làm vậy sẽ lộ tag HTML ra màn hình.

Danh sách nơi dùng `RichTextView`: `ReviewModal.tsx`, `ExamPackageModule.tsx`, `ModalDeRiengLe.tsx`, `ModalChiTietCauHoi.tsx`, `ExamContentDisplay.tsx`, `tham-dinh-cau-hoi/index.tsx` (panel thẩm định chi tiết), `tab-ngan-hang-cau-hoi/detail.tsx`, `ai-generate.tsx` (preview AI khi không ở chế độ sửa).
Danh sách nơi dùng `stripHtmlToText`: `ModalChonCauHoi.tsx` (tìm kiếm + cột nội dung cắt ngắn), `tham-dinh-cau-hoi/index.tsx` (tìm kiếm + cột "Nội dung câu hỏi"), `tab-ngan-hang-cau-hoi/index.tsx` (tìm kiếm + cột "Nội dung câu hỏi").

### 2.3. Nén ảnh — `src/utils/imageCompress.ts`

`compressImageFile(file)`: đọc ảnh, resize chiều rộng tối đa **900px**, nén JPEG bắt đầu quality **0.82**; lặp tối đa 10 lần — ưu tiên giảm quality trước (bước 0.12, tối thiểu 0.35), hết mức mới giảm tiếp chiều rộng (×0.75 mỗi lần, tối thiểu **220px**) — cho tới khi base64 ≤ **60KB** hoặc hết mức giảm. Ảnh PNG giữ định dạng PNG (không ép JPEG, vì có thể có nền trong suốt) nhưng vẫn bị resize. Nhờ vậy giáo viên **tải thẳng ảnh chụp/screenshot gốc** (vài MB) mà không cần tự chỉnh sửa — hệ thống tự lo.

### 2.4. Xuất Word — `src/utils/htmlToDocx.ts` + `examWordExport.ts`

- `htmlToDocxParagraphs(content, leadingRun?)`: nếu không phải HTML (`isLikelyHtml` false) → 1 `Paragraph` với `TextRun` thuần. Nếu là HTML → sanitize, parse DOM, **đi qua toàn bộ `childNodes` theo thứ tự** (không chỉ lọc thẻ block `P/DIV/H1/H2`) — vì định dạng lưu trữ mới đặt các `<img>` **trần, không bọc block** ở đầu nội dung (xem 2.1), nếu chỉ xử lý theo block sẽ **bỏ sót ảnh khi xuất Word**. Node rời (ảnh, text không bọc) được dồn vào buffer và flush thành 1 đoạn văn khi gặp thẻ block tiếp theo hoặc hết node.
- Giữ được: đậm/nghiêng/gạch chân/gạch ngang, cỡ chữ (`<font size>` → half-points), màu chữ, font chữ, và **ảnh base64 nhúng trực tiếp** (`docx`'s `ImageRun` nhận `data` là chuỗi data-URI, tự decode base64 — không cần convert tay).
- `examWordExport.ts::buildExamDocxDocument` gọi `htmlToDocxParagraphs(q.text, new TextRun({text: "Câu N: ", bold: true}))` cho mỗi câu hỏi khi build file `.docx` thật (không còn kiểu `.doc`-giả-RTF).

## 3. Vòng đời trạng thái (state machine)

```
[draft]    --(Gửi thẩm định)-->        [pending]
[rejected] --(Gửi thẩm định/sửa lại)--> [pending]
[pending]  --(Thẩm định: Đồng ý)-->     [approved]
[pending]  --(Thẩm định: Từ chối)-->    [rejected]
```

| Status (int) | Nhãn UI | Trạng thái kế |
|---|---|---|
| draft (0) | Tạo mới | pending |
| pending (1) | Chờ thẩm định | approved / rejected |
| approved (2) | Đã thẩm định | (kết thúc — dùng cho ma trận đề) |
| rejected (-1) | Từ chối | pending (sau khi sửa & gửi lại) |

### Quy tắc hiện nút hành động — **3 điều kiện riêng biệt, đừng gộp chung**

Ở `tab-ngan-hang-cau-hoi/index.tsx` (cột "Thao tác"):
- `canSendReview = status === 'draft' || status === 'rejected'` → hiện mục menu "Gửi thẩm định/phản biện".
- `canEditQuestion = status === 'draft' || status === 'pending'` → hiện nút ✎ Chỉnh sửa. **Lưu ý: KHÔNG bao gồm `rejected`** (khác với gửi thẩm định) — đây là quyết định nghiệp vụ đã chốt, không phải bug.
- `showEye = status === 'pending' || status === 'approved' || status === 'rejected'` → hiện nút 👁 Xem chi tiết (draft không có, vì draft chỉ sửa được chứ chưa có gì để "xem chi tiết" khác bản đang sửa).
- "Xóa câu hỏi" luôn hiện trong menu "⋯", **không giới hạn theo status** (xem gap ở mục 8.1).

Ở `tham-dinh-cau-hoi/index.tsx` (cột "Thao tác"), bộ hành động **khác hẳn**, đơn giản hơn:
- "Thẩm định chi tiết" — luôn hiện.
- `canEditQuestion = status === 'draft' || status === 'pending'` (giống công thức trên) → hiện nút ✎ Chỉnh sửa **nếu prop `onEditQuestion` được truyền**. Trên thực tế tab này chỉ hiện `pending/approved/rejected` (không có draft), nên nút này chỉ thực sự xuất hiện với câu đang `pending`.
- "Lịch sử thẩm định" — luôn hiện.

Cột trạng thái: đã **gộp về 1 cột duy nhất** (`StatusBadge`) cho mọi câu hỏi, **không còn cột "Trạng thái của câu AI tạo" riêng** — đã xóa hẳn khỏi cả 2 file. Trước đây câu do AI tạo bị ẩn ở cột "Trạng thái" thường và có cột riêng; giờ mọi câu hỏi (kể cả AI tạo) hiện trạng thái ở đúng 1 nơi.

### Modal Cập nhật dùng chung cho cả 2 tab — điểm dễ gây bug nếu sửa ẩu

`UpdateQuestionModal` được **mount ở cấp cao nhất của `QuestionBankModule`, NẰM NGOÀI** khối `{activeTab === 'bank' ? (...) : (<ThamDinhCauHoiTab/>)}` (đặt ngay trước `</div>` đóng component, sau nhánh ternary). Đây là chỗ **đã từng bug**: trước kia modal này nằm *trong* nhánh `activeTab === 'bank'`, nên khi bấm "Chỉnh sửa" từ tab Thẩm định (set `isUpdateOpen=true` nhưng modal chưa hề mount vì đang ở tab khác) không hiện gì; chuyển tab qua rồi quay lại mới thấy modal bật lên (vì lúc đó nó mới mount và đọc thấy state đã `true` từ trước). Nếu sau này thêm modal mới cần mở từ cả 2 tab, **nhớ đặt nó ngoài ternary** giống pattern này, đừng lặp lại lỗi.

Cơ chế nối: `ThamDinhCauHoiTab` nhận prop `onEditQuestion?: (q: Question) => void`; `QuestionBankModule` truyền vào `(record) => { setUpdateQuestion(record); setIsUpdateOpen(true); }` — đúng 2 state đang điều khiển `UpdateQuestionModal` chung.

### Liên hệ với tab Thẩm định (`tham-dinh-cau-hoi/`)

`ThamDinhCauHoiTab` không tự fetch dữ liệu — dùng chung `dbQuestions`/props từ tab cha, chỉ lọc còn `pending|approved|rejected` (mặc định lọc `pending`, draft không hiện ở đây). Duyệt/từ chối gọi đúng API thật (`bankQuestionApi.approve/reject/bulkReview`) rồi `fetchQuestions()` lại — nên **thay đổi ở tab Thẩm định phản ánh ngay ở tab Ngân hàng câu hỏi** (cùng 1 nguồn dữ liệu).

⚠️ **Mâu thuẫn "reject" cũ vẫn còn tồn tại (đã xác minh lại, chưa dọn)**: `useAppState.ts::handleRejectQuestion` và fallback nội bộ trong `tham-dinh-cau-hoi/index.tsx` (`handleReject`, và nhánh fallback trong `ReviewDetailModal.onReject`) coi từ chối = quay về `draft`. Nhưng luồng **thật đang chạy** là handler cục bộ trong `tab-ngan-hang-cau-hoi/index.tsx` gọi `bankQuestionApi.reject()` (set DB `-1`/`rejected`), luôn được truyền xuống nên fallback không bao giờ chạy. Code path "reject → draft" vẫn nằm trong repo dưới dạng **dead code không thể chạm tới** — cẩn thận khi refactor logic reject, đừng vô tình "hồi sinh" nhánh cũ.

Ngoài ra tồn tại **3 UI review khác nhau** trong codebase: `src/components/ReviewModal.tsx` (mở từ dashboard, dùng `RichTextView`), `ReviewDetailModal`/`BulkReviewModal` inline trong `tham-dinh-cau-hoi/index.tsx` (đang dùng thật), và `tham-dinh-cau-hoi/review.tsx` (`QuestionReviewModule` — **dead code xác nhận lại, không có importer nào**).

## 4. Sinh câu hỏi bằng AI (`ai-generate.tsx`) — ĐÃ NỐI BACKEND THẬT

Khác hẳn với ghi chú cũ ("chỉ là mock") — tính năng này **đã được nối vào AI thật (Google Gemini)** qua Gateway, không còn là demo giao diện.

### 4.1. Luồng gọi AI

- Modal có đủ 7 lựa chọn: Môn học, Khối lớp, Chủ đề, Tiểu mục chủ đề, Thành phần năng lực, Cấp độ tư duy, **Loại hình câu hỏi (lấy dữ liệu thật từ danh mục `question_types`, không hard-code)**.
- Loại hình câu hỏi map qua `resolveInternalQuestionType()`, chỉ 3 loại **thật sự sinh được bằng AI**: `single`, `true_false`, `short` (`AI_SUPPORTED_TYPES`). `multiple` (Câu hỏi nhóm) bị khóa trong dropdown kèm tooltip giải thích — vì backend không có chỗ lưu cấu trúc câu hỏi con (xem mục 8.4), không phải vì AI không sinh được.
- Bấm "Bắt đầu sinh câu hỏi tự động" → `fetch('/api/generate-questions', {subject, grade, topic, count:1, type, easyPercent/mediumPercent/hardPercent theo Cấp độ tư duy đã chọn})` → Gateway (`:8000`, `backend/gateway/main.py`) proxy sang AI Service (`:8002`, `backend/ai_service/routes/generate.py::generate_questions`) → gọi Gemini thật.
- Backend soạn **3 prompt khác nhau theo loại** (Phần I/II/III của đề thi tốt nghiệp THPT — Thông tư 22/2024): trắc nghiệm 4 phương án (JSON `{text, options, correctAnswer: "A"|"B"|"C"|"D"}`), Đúng/Sai 4 ý độc lập (JSON `{text, statements:[{content, isCorrect}]}`), Trả lời ngắn (JSON `{text, correctAnswer}`). Mọi prompt đều chèn `_PLAIN_TEXT_RULES` — cấm LaTeX/markdown, chỉ dùng text thuần + ký hiệu Unicode toán học — để tránh "ký tự lạ". `_clean_generated_questions`/`_clean_ai_text` còn lọc sạch thêm lần cuối (safety-net bóc markdown/LaTeX còn sót) trước khi trả JSON.
- Response map về `Question` theo từng loại (single: ghép chữ cái → nội dung đáp án; true_false: dựng lại `TrueFalseStatement[]` dùng chung topic/level/nangLuc từ form; short: lấy thẳng `correctAnswer`).

### 4.2. Chỉnh sửa trước khi lưu

Sau khi AI trả về, khung xem trước có nút **"Chỉnh sửa"** ↔ **"Xong, xem lại"**: bật `isEditingPreview`, chuyển toàn bộ khung preview sang chế độ sửa trực tiếp — nội dung câu hỏi dùng `RichTextEditor` thật (có thể thêm ảnh/định dạng ngay tại đây), trắc nghiệm sửa từng đáp án + chọn lại đáp án đúng bằng radio, Đúng/Sai sửa từng ý a/b/c/d + tick đúng/sai, trả lời ngắn sửa trực tiếp đáp án. Không có bước "lưu chỉnh sửa" riêng — mọi thay đổi áp dụng ngay vào state `aiSuggestedQuestion`.

Bấm "Duyệt và Thêm vào NHCH" → `questionApi.create()` (`POST /questions/`) lưu thật xuống DB với `status: 'pending'`, rồi `fetchQuestions()` đồng bộ lại — không còn tình trạng câu AI tạo biến mất sau khi reload.

### 4.3. Giới hạn còn lại

- Ảnh chèn qua AI-generate cũng qua `RichTextEditor`/`compressImageFile` như soạn thủ công — cùng giới hạn ~60KB/ảnh.
- `multiple` (Câu hỏi nhóm) không sinh được bằng AI, đã giải thích ở 4.1 — muốn mở khóa phải bổ sung field lưu `subQuestions` ở backend trước (mục 8.4).

## 5. Các hành động chính khác

### Tạo mới thủ công (`manual-create.tsx`) / Cập nhật (`update.tsx`)
- Chọn 1 trong 4 loại: Trắc nghiệm đơn, Đúng/Sai (4 statement cố định), Điền số/trả lời ngắn, Câu hỏi nhóm (sub-type: liên kết trước sau / độc lập / kết hợp).
- "Nội dung câu hỏi" dùng `RichTextEditor` thật (mục 2), không còn textarea + toolbar giả.
- 2 nút submit: **Lưu** (status = draft) và **Gửi thẩm định** (status = pending ngay). Create gọi `questionApi.create` (`POST /questions/`); Update gọi `bankQuestionApi.update` (`PUT /bank-questions/{id}`) nếu đã có id, fallback `questionApi.create` nếu chưa.
- Nút **"Xem thử" đã bị xóa hẳn** khỏi cả 2 modal (trước đây là stub không làm gì, chỉ hiện toast "đang phát triển").
- ⚠️ Với loại "Câu hỏi nhóm", `subQuestions` build ở FE **vẫn không có field tương ứng ở backend** → dữ liệu bị âm thầm mất khi lưu (chưa được sửa, xem mục 8.4).
- ⚠️ Chỉ chặn mở modal Sửa ở phía client (`canEditQuestion`) — **backend không có guard** ngăn PUT lên câu hỏi đã `approved`.
- Bấm "Lưu" trong Update **luôn set status về `draft`** bất kể trạng thái gốc — nghĩa là sửa một câu đang `pending` rồi bấm "Lưu" (không bấm "Gửi thẩm định") sẽ tự rút nó khỏi hàng chờ thẩm định về lại Nháp. Đây là chủ đích (tránh nội dung sửa nhưng chưa thẩm định lại nằm lẫn ở "chờ thẩm định"), không phải bug.

### Xóa (`delete.tsx`)
- **ĐÃ SỬA (2026-07-24)**: `handleDeleteConfirm` giờ gọi `bankQuestionApi.delete(id)` thật (`DELETE /bank-questions/{id}`, hard-delete) trước khi cập nhật state/`fetchQuestions()`. Cả xóa 1 dòng (menu "⋯") lẫn xóa hàng loạt (nút "Xóa" ở toolbar, dùng `Promise.all`) đều gọi API thật. Lỗi từ API hiện `message.error` và **giữ modal mở** (không tắt `isDeleteOpen`) để người dùng biết xóa thất bại thay vì âm thầm đóng modal như thành công.
- Không giới hạn theo status — kể cả câu đã `approved` vẫn hiện nút xóa trong menu "⋯". Backend cũng không có guard theo status/quyền sở hữu cho DELETE (xem mục 8, điểm 6).

### Xem chi tiết (`detail.tsx`)
- Read-only, dùng `RichTextView` cho nội dung câu hỏi (giữ định dạng + ảnh), tô xanh đáp án đúng, bảng Đúng/Sai theo `statements`. Chỉ dùng cho `pending|approved|rejected` (draft chỉ có Sửa).

### Gửi thẩm định (`send-review.tsx`)
- Chuyển `draft`/`rejected` → `pending` qua `POST /bank-questions/{id}/submit`. Bulk chỉ submit các dòng đang ở draft/rejected, bỏ qua dòng khác.
- Submit **không ghi log** vào `question_histories` (khác approve/reject/bulk-review có ghi).

### Lịch sử (`history.tsx`)
- ⚠️ **Vẫn 100% mock, chưa sửa** — `generateMockHistory` tạo cứng 5 dòng với người dùng/ngày cố định (`'4005 - Nguyễn Văn A'`, tháng 5/2025), không đọc dữ liệu thật dù backend đã ghi log thật (`question_histories`) khi approve/reject/bulk-review. Không có endpoint `GET /bank-questions/{id}/history`. Nút "Xuất Excel" và "Xem chi tiết" trong modal này cũng chỉ hiện toast "đang phát triển".

## 6. Layout sidebar "Phân loại kiểm tra" — đã đổi từ sticky sang cố định hoàn toàn

Cả 2 tab (`tab-ngan-hang-cau-hoi/index.tsx` và `tham-dinh-cau-hoi/index.tsx`) dùng chung cấu trúc:
```
grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch lg:max-h-[calc(100vh-170px)]
├─ sidebar (lg:col-span-1): max-h-[calc(100vh-170px)] overflow-y-auto flex flex-col   ← KHÔNG sticky, không di chuyển khi cuộn
└─ nội dung (lg:col-span-4): max-h-[calc(100vh-170px)] overflow-y-auto lg:pr-1        ← tự cuộn riêng bên trong
```
Trước đây sidebar dùng `sticky top-24` + `h-[calc(100vh-140px)]` — 2 số liệu này **không khớp nhau và không khớp header thật** (header thật cao 64px, không phải ~140px), gây 2 lỗi: (1) mép dưới sidebar (nút "Làm sạch bộ lọc") bị trồi ra ngoài vùng nhìn thấy và không cuộn tới được; (2) sidebar vẫn di chuyển một đoạn trước khi "dính" lại theo đúng cơ chế `sticky` (không phải bug, là bản chất của sticky) — nhưng bị coi là lỗi vì người dùng muốn sidebar **tuyệt đối không di chuyển**.

Cách sửa: bỏ hẳn `sticky`, giới hạn chiều cao cả khối grid đúng bằng vùng nhìn thấy còn lại của viewport, để trang không cần cuộn cho phần này nữa — chỉ cột nội dung bên phải tự cuộn nội bộ. Các class trên có prefix `lg:` nên tự tắt ở màn hình nhỏ hơn `lg` (mobile/tablet gộp về 1 cột, cuộn theo trang như bình thường).

⚠️ Nếu sau này layout header/`Content` trong `App.tsx` thay đổi chiều cao, con số `170px` này cần tính lại cho khớp (header hiện tại: `AppHeader.tsx`, `h-16` = 64px, cộng padding của `Content#app-viewport-container` trong `App.tsx`).

## 7. API endpoints (backend riêng, FastAPI, KHÔNG thuộc Next.js `src/app/api`)

| Endpoint | Method | Mục đích |
|---|---|---|
| `/bank-questions/` | GET | Danh sách câu hỏi (join tên môn/lớp/chủ đề/mức độ/loại/năng lực) — proxy trực tiếp `:8001`, không qua gateway |
| `/bank-questions/count-by-topic` | GET | Đếm câu đã duyệt theo chủ đề (dùng cho module Ma trận đề) |
| `/bank-questions/random-select` | POST | Chọn ngẫu nhiên câu đã duyệt theo ma trận (sinh đề thi) |
| `/bank-questions/{id}` | PUT | Cập nhật câu hỏi |
| `/bank-questions/{id}` | DELETE | Hard-delete (tồn tại nhưng **không được gọi từ UI** — xem mục 5, Xóa) |
| `/bank-questions/{id}/submit` | POST | draft/rejected → pending |
| `/bank-questions/{id}/approve` | POST | → approved (2), ghi history |
| `/bank-questions/{id}/reject` | POST | → rejected (-1), ghi history |
| `/bank-questions/bulk-review` | POST | Duyệt/từ chối hàng loạt, ghi history từng câu |
| `/questions/` | POST | Endpoint tạo câu hỏi thật (Create/Update/AI-accept) — fuzzy-match môn/lớp/mức độ/loại theo tên (ILIKE) |
| `/question-types/` | GET | Danh mục "Loại hình câu hỏi" thật — dùng cho dropdown trong `ai-generate.tsx` |
| `/subject-categories/`, `/grade-levels/`, `/topics/`, `/competency-components/`, `/cognitive-levels/` | GET | Dữ liệu danh mục cho dropdown |
| `/api/generate-questions` | POST | AI sinh câu hỏi thật (qua Gateway `:8000` → AI Service `:8002` → Gemini) — dùng bởi `ai-generate.tsx` |

Backend routes: `backend/exam_service/routes/bank_questions.py`, `backend/exam_service/routes/questions.py`, `backend/exam_service/routes/question_types.py`, `backend/ai_service/routes/generate.py`, `backend/gateway/main.py` (proxy `/api/generate-questions` → AI service `/generate`).

## 8. Quy tắc nghiệp vụ / gap còn tồn đọng (đã rà soát lại từng cái, không suy đoán)

1. ~~Xóa không thực sự xóa server-side~~ — **đã sửa 2026-07-24** (mục 5).
2. **Sub-questions của "Câu hỏi nhóm" không được lưu** — backend không có field chứa, chưa sửa (mục 8.4).
3. **Modal Lịch sử vẫn là trang trí, dữ liệu giả cứng** — chưa sửa (mục 5).
4. **Chưa có field `subQuestions`/`groupType` ở backend** (`BankQuestionCreate`/`BankQuestionUpdate` trong `bank_questions.py`, `QuestionCreateAPI` trong `danhMucApi.ts`) — nên loại "Câu hỏi nhóm" bị khóa ở cả form thủ công (dữ liệu mất âm thầm) và AI (bị khóa dropdown có chủ đích, không mất âm thầm).
5. **Chủ đề phải được duyệt trước** (status=2) mới có thể gắn cho câu hỏi mới.
6. **Không có phân quyền server-side** trên các endpoint mutate (PUT/DELETE/approve/reject/submit) — mọi kiểm soát nút bấm chỉ ở phía client dựa theo status, không theo role hay quyền sở hữu câu hỏi. Về lý thuyết một user có quyền xem tab có thể tự duyệt câu hỏi do chính mình tạo.
7. **Mã câu hỏi (`code`) sinh ở client chỉ là tạm** — server tự sinh code định danh riêng, code hiển thị sẽ được ghi đè sau khi `fetchQuestions()` chạy lại.
8. **Fuzzy match môn học/khối lớp/loại câu hỏi** theo tên ở backend (ILIKE), nếu không khớp sẽ trả lỗi 400 hiển thị qua `message.error`.
9. **Ảnh nhúng base64 giới hạn ~60KB/ảnh sau nén** (mục 2.3) — do cột DB `content` là `TEXT` (~64KB) và chưa có endpoint upload ảnh riêng/migration `LONGTEXT`. Ảnh cực chi tiết (hiếm) có thể không nén đủ nhỏ, hệ thống vẫn chấp nhận kết quả tốt nhất tìm được thay vì từ chối thẳng.
10. **Hai luồng "reject" song song, 1 dead code** — xem mục 3, "Mâu thuẫn reject cũ".
11. **`tham-dinh-cau-hoi/review.tsx` (`QuestionReviewModule`) vẫn là dead code**, không có importer nào trong `src/` — an toàn để xóa nếu dọn dẹp.

## 9. Việc cần làm nếu tiếp tục phát triển (gợi ý, không phải yêu cầu bắt buộc)
- Thêm endpoint GET history thật và bỏ mock trong `history.tsx`.
- Xóa hẳn code path "reject → draft" đã chết (`useAppState.handleRejectQuestion`, fallback trong `tham-dinh-cau-hoi/index.tsx`) để tránh nhầm lẫn khi đọc code.
- Thêm field lưu `subQuestions`/`groupType` ở backend nếu muốn "Câu hỏi nhóm" hoạt động thật (cả thủ công và AI).
- Nếu cần ảnh chất lượng cao hơn/không giới hạn ~60KB: cần làm endpoint upload ảnh riêng (trả về URL, không nhúng base64) — tránh phải đổi cột DB sang `LONGTEXT` trên production.
- Xóa `tham-dinh-cau-hoi/review.tsx` (dead code) khi dọn dẹp.
