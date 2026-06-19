# 🖥️ SmartTest Virtual Microservices Express Server (`/server`)

## 📌 Giới thiệu
Thư mục `/server` chứa mã nguồn của **Virtual Microservices Express Server** (chạy trên cổng `3000`). Đây là máy chủ phát triển đa năng tích hợp (All-in-One Development Server) sử dụng **Express.js** và **Vite**. 

Nhiệm vụ của máy chủ này là mô phỏng toàn bộ luồng hoạt động của mô hình 5 Microservices (API Gateway, Exam, AI, Analytics, Auth) thông qua các router logic viết bằng **TypeScript** để giảm thiểu tài nguyên tiêu hao và hỗ trợ chế độ lập trình nhanh (Vibe Coding) mà không cần khởi động toàn bộ môi trường Docker/Microservices Python.

---

## 📂 Các thành phần chính
1. **`db.ts`**:
   - Quản lý phiên kết nối và truy vấn đến cơ sở dữ liệu MySQL bằng thư viện `mysql2/promise`.
   - Thực hiện kiểm tra, tự động tạo cơ sở dữ liệu `quan_ly_sinh_de_ai_v2` và nạp dữ liệu mẫu (exams, questions, packages) khi khởi chạy lần đầu.
2. **`services/examService.ts`**:
   - Định nghĩa các endpoint CRUD ảo mô phỏng dịch vụ quản lý đề thi và câu hỏi.
3. **`services/aiService.ts`**:
   - Tương tác với mô hình Google Gemini AI qua SDK Google GenAI để sinh đề kiểm tra và đề xuất cấu hình ảo.
4. **`services/analyticsService.ts`**:
   - Quản lý thuật toán tổng hợp thông tin học tập, phân bố môn học để hiển thị lên Dashboard.

---

## 🔄 Cách thức hoạt động
Khi chạy lệnh `npm run dev` ở thư mục gốc:
1. Dự án sẽ khởi chạy `server.ts` sử dụng `ts-node` trên Port `3000`.
2. Máy chủ Express sẽ kích hoạt môi trường phát triển Vite dưới dạng Middleware (`createViteServer`) để tự động biên dịch và tải lại (HMR) giao diện React Frontend.
3. Các yêu cầu API từ Client gửi đến `/api/*` sẽ được định tuyến thông qua các Service Router ảo nằm trong thư mục này.
4. Máy chủ ghi lại lịch sử cuộc gọi ảo `gatewayLogs` tương đương với cơ chế Logging Middleware của Python API Gateway thực tế.

---

## 🚀 Lệnh khởi chạy nhanh (Express Mode)
Chạy lệnh sau tại thư mục gốc:
```bash
npm run dev
```
Tru cập ứng dụng và kiểm thử tại địa chỉ: `http://localhost:3000`
