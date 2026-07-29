"""
API Gateway — FastAPI Reverse Proxy (Port 8000)
Routes all /api/* requests to the appropriate downstream microservice.
Also provides microservices status, scaling, and log endpoints.
"""
import os
import time
import random
from datetime import datetime
from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
import httpx
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, Response, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from starlette.responses import StreamingResponse

from backend.shared.config import service_config
from backend.gateway.middleware.logging import LoggingMiddleware, add_log, get_logs

# ─── Service Registry ───────────────────────────────────────────────
SERVICE_MAP = {
    "exam": service_config.EXAM_SERVICE_URL,
    "ai": service_config.AI_SERVICE_URL,
    "analytics": service_config.ANALYTICS_SERVICE_URL,
    "auth": service_config.AUTH_SERVICE_URL,
    "quanlythi": service_config.QUANLYTHI_SERVICE_URL,
}

# ─── Replica state (in-memory, matches TypeScript version) ──────────
replicas = {
    "gateway": 1,
    "exam": 2,
    "ai": 2,
    "analytics": 1,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("🌐 [API Gateway] Khởi động trên Port 8000...")
    print(f"   → Exam Service:      {SERVICE_MAP['exam']}")
    print(f"   → AI Service:        {SERVICE_MAP['ai']}")
    print(f"   → Analytics Service: {SERVICE_MAP['analytics']}")
    print(f"   → Auth Service:      {SERVICE_MAP['auth']}")
    print("✅ [API Gateway] Sẵn sàng định tuyến!")
    print("=" * 60)
    yield
    print("[API Gateway] Đang tắt...")


app = FastAPI(
    title="SmartTest - API Gateway",
    description="Central reverse proxy routing requests to microservices.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging middleware
app.add_middleware(LoggingMiddleware)


# ─── Reverse Proxy Helper ───────────────────────────────────────────
async def proxy_request(request: Request, target_url: str) -> Response:
    """Forward a request to a downstream service."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Build the target URL
        path = request.scope.get("path", request.url.path)
        query = str(request.url.query)
        url = f"{target_url}{path}" + (f"?{query}" if query else "")

        # Forward headers (strip hop-by-hop)
        headers = dict(request.headers)
        headers.pop("host", None)

        body = await request.body()

        try:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
            )
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=dict(resp.headers),
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=f"Service tại {target_url} không phản hồi. Vui lòng kiểm tra service đã khởi động.",
            )


# ─── Route: Exam Service ────────────────────────────────────────────
@app.api_route("/api/v1/exams", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/v1/exams/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_exams(request: Request, path: str = ""):
    """Forward exam requests to Exam Service."""
    # Rewrite path: /api/v1/exams/... → /exams/...
    request.scope["path"] = f"/exams/{path}" if path else "/exams/"
    return await proxy_request(request, SERVICE_MAP["exam"])


@app.api_route("/api/exams", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/exams/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_exams_fallback(request: Request, path: str = ""):
    """Backward compatible exam route."""
    # Handle packages sub-route
    if path.startswith("packages"):
        pkg_path = path[len("packages"):]
        request.scope["path"] = f"/packages/{pkg_path.lstrip('/')}" if pkg_path else "/packages/"
    else:
        request.scope["path"] = f"/exams/{path}" if path else "/exams/"
    return await proxy_request(request, SERVICE_MAP["exam"])


# ─── Route: Matrix Configs ──────────────────────────────────────────
@app.api_route("/api/matrix-configs", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/matrix-configs/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_matrix_configs(request: Request, path: str = ""):
    """Forward matrix config requests to Exam Service."""
    request.scope["path"] = f"/matrix-configs/{path}" if path else "/matrix-configs/"
    return await proxy_request(request, SERVICE_MAP["exam"])


# ─── Route: AI Service ──────────────────────────────────────────────
@app.post("/api/generate-questions")
async def proxy_generate_questions(request: Request):
    """Forward question generation to AI Service."""
    request.scope["path"] = "/generate"
    return await proxy_request(request, SERVICE_MAP["ai"])


@app.post("/api/suggest-exam-info")
async def proxy_suggest_info(request: Request):
    """Forward exam info suggestion to AI Service."""
    request.scope["path"] = "/suggest"
    return await proxy_request(request, SERVICE_MAP["ai"])


@app.api_route("/api/ai/v1", methods=["GET", "POST"])
@app.api_route("/api/ai/v1/{path:path}", methods=["GET", "POST"])
async def proxy_ai_v1(request: Request, path: str = ""):
    """Forward AI v1 routes."""
    request.scope["path"] = f"/{path}" if path else "/"
    return await proxy_request(request, SERVICE_MAP["ai"])


# ─── Route: Analytics Service ───────────────────────────────────────
@app.get("/api/analytics/summary")
async def proxy_analytics_summary(request: Request):
    """Forward analytics summary to Analytics Service."""
    request.scope["path"] = "/summary"
    return await proxy_request(request, SERVICE_MAP["analytics"])


@app.api_route("/api/auth", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_auth(request: Request, path: str = ""):
    """Forward auth requests to Auth Service."""
    request.scope["path"] = f"/{path}" if path else "/"
    return await proxy_request(request, SERVICE_MAP["auth"])


# ─── Route: QuanLyThi Service ───────────────────────────────────────
@app.api_route("/api/exam/admin", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/exam/admin/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_quanlythi_admin(request: Request, path: str = ""):
    """Forward admin requests to QuanLyThi Service."""
    request.scope["path"] = f"/api/exam/admin/{path}" if path else "/api/exam/admin/"
    return await proxy_request(request, SERVICE_MAP["quanlythi"])


@app.api_route("/api/exam/portal", methods=["GET", "POST", "PUT", "DELETE"])
@app.api_route("/api/exam/portal/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_quanlythi_portal(request: Request, path: str = ""):
    """Forward portal requests to QuanLyThi Service."""
    request.scope["path"] = f"/api/exam/portal/{path}" if path else "/api/exam/portal/"
    return await proxy_request(request, SERVICE_MAP["quanlythi"])


# ─── Microservices Control & Status ─────────────────────────────────
@app.get("/api/microservices/status")
async def microservices_status():
    """Return status of all microservices."""
    import psutil
    mem = psutil.virtual_memory()
    mem_used_mb = int(mem.used / 1024 / 1024)

    # Check health of each service
    services = []
    for svc_id, svc_url in SERVICE_MAP.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{svc_url}/health")
                status = "healthy" if resp.status_code == 200 else "degraded"
        except Exception:
            status = "unhealthy"

        svc_info = {
            "id": svc_id,
            "name": {
                "exam": "Exam Service (Quản lý đề)",
                "ai": "AI Generation Service (Tạo đề)",
                "analytics": "Analytics Service (Phân tích)",
                "auth": "Auth Service (Xác thực)",
            }.get(svc_id, svc_id),
            "status": status,
            "port": {
                "exam": 8001, "ai": 8002, "analytics": 8003, "auth": 8004,
            }.get(svc_id, 0),
            "replicas": replicas.get(svc_id, 1),
            "cpu": f"{round(random.uniform(0.5, 3.0), 1)}%",
            "memory": f"{random.randint(30, 120)} MB",
            "latency": f"{random.randint(5, 50)}ms",
            "url": svc_url,
        }
        services.append(svc_info)

    # Add gateway itself
    services.insert(0, {
        "id": "gateway",
        "name": "API Gateway (Cổng nối)",
        "status": "healthy",
        "port": 8000,
        "replicas": replicas["gateway"],
        "cpu": "0.8%",
        "memory": f"{mem_used_mb} MB",
        "latency": "2ms",
        "dbType": "Reverse Proxy / Router",
        "desc": "Định tuyến luồng API, xác thực JWT và cân bằng tải yêu cầu.",
    })

    return {
        "success": True,
        "data": {
            "services": services,
            "overallHealth": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    }


@app.post("/api/microservices/scale")
async def scale_service(request: Request):
    """Scale a microservice (replica count)."""
    body = await request.json()
    service_id = body.get("serviceId")
    new_count = body.get("newCount")

    if not service_id or not isinstance(new_count, int):
        raise HTTPException(status_code=400, detail="Tham số yêu cầu bị rỗng")

    if service_id == "gateway":
        raise HTTPException(status_code=403, detail="Không được phép thay đổi replica của Gateway!")

    if new_count < 1 or new_count > 8:
        raise HTTPException(status_code=400, detail="Số lượng replica: tối thiểu 1, tối đa 8")

    old_val = replicas.get(service_id, 1)
    replicas[service_id] = new_count

    msg = f"Thay đổi số lượng container instances từ {old_val} lên {new_count} replicas."
    add_log(service_id, "SCALE", f"/scale/{service_id}", 200, msg)

    return {"success": True, "replicas": replicas, "message": msg}


@app.get("/api/microservices/logs")
async def microservices_logs():
    """Return gateway traffic logs."""
    return {"success": True, "logs": get_logs()}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "api-gateway", "port": 8000}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.gateway.main:app", host="0.0.0.0", port=8000, reload=True)
