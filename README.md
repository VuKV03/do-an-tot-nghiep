# Hệ thống Quản lý Sinh đề thi ứng dụng AI

Đồ án tốt nghiệp: nền tảng quản lý ngân hàng câu hỏi, ma trận đề thi và sinh đề thi tự động bằng AI (Google Gemini), gồm frontend React (Admin + Portal) và backend theo kiến trúc microservices (FastAPI).

## Kiến trúc hệ thống

```
┌──────────────┐     ┌───────────────┐
│  Frontend    │     │   Frontend    │
│  Admin :5173 │     │  Portal :5174 │
└──────┬───────┘     └───────┬───────┘
       └──────────┬──────────┘
                   ▼
          ┌─────────────────┐
          │  API Gateway     │ :8000
          └────────┬─────────┘
       ┌────────────┼────────────┬────────────┬────────────┐
       ▼            ▼            ▼            ▼            ▼
   Exam :8001   AI :8002   Analytics   Auth :8004   QuanLyThi :8005
                            :8003
                   │
                   ▼
             MySQL / TiDB
```

| Service            | Port | Chức năng chính                                   |
| ------------------ | ---- | -------------------------------------------------- |
| `gateway`           | 8000 | API Gateway, proxy request tới các service         |
| `exam_service`      | 8001 | Quản lý đề thi, ngân hàng câu hỏi, ma trận đề       |
| `ai_service`        | 8002 | Sinh câu hỏi/đề thi bằng Google Gemini AI           |
| `analytics_service` | 8003 | Thống kê, báo cáo, phân tích kết quả                |
| `auth_service`      | 8004 | Xác thực, phân quyền (JWT)                          |
| `quanlythi_service`  | 8005 | Quản lý kỳ thi, ca thi, phòng thi                   |

## Công nghệ sử dụng

**Frontend:** React 19, TypeScript, Vite, Ant Design, Tailwind CSS, Recharts

**Backend:** Python, FastAPI, SQLAlchemy (async), MySQL/TiDB, JWT, Google Gemini AI SDK

## Yêu cầu môi trường

- Node.js >= 18
- Python >= 3.10
- MySQL 8.0 (hoặc TiDB Cloud)

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/VuKV03/do-an-tot-nghiep.git
cd do-an-tot-nghiep
```

### 2. Cấu hình biến môi trường

Sao chép file mẫu và điền thông tin thực tế (API key, thông tin DB, ...):

```bash
cp .env.example .env
```

> ⚠️ Không commit file `.env` chứa khóa/API key hoặc mật khẩu thật lên GitHub.

### 3. Cài đặt & khởi chạy tự động

**Windows:**

```bash
setup.bat
```

**macOS/Linux:**

```bash
chmod +x setup.sh
./setup.sh
```

Script sẽ tự động: kiểm tra Git/Node/Python, cài đặt phụ thuộc frontend (`npm install`), tạo virtualenv Python và cài `requirements.txt`.

### 4. Chạy thủ công (nếu cần)

```bash
# Frontend + Backend cùng lúc
npm run dev

# Hoặc chạy riêng
npm run dev:portal       # Frontend Portal (cổng 5174)
python start_services.py # Toàn bộ microservices backend
```

Sau khi khởi chạy:

- Frontend Admin: http://localhost:5173
- Frontend Portal: http://localhost:5174
- API Gateway: http://localhost:8000

## Triển khai (Docker)

```bash
docker compose --env-file .env.production up -d --build
docker compose ps
docker compose logs -f
```

Xem chi tiết cấu hình tại [docker-compose.yml](docker-compose.yml) và [Dockerfile](Dockerfile).

## Cấu trúc thư mục

```
├── backend/                 # Microservices (FastAPI)
│   ├── gateway/              # API Gateway
│   ├── exam_service/         # Đề thi, ngân hàng câu hỏi
│   ├── ai_service/           # Sinh đề bằng AI
│   ├── analytics_service/    # Thống kê, báo cáo
│   ├── auth_service/         # Xác thực, phân quyền
│   ├── quanlythi_service/    # Quản lý kỳ thi
│   └── shared/                # Thành phần dùng chung
├── src/                     # Frontend React
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── types.ts
├── docker-compose.yml
├── requirements.txt          # Phụ thuộc Python
├── package.json               # Phụ thuộc Node.js
└── setup.sh / setup.bat       # Script cài đặt tự động
```

## Ghi chú

- Tài liệu báo cáo, slide bảo vệ đồ án được lưu trữ riêng, không đưa lên repository (xem [.gitignore](.gitignore)).
- Từng service backend có README riêng trong thư mục tương ứng (`backend/<service>/README.md`).

SIuu
