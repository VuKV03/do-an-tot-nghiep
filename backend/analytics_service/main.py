"""
Analytics Service — FastAPI Microservice (Port 8003)
Aggregates exam statistics, difficulty matrices, and distribution data.
"""
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from backend.shared.database import ensure_database_exists, init_tables
from backend.exam_service.models import Exam, Question  # register models
from backend.analytics_service.routes.summary import router as summary_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("📊 [Analytics Service] Khởi động trên Port 8003...")
    await ensure_database_exists()
    await init_tables()
    print("✅ [Analytics Service] Sẵn sàng tổng hợp dữ liệu!")
    print("=" * 60)
    yield
    print("[Analytics Service] Đang tắt...")


app = FastAPI(
    title="SmartTest - Analytics Service",
    description="Microservice tổng hợp phổ điểm, tỉ lệ độ khó và phân tích ma trận đề.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summary_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics-service", "port": 8003}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.analytics_service.main:app", host="0.0.0.0", port=8003, reload=True)
