"""
Package CRUD routes — ported from examService.ts (packages section)
Handles: GET /packages, POST /packages, PUT /packages/{id}, DELETE /packages/{id}

Danh sách đề trong 1 gói (examIds) lưu qua bảng trung gian `package_exams` (khóa ngoại thật tới cả
packages.id lẫn exams.id, ON DELETE CASCADE — xem models.py::Package.exam_links) thay vì 1 cột TEXT
chứa JSON string như trước — API response ra ngoài (PackageResponse.examIds: List[str]) giữ NGUYÊN
hình dạng cũ nên frontend không cần đổi gì.
"""
import time
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, delete
# pyrefly: ignore [missing-import]
from sqlalchemy.exc import IntegrityError
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload

from backend.shared.database import get_db
from backend.exam_service.models import Package, PackageExam
from backend.exam_service.schemas import (
    PackageCreate, PackageUpdate, PackageResponse, PackageListResponse,
)

router = APIRouter(prefix="/packages", tags=["Packages"])


def _build_package_response(p: Package, exam_ids: list[str]) -> PackageResponse:
    return PackageResponse(
        id=p.id,
        code=p.code,
        name=p.name,
        subject=p.subject,
        grade=p.grade,
        status=p.status or "active",
        examsCount=p.examsCount or 0,
        examIds=exam_ids,
        downloadsCount=p.downloadsCount or 0,
        accessType=p.accessType or "standard",
        createdAt=p.createdAt,
        description=p.description or "",
        matrix_id=p.matrix_id,
        is_show_result=p.is_show_result if p.is_show_result is not None else True,
    )


async def _get_exam_ids(db: AsyncSession, package_id: str) -> list[str]:
    """Đọc lại danh sách exam_id của 1 gói, đúng thứ tự đã lưu (0 = đề gốc, còn lại = đề hoán vị)."""
    result = await db.execute(
        select(PackageExam.exam_id)
        .where(PackageExam.package_id == package_id)
        .order_by(PackageExam.position)
    )
    return list(result.scalars().all())


async def _replace_exam_links(db: AsyncSession, package_id: str, exam_ids: list[str]) -> None:
    """Xoá hết liên kết cũ rồi gắn lại đúng danh sách mới, giữ nguyên thứ tự — dùng khi tạo mới
    (danh sách cũ vốn rỗng) lẫn khi cập nhật lại examIds của 1 gói đã có."""
    await db.execute(delete(PackageExam).where(PackageExam.package_id == package_id))
    for position, exam_id in enumerate(exam_ids):
        db.add(PackageExam(package_id=package_id, exam_id=exam_id, position=position))


