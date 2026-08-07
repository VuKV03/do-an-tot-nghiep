/**
 * Base URL cho toàn bộ API call của FE — đổi qua biến môi trường (.env), không phải sửa code
 * mỗi khi chuyển giữa chạy local và domain online.
 *
 * Một số module (SystemAdminModule.tsx, UserManagement.tsx, GroupManagement.tsx,
 * SecurityPolicy.tsx, ai-generate/index.tsx) đã có sẵn quy ước
 * `import.meta.env.VITE_APP_API_URL || 'https://api.quanlythi.site/api'` — base ĐÃ CÓ '/api' ở
 * cuối. File này dùng lại đúng biến đó cho nhất quán, và suy ra thêm origin trần (không có '/api')
 * cho các chỗ tự viết `/api/...` hoặc path không có '/api' (ví dụ '/subject-categories/') phía sau.
 *
 * Local dev: đặt VITE_APP_API_URL=http://localhost:8000/api trong .env — API Gateway route được cả
 * 2 dạng path có/không '/api' (xem backend/gateway/main.py::make_proxy_route).
 * Production (không set gì): fallback về domain online, giữ đúng hành vi cũ trước khi có file này.
 */
export const API_URL = import.meta.env.VITE_APP_API_URL || 'https://api.quanlythi.site/api';

/** Origin trần, không có '/api' ở cuối — suy ra từ API_URL để chỉ phải đổi 1 chỗ khi đổi domain. */
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
