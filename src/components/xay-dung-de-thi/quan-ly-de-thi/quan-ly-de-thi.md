# Tài liệu kỹ thuật: Phân tích Chức năng Quản lý Đề thi và Gói đề thi

Tài liệu này cung cấp cái nhìn chi tiết và toàn diện về module **"Quản lý đề thi, gói đề thi"** (`quan-ly-de-thi-goi-de-thi`) trong dự án `RJS_web`. Đây là tài liệu hướng dẫn dành cho một Model Agent khác để có thể hiểu, bảo trì hoặc tái cấu trúc chức năng tương tự.

---

## 1. Tổng quan Kiến trúc & Cơ chế Render (Config-Driven Development)

Hệ thống RJS_web áp dụng phương pháp phát triển hướng cấu hình (**Config-Driven Development**). Giao diện của trang không được hardcode cứng, mà được xây dựng động từ một cấu hình JSON tải về từ backend hoặc khai báo sẵn.

### Luồng định tuyến & Khởi tạo (Routing Flow)
1. **Đường dẫn Sidebar:** Menu item dẫn tới module này được định nghĩa tại `src/layouts/sidebar/MenuItem.tsx` với path:
   `/${routesConfig.xayDungDe}/${routesConfig.quanLyDeThiGoiDeThi}` (tương đương `/xay-dung-de/quan-ly-de-thi-goi-de-thi`).
2. **Khai báo Route:** Tại `src/configs/routes.ts`, hằng số `quanLyDeThiGoiDeThi = 'quan-ly-de-thi-goi-de-thi'` được ánh xạ.
3. **Router Dynamic Mapping:** Tại `src/routes/router.tsx`, route `/xay-dung-de/:ma_config` sẽ gọi component `RouteRenderForm`. Tham số `:ma_config` trong trường hợp này chính là `quan-ly-de-thi-goi-de-thi`.
4. **Fetch Cấu hình Form:** Component `RouteRenderForm` sẽ gọi API để lấy cấu hình JSON động:
   `GET /api/cau-hinh-form/get-by-ma/quan-ly-de-thi-goi-de-thi`.
   Cấu hình này định nghĩa toàn bộ tabs, fields, filters, buttons, columns, and actions của giao diện.

---

## 2. Cấu trúc Giao diện UI/UX (Tabs & Fields)

Giao diện Quản lý Đề thi, Gói đề thi được tổ chức thành 3 Tab chính. Dưới đây là các trường dữ liệu và cấu hình tương ứng của từng Tab:

### Tab 1: Đề thi (Đề thi hoán vị / Đề thi riêng lẻ)
* **API lấy danh sách:** `GET api/cau-hoi/de-thi?loai=4`
* **Các trường dữ liệu chính trên bảng (Table Columns):**
  * `ma`: Mã đề thi (kiểu `string/guid`)
  * `ten`: Tên đề thi
  * `ten_mon_hoc`: Môn học
  * `tong_diem`: Tổng số điểm
  * `tong_so_cau_hoi_de_rieng_le`: Số lượng câu hỏi
  * `thoi_gian_lam_bai`: Thời gian làm bài (phút)
  * `ngay_tao`: Ngày tạo (Format hiển thị qua hàm helper: `formatDateVNHms`)
  * `trang_thai`: Trạng thái đề (1: Lưu nháp, 2: Chờ thẩm định, 3: Đã thẩm định, 4: Từ chối). Được render bằng CSS tag tùy biến dựa theo thuộc tính `fn_format`.
* **Bộ lọc nâng cao (Advance Filters):** Tìm kiếm theo Tên đề (`ten`), Môn thi (`mon_thi_id` dạng Select lấy từ API `/api/cau-hoi/chu-de/selectDM?other=mon_hoc`), Người tạo, Ngày tạo (RangePicker).

### Tab 2: Đề gốc
* **API lấy danh sách:** `GET api/cau-hoi/de-thi?loai=3`
* **Các trường dữ liệu chính trên bảng:** Tương tự như Tab 1 nhưng đại diện cho phiên bản đề thi gốc (`loai = 3`).
* **Các nút Thao tác nhanh (Quick Filters/Actions):**
  * **Thêm mới:** Mở Modal `ModalDeRiengLe` với prop `typeAdd: true` để tạo mới đề thi riêng lẻ từ ma trận.
  * **Xuất Excel:** Gọi API xuất báo cáo danh sách đề gốc.
  * **Xóa nhiều:** Nút `DeleteMoreButton` kích hoạt hàm `handleDeleteMany`.