@router.get("/", response_model=PackageListResponse)
async def list_packages(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả gói đề thi."""
    result = await db.execute(
        select(Package)
        .options(selectinload(Package.exam_links))
        .order_by(Package.createdAt.desc())
    )
    packages = result.scalars().all()
    data = [_build_package_response(p, [link.exam_id for link in p.exam_links]) for p in packages]
    return PackageListResponse(success=True, count=len(data), data=data)


@router.post("/", status_code=201)
async def create_package(body: PackageCreate, db: AsyncSession = Depends(get_db)):
    """Tạo gói đề thi mới."""
    pkg_id = f"pkg-{int(time.time() * 1000)}"
    pkg_code = body.code or f"GP-{str(int(time.time()))[-6:].upper()}"
    now = datetime.utcnow().isoformat() + "Z"

    exam_ids = body.examIds or []
    package = Package(
        id=pkg_id,
        code=pkg_code,
        name=body.name,
        subject=body.subject,
        grade=body.grade,
        # "pending" ngay khi tạo — mirror cách exams.py đặt status="pending" lúc tạo đề thi, để
        # gói đề mới hiện diện ngay trong tab "Thẩm định/phản biện gói đề" không cần bước gửi riêng.
        status="pending",
        examsCount=len(exam_ids),
        downloadsCount=0,
        accessType=body.accessType or "standard",
        createdAt=now,
        description=body.description or "",
        matrix_id=body.matrix_id,
        is_show_result=body.is_show_result,
    )
    db.add(package)
    try:
        # Package phải tồn tại thật trong DB TRƯỚC khi insert các dòng package_exams tham chiếu tới
        # nó (ràng buộc khóa ngoại) — flush() đẩy câu INSERT của package đi ngay trong transaction
        # hiện tại (chưa commit), đủ để các INSERT package_exams theo sau tham chiếu hợp lệ.
        await db.flush()
        for position, exam_id in enumerate(exam_ids):
            db.add(PackageExam(package_id=pkg_id, exam_id=exam_id, position=position))
        await db.commit()
    except IntegrityError as e:
        # Rollback session trước khi raise, nếu không session ở trạng thái lỗi sẽ làm hỏng luôn
        # request kế tiếp dùng chung session (phổ biến khi gọi liên tiếp qua cùng 1 connection pool).
        await db.rollback()
        if "packages.code" in str(getattr(e, "orig", e)):
            # Trùng UNIQUE constraint packages.code — trước đây để lọt nguyên lỗi SQL thô (500,
            # "Duplicate entry ... for key 'packages.code'") ra ngoài thay vì thông báo dễ hiểu.
            raise HTTPException(
                status_code=400,
                detail=f"Mã gói đề thi \"{pkg_code}\" đã tồn tại. Vui lòng đổi mã khác.",
            )
        # Còn lại: 1 exam_id trong danh sách không tồn tại thật trong bảng exams (vi phạm khóa ngoại
        # package_exams.exam_id) — trước đây (examIds là JSON tự do) lỗi này bị nuốt hoàn toàn.
        raise HTTPException(
            status_code=400,
            detail="Không thể lưu gói đề — có đề thi trong danh sách không tồn tại hoặc bị trùng lặp.",
        )

    return {
        "success": True,
        "message": "Đã thiết lập gói đề thi thành công!",
        "data": _build_package_response(package, exam_ids),
    }


@router.put("/{pkg_id}")
async def update_package(pkg_id: str, body: PackageUpdate, db: AsyncSession = Depends(get_db)):
    """Cập nhật gói đề thi."""
    result = await db.execute(select(Package).where(Package.id == pkg_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói đề thi yêu cầu.")

    update_data = body.model_dump(exclude_unset=True)
    # Chụp lại mã gói TRƯỚC khi commit/rollback — sau rollback, đối tượng `package` bị SQLAlchemy
    # expire (hết hạn cache), đọc lại package.code lúc đó sẽ kích hoạt lazy-load ngầm, không hợp lệ
    # trên AsyncSession (raise MissingGreenlet) nếu không await đúng cách.
    target_code = update_data.get("code", package.code)
    new_exam_ids = update_data.get("examIds")
    for field, value in update_data.items():
        if field == "examIds":
            continue  # xử lý riêng bên dưới (bảng trung gian, không phải cột trực tiếp trên Package)
        if hasattr(package, field):
            setattr(package, field, value)

    if new_exam_ids is not None:
        await _replace_exam_links(db, pkg_id, new_exam_ids)
        package.examsCount = len(new_exam_ids)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        if "packages.code" in str(getattr(e, "orig", e)):
            raise HTTPException(
                status_code=400,
                detail=f"Mã gói đề thi \"{target_code}\" đã tồn tại. Vui lòng đổi mã khác.",
            )
        raise HTTPException(
            status_code=400,
            detail="Không thể cập nhật gói đề — có đề thi trong danh sách không tồn tại hoặc bị trùng lặp.",
        )
    await db.refresh(package)

    exam_ids = new_exam_ids if new_exam_ids is not None else await _get_exam_ids(db, pkg_id)
    return {
        "success": True,
        "message": "Đã cập nhật gói đề thi thành công!",
        "data": _build_package_response(package, exam_ids),
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

    # Cho phép phát thi nhiều gói đề của cùng 1 môn thi đồng thời.
    package.status = "active"
    await db.commit()
    await db.refresh(package)

    return {
        "success": True,
        "message": f"Đã phát thi gói đề {package.name} thành công!",
        "data": _build_package_response(package, await _get_exam_ids(db, pkg_id)),
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
        "data": _build_package_response(package, await _get_exam_ids(db, pkg_id)),
    }
