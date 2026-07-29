"""
Package CRUD routes — ported from examService.ts (packages section)
Handles: GET /packages, POST /packages, PUT /packages/{id}, DELETE /packages/{id}
"""
import json
import time
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select

from backend.shared.database import get_db
from backend.exam_service.models import Package
from backend.exam_service.schemas import (
    PackageCreate, PackageUpdate, PackageResponse, PackageListResponse,
)

router = APIRouter(prefix="/packages", tags=["Packages"])


def _parse_exam_ids(exam_ids_str: str | None) -> list[str]:
    if not exam_ids_str:
        return []
    try:
        parsed = json.loads(exam_ids_str) if isinstance(exam_ids_str, str) else exam_ids_str
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _build_package_response(p: Package) -> PackageResponse:
    return PackageResponse(
        id=p.id,
        code=p.code,
        name=p.name,
        subject=p.subject,
        grade=p.grade,
        status=p.status or "active",
        examsCount=p.examsCount or 0,
        examIds=_parse_exam_ids(p.examIds),
        downloadsCount=p.downloadsCount or 0,
        accessType=p.accessType or "standard",
        createdAt=p.createdAt,
        description=p.description or "",
        matrix_id=p.matrix_id,
    )


@router.get("/", response_model=PackageListResponse)
async def list_packages(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả gói đề thi."""
    result = await db.execute(select(Package).order_by(Package.createdAt.desc()))
    packages = result.scalars().all()
    data = [_build_package_response(p) for p in packages]
    return PackageListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_package(body: PackageCreate, db: AsyncSession = Depends(get_db)):
    """Tạo gói đề thi mới."""
    pkg_id = f"pkg-{int(time.time() * 1000)}"
    pkg_code = body.code or f"GP-{str(int(time.time()))[-6:].upper()}"
    now = datetime.utcnow().isoformat() + "Z"

    package = Package(
        id=pkg_id,
        code=pkg_code,
        name=body.name,
        subject=body.subject,
        grade=body.grade,
        # "pending" ngay khi tạo — mirror cách exams.py đặt status="pending" lúc tạo đề thi, để
        # gói đề mới hiện diện ngay trong tab "Thẩm định/phản biện gói đề" không cần bước gửi riêng.
        status="pending",
        examsCount=len(body.examIds) if body.examIds else 0,
        examIds=json.dumps(body.examIds or [], ensure_ascii=False),
        downloadsCount=0,
        accessType=body.accessType or "standard",
        createdAt=now,
        description=body.description or "",
        matrix_id=body.matrix_id,
    )
    db.add(package)
    await db.commit()

    return {
        "success": True,
        "message": "Đã thiết lập gói đề thi thành công!",
        "data": _build_package_response(package),
    }


@router.put("/{pkg_id}")
async def update_package(pkg_id: str, body: PackageUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật gói đề thi."""
    result = await db.execute(select(Package).where(Package.id == pkg_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đề thi yêu cầu.")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "examIds" and value is not None:
            package.examIds = json.dumps(value, ensure_ascii=False)
            package.examsCount = len(value)
        elif hasattr(package, field):
            setattr(package, field, value)

    await db.commit()
    await db.refresh(package)

    return {
        "success": True,
        "message": "Đã cập nhật gói đề thi thành công!",
        "data": _build_package_response(package),
    }


@router.delete("/{pkg_id}")
async def delete_package(pkg_id: str, db: AsyncSession = Depends(get_db)):
    """Xóa gói đề thi."""
    result = await db.execute(select(Package).where(Package.id == pkg_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Không phát hiện gói đề thi tương thích để xóa.")

    name = package.name
    await db.delete(package)
    await db.commit()
    return {"success": True, "message": f'Đã xóa thành công gói đề: "{name}"'}


@router.post("/{pkg_id}/publish")
async def publish_package(pkg_id: str, db: AsyncSession = Depends(get_db)):
    """Phát thi một gói đề (chuyển sang Active)."""
    result = await db.execute(select(Package).where(Package.id == pkg_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đề thi yêu cầu.")

    # Kiểm tra xem Môn thi của gói đề này đã có gói nào đang "active" chưa
    active_result = await db.execute(
        select(Package).where(
            Package.subject == package.subject,
            Package.status == "active",
            Package.id != pkg_id
        )
    )
    active_package = active_result.scalar_one_or_none()
    if active_package:
        raise HTTPException(
            status_code=400, 
            detail=f"Môn {package.subject} đang có Gói đề {active_package.name} được phát. Vui lòng tắt Gói đề đó trước."
        )

    package.status = "active"
    await db.commit()
    await db.refresh(package)

    return {
        "success": True,
        "message": f"Đã phát thi gói đề {package.name} thành công!",
        "data": _build_package_response(package),
    }


@router.post("/{pkg_id}/unpublish")
async def unpublish_package(pkg_id: str, db: AsyncSession = Depends(get_db)):
    """Tắt phát thi một gói đề (chuyển sang Inactive)."""
    result = await db.execute(select(Package).where(Package.id == pkg_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đề thi yêu cầu.")

    package.status = "inactive"
    await db.commit()
    await db.refresh(package)

    return {
        "success": True,
        "message": f"Đã tắt phát thi gói đề {package.name} thành công!",
        "data": _build_package_response(package),
    }