### Tab 3: Gói đề thi
* **API lấy danh sách:** `GET api/cau-hoi/goi-de-thi`
* **Các trường dữ liệu chính trên bảng:**
  * `ma`: Mã gói đề
  * `ten`: Tên gói đề
  * `ten_mon_thi`: Môn thi tương ứng
  * `tong_so_de_goc`: Tổng số đề gốc có trong gói
  * `tong_so_de_hoan_vi`: Tổng số đề hoán vị được sinh ra
  * `ngay_tao`: Ngày tạo gói đề
  * `trang_thai`: Trạng thái phê duyệt gói đề
* **Bộ lọc nâng cao:** Lọc theo Tên gói đề (`ten`), Đợt thi (`dot_thi_id` lấy từ API `/api/dm/danh-muc/danh-muc-dot-thi`), Môn thi, Ngày tạo.

---

## 3. Logic Nghiệp vụ & Các Luồng Xử lý Dữ liệu (Action Workflows)

Phần lớn các tương tác nghiệp vụ chuyên biệt của module này được cấu hình thông qua danh sách `actions` (nút tác vụ cuối mỗi dòng dữ liệu) hoặc `quick_filters`. Khi người dùng click, hệ thống sẽ mở các Modal tương ứng với các tham số (props) được cung cấp trong cấu hình JSON.

### Luồng 1: Sinh Đề & Chỉnh sửa Đề (Modal Tự Động Sinh Đề / Đề Riêng Lẻ)

Hệ thống có hai component modal cốt lõi nằm tại `src/pages/xay-dung-de/component/`:
1. `ModalTuDongSinhDe.tsx` (Dành cho việc tạo mới tự động/sinh hàng loạt đề từ ma trận đặc tả hoặc AI).
2. `ModalDeRiengLe.tsx` (Dành cho chỉnh sửa chi tiết các câu hỏi trong đề, tìm câu hỏi tương đương, hoán vị đề riêng lẻ).

* **Chỉnh sửa đề riêng lẻ:** Kích hoạt modal `ModalDeRiengLe` với tham số `typeEditGoc: 1`, `typeAdd: false`. Người dùng có thể:
  * Xem trước toàn bộ nội dung đề thi qua component `<ExamContentDisplay />`.
  * Thay đổi câu hỏi (`handleChangeCauHoi`) bằng cách gọi API `POST /api/cau-hoi/de-thi/doi-cau-hoi` hoặc tìm câu hỏi tương đồng (`handleShowDsCauHoiTuongDong`).
  * Thực hiện cơ chế giới hạn số lần đổi câu hỏi (tối đa 3 lần). Nếu vượt quá số lần, hệ thống sẽ yêu cầu người dùng import một file câu hỏi mới để chèn vào vị trí đó (`applyImportedQuestion`).
* **Sinh đề hoán vị từ đề gốc:** Gọi API `POST /api/cau-hoi/de-thi/sinh-de-hoan-vi` để tự động trộn câu hỏi, hoán vị đáp án dựa trên đề gốc đã chọn.

### Luồng 2: Quản lý Gói Đề Thi (`ModalAddGoiDeThiNew.tsx`)

* **Thêm mới gói đề thi:**
  1. Người dùng chọn đề thi gốc.
  2. Hệ thống tải thông tin đề gốc thông qua API `POST /api/cau-hoi/de-thi/get-ds-by-ids` (`GetDsDeThiByIds`).
  3. Nhập số lượng đề hoán vị cần sinh và mã đề bắt đầu.
  4. Nhấp "Sinh đề hoán vị" để gọi API `POST /api/cau-hoi/de-thi/sinh-de-goc-hoan-vi-goi-de-thi` (`postSinhDeGocHoanViGoiDeThi`).
  5. Sau khi kiểm tra nội dung của các đề hoán vị được hiển thị trên Tab giao diện, nhấp "Lưu" để gọi API `POST /api/cau-hoi/goi-de-thi` (`createGoiDeThi`).

### Luồng 3: Các chức năng Phân quyền, Thẩm định và Lịch sử

