# 📦 Shared Library (Thư viện dùng chung)

## 📌 Giới thiệu

**Shared Library** nằm tại thư mục `backend/shared/` chứa các cấu hình dùng chung, hàm kết nối cơ sở dữ liệu và các tiện ích dùng chung được chia sẻ giữa toàn bộ 5 dịch vụ vi mô (Gateway, Exam, AI, Analytics, Auth). Thiết kế này giúp tối ưu hóa mã nguồn, tránh trùng lặp mã và đảm bảo tính thống nhất trong việc cấu hình và truy vấn dữ liệu.

---

## 📂 Chi tiết cấu trúc thư mục

* **`config.py`**:

  - Đọc và phân tích các cấu hình từ tệp tin môi trường `.env` ở thư mục gốc.
  - Định nghĩa lớp `ServiceConfig` chứa URL kết nối của 4 microservice hạ nguồn.
  - Định nghĩa lớp `GeminiConfig` chứa API Key và cài đặt kết nối SDK Gemini AI.
  - Định nghĩa lớp `DatabaseConfig` chứa địa chỉ, cổng, tài khoản, mật khẩu kết nối database MySQL.
* **`database.py`**:

  - Khởi tạo Engine kết nối cơ sở dữ liệu MySQL bất đồng bộ sử dụng thư viện `sqlalchemy.ext.asyncio` kết hợp driver `aiomysql`.
  - Thiết lập `async_session` (Sessionmaker bất đồng bộ) phục vụ các phiên giao dịch (transactions) dữ liệu.
  - Cung cấp hàm tiện ích `ensure_database_exists()` để tự động tạo cơ sở dữ liệu `quan_ly_sinh_de_ai_v2` nếu chưa tồn tại trên MySQL Server.
  - Cung cấp hàm tiện ích `init_tables()` tự động khởi tạo cấu trúc bảng từ các Model đã khai báo.
  - Khai báo dependency `get_db()` phục vụ cơ chế Dependency Injection trong FastAPI để tự động đóng/mở phiên kết nối cơ sở dữ liệu một cách an toàn.

---

## ⚙️ Các thông số cấu hình chính

| Tên biến cấu hình     | Giá trị mặc định     | Ý nghĩa                          |
| :------------------------ | :------------------------ | :--------------------------------- |
| `DB_HOST`               | `localhost`             | Máy chủ MySQL                    |
| `DB_PORT`               | `3306`                  | Cổng dịch vụ MySQL              |
| `DB_NAME`               | `quan_ly_sinh_de_ai_v2` | Tên cơ sở dữ liệu             |
| `GEMINI_API_KEY_1`, `_2`, ... | *(Trống)*         | Các API Key Google Gemini, xoay vòng theo khung giờ trong ngày (chia đều 24h cho số key). Dùng `GEMINI_API_KEY` (không đánh số) nếu chỉ có 1 key. |
| `EXAM_SERVICE_URL`      | `http://localhost:8001` | URL của Exam Service              |
| `AI_SERVICE_URL`        | `http://localhost:8002` | URL của AI Service                |
| `ANALYTICS_SERVICE_URL` | `http://localhost:8003` | URL của Analytics Service         |
| `AUTH_SERVICE_URL`      | `http://localhost:8004` | URL của Auth Service              |

---

## 🛠️ Sử dụng trong Microservices

Để sử dụng phiên làm việc với cơ sở dữ liệu trong các API Endpoint:

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.shared.database import get_db

@router.get("/data")
async def read_data(db: AsyncSession = Depends(get_db)):
    # Truy vấn dữ liệu thông qua db
    ...
```
