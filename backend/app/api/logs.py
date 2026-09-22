from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.log import ActivityLog
from app.models.user import User
from app.schemas.log import ActivityLog as ActivityLogSchema

router = APIRouter()

@router.get("/", response_model=List[ActivityLogSchema])
async def read_logs(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve system activity logs.
    """
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()
