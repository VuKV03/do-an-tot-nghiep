"""
AI Service — FastAPI Microservice (Port 8002)
Handles AI-powered question generation and exam info suggestions via Google Gemini.
"""
from contextlib import asynccontextmanager
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from backend.ai_service.routes.generate import router as generate_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("🤖 [AI Service] Khởi động trên Port 8002...")
    print("✅ [AI Service] Sẵn sàng kết nối Google Gemini API!")
    print("=" * 60)
    yield
    print("[AI Service] Đang tắt...")


app = FastAPI(
    title="SmartTest - AI Generation Service",
    description="Microservice tạo sinh câu hỏi và gợi ý cấu hình đề thi bằng Google Gemini.",
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

app.include_router(generate_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service", "port": 8002}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.ai_service.main:app", host="0.0.0.0", port=8002, reload=True)
