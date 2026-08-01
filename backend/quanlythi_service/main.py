# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.shared.database import ensure_database_exists, init_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    print("=" * 60)
    print("[QuanLyThi Service] Starting on Port 8005...")
    # await ensure_database_exists()
    # await init_tables()
    print("[QuanLyThi Service] Ready!")
    print("=" * 60)
    yield
    print("[QuanLyThi Service] Shutting down...")

app = FastAPI(
    title="SmartTest - Exam Management & Portal Service",
    description="Microservice quản lý kỳ thi và cổng thi trực tuyến cho thí sinh.",
    version="1.0.0",
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

from backend.quanlythi_service.routes.admin import router as admin_router
from backend.quanlythi_service.routes.portal import router as portal_router

app.include_router(admin_router, prefix="/api/exam/admin", tags=["Admin"])
app.include_router(portal_router, prefix="/api/exam/portal", tags=["Portal"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "quanlythi-service", "port": 8005}


if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("backend.quanlythi_service.main:app", host="0.0.0.0", port=8005, reload=True)
