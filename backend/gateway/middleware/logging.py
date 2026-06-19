"""
Request/Response logging middleware for the API Gateway.
Captures all traffic flowing through the gateway for the monitoring dashboard.
"""
import time
import uuid
from datetime import datetime
from collections import deque
# pyrefly: ignore [missing-import]
from starlette.middleware.base import BaseHTTPMiddleware
# pyrefly: ignore [missing-import]
from starlette.requests import Request
# pyrefly: ignore [missing-import]
from starlette.responses import Response


# Rolling log storage (max 50 entries) — mirrors TypeScript gatewayLogs
gateway_logs: deque = deque(maxlen=50)

# Seed initial logs
_now = datetime.utcnow()
gateway_logs.extend([
    {
        "id": "log-init-1",
        "timestamp": (_now.isoformat() + "Z"),
        "service": "gateway",
        "method": "SYS",
        "path": "/init",
        "status": 200,
        "message": "API Gateway (Port 8000) khởi động thành công. Đang tải cấu hình...",
    },
    {
        "id": "log-init-2",
        "timestamp": (_now.isoformat() + "Z"),
        "service": "exam",
        "method": "SYS",
        "path": "/bootstrap",
        "status": 200,
        "message": "Exam Service khởi tạo thành công. Dữ liệu mẫu được nạp vào MySQL.",
    },
    {
        "id": "log-init-3",
        "timestamp": (_now.isoformat() + "Z"),
        "service": "ai",
        "method": "SYS",
        "path": "/genai-ping",
        "status": 200,
        "message": "AI Generation Service sẵn sàng kết nối qua Google Gemini SDK.",
    },
    {
        "id": "log-init-4",
        "timestamp": (_now.isoformat() + "Z"),
        "service": "analytics",
        "method": "SYS",
        "path": "/metrics-calc",
        "status": 200,
        "message": "Analytics Service sẵn sàng tổng hợp ma trận độ khó.",
    },
])


def add_log(service: str, method: str, path: str, status: int, message: str):
    """Add a log entry to the rolling buffer."""
    log_entry = {
        "id": f"log-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": service,
        "method": method,
        "path": path,
        "status": status,
        "message": message,
    }
    gateway_logs.appendleft(log_entry)


def get_logs() -> list[dict]:
    """Get all logs as a list."""
    return list(gateway_logs)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs all API requests flowing through the gateway."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)

        # Determine which service handled this request
        path = request.url.path
        service = "gateway"
        if "/exams" in path or "/packages" in path:
            service = "exam"
        elif "/generate" in path or "/suggest" in path or "/ai/" in path:
            service = "ai"
        elif "/analytics" in path:
            service = "analytics"
        elif "/auth" in path or "/users" in path:
            service = "auth"

        msg = f"Yêu cầu được chuyển hướng. Phản hồi trong {duration_ms}ms"
        if response.status_code >= 400:
            msg = f"Gặp lỗi xử lý dịch vụ. Mã lỗi {response.status_code}"

        add_log(service, request.method, path, response.status_code, msg)
        return response