Các tác vụ này được định nghĩa dưới dạng danh sách `dropdown` trong cột Hành động của bảng dữ liệu:
* **Gửi thẩm định/phản biện:** Mở modal `DuyetThamDinhChuDe` để lựa chọn người duyệt thẩm định/phản biện cho đề thi.
* **Phân quyền quản lý:** Mở modal `PhanQuyenDeThi` (hoặc `PhanQuyenChuDe` tùy theo tab) để gán quyền xem, sửa, phê duyệt cho các nhân sự khác.
* **Lịch sử chỉnh sửa, thẩm định:** Gọi component `CRUDRenderComponent` lồng trong modal, hiển thị dữ liệu lịch sử tải về từ endpoint `api/cau-hoi/chu-de/lich-su-danh-gia?chu_de_id={record.id}`.

### Luồng 4: Tải xuống file Word (.docx) & Xuất dữ liệu sang hệ thống khác

* **Tải xuống đề thi (.docx):** Gọi dịch vụ `exportDocxDeThi` truyền vào danh sách ID các đề thi. API backend sẽ trả về một file nhị phân Blob dạng ZIP chứa các file tài liệu Word tương ứng của các đề thi. Trình duyệt sẽ tự động tải file ZIP này xuống máy người dùng.
* **Chuyển dữ liệu (Xuất cho phần mềm liên quan):** Kích hoạt modal `ChuyenDuLieu` hoặc `ModalGoiDeThi` để đóng gói dữ liệu đề thi dưới định dạng chuẩn để đồng bộ sang các phân hệ thi trực tuyến hoặc phần mềm chấm thi.

---

## 4. Các Tệp Tin Nguồn Quan Trọng (References)

Để phát triển hoặc gỡ lỗi chức năng này, hãy chú ý đến các file sau:
1. **File cấu hình:** `test copy.json` (Chứa định nghĩa toàn bộ JSON Schema cấu hình cho trang này, là ví dụ thực tế của dữ liệu trả về từ API `/api/cau-hinh-form/get-by-ma/quan-ly-de-thi-goi-de-thi`).
2. **File Services:** `src/services/xay-dung-de/de-thi/index.ts` (Nơi khai báo toàn bộ các hàm gọi API axios như: `postSinhDeGoc`, `postSinhDeGocHoanVi`, `exportDocxDeThi`, `createGoiDeThi`, `GetDsDeThiByIds`,...).
3. **Các Component Modal Nghiệp vụ:**
   * `src/pages/xay-dung-de/component/ModalTuDongSinhDe.tsx`
   * `src/pages/xay-dung-de/component/ModalDeRiengLe.tsx`
   * `src/pages/xay-dung-de/component/ModalAddGoiDeThiNew.tsx`
4. **Component Hiển thị nội dung đề thi:** `src/components/exam-content/ExamContentDisplay.tsx` (Render chi tiết cấu trúc câu hỏi, câu hỏi nhóm `GRP`, câu hỏi đơn, đáp án, và các nút Thay đổi / Xem câu hỏi tương đương).
5. **Component Render động:** `src/pages/route-render-form/index.tsx` (Component `RouteRenderForm` điều phối chính, thực hiện lấy JSON cấu hình và render giao diện động).

---

## 5. Hướng dẫn Cho Model Agent Kế Tiếp

Nếu bạn cần tạo một tính năng quản lý tương tự hoặc bổ sung các trường dữ liệu/hành động mới cho module này, hãy thực hiện theo các bước sau:

1. **Thay đổi Cấu trúc Giao diện (Thêm cột, Thêm filter):**
   * Không sửa mã nguồn React của bảng. Hãy cập nhật trực tiếp cấu hình JSON trong cơ sở dữ liệu (tương ứng với cấu trúc file `test copy.json`). 
   * Ví dụ: Để thêm cột mới, thêm một object cấu trúc trường vào mảng `fields` của tab tương ứng.
2. **Thêm API/Service mới:**
   * Bổ sung hàm gọi API trong `src/services/xay-dung-de/de-thi/index.ts`.
   * Cập nhật URL và phương thức HTTP (`method`) tương ứng trong cấu hình JSON tại các thuộc tính `create`, `edit`, `delete`.
3. **Thêm Modal Tác vụ Mới:**
   * Khai báo component modal mới tại danh sách `listComponents` trong `src/pages/route-render-form/index.tsx`.
   * Trong cấu hình JSON, tại phần `actions` hoặc `quick_filters`, đặt thuộc tính `onClick` gọi hàm `handleOpenModal` với tên component đã đăng ký trong `listComponents`.
