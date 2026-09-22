from typing import Any, List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.models.permission import PermissionProfile, Permission
from app.models.log import ActivityLog
from app.schemas.permission import (
    PermissionProfile as PermissionProfileSchema,
    PermissionProfileCreate,
)

router = APIRouter()

@router.get("/profiles", response_model=List[PermissionProfileSchema])
async def read_permission_profiles(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Retrieve all capability permission profiles.
    """
    result = await db.execute(
        select(PermissionProfile).options(selectinload(PermissionProfile.permissions))
    )
    profiles = result.scalars().all()
    
    # Auto-seed defaults if empty
    if not profiles:
        await seed_default_profiles(db)
        result = await db.execute(
            select(PermissionProfile).options(selectinload(PermissionProfile.permissions))
        )
        profiles = result.scalars().all()
        
    return profiles

@router.post("/profiles", response_model=PermissionProfileSchema)
async def create_permission_profile(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    profile_in: PermissionProfileCreate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Create a new capability permission profile.
    """
    existing = await db.execute(select(PermissionProfile).where(PermissionProfile.name == profile_in.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Profile with this name already exists.")

    profile_obj = PermissionProfile(
        name=profile_in.name,
        description=profile_in.description
    )
    db.add(profile_obj)
    await db.commit()
    await db.refresh(profile_obj)

    for p_in in profile_in.permissions:
        perm_obj = Permission(
            profile_id=profile_obj.id,
            action_type=p_in.action_type,
            requires_approval=p_in.requires_approval,
            daily_limit=p_in.daily_limit
        )
        db.add(perm_obj)

    log = ActivityLog(
        agent_id=None,
        action_type="permission_profile_created",
        status="success",
        details=f"Created capability profile: {profile_in.name}"
    )
    db.add(log)
    await db.commit()

    res = await db.execute(
        select(PermissionProfile)
        .options(selectinload(PermissionProfile.permissions))
        .where(PermissionProfile.id == profile_obj.id)
    )
    return res.scalars().first()

@router.delete("/profiles/{profile_id}")
async def delete_permission_profile(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    profile_id: int,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Delete a capability permission profile.
    """
    res = await db.execute(select(PermissionProfile).where(PermissionProfile.id == profile_id))
    profile = res.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Permission profile not found")

    await db.execute(delete(Permission).where(Permission.profile_id == profile_id))
    await db.delete(profile)
    await db.commit()
    return {"message": "Permission profile deleted", "profile_id": profile_id}

async def seed_default_profiles(db: AsyncSession):
    """Seed initial default capability profiles."""
    p1 = PermissionProfile(name="Standard (Human-in-the-Loop)", description="Default policy requiring admin approval before publishing comments or posts.")
    db.add(p1)
    await db.commit()
    await db.refresh(p1)

    db.add_all([
        Permission(profile_id=p1.id, action_type="comment", requires_approval=True, daily_limit=15),
        Permission(profile_id=p1.id, action_type="publish", requires_approval=True, daily_limit=10),
        Permission(profile_id=p1.id, action_type="search", requires_approval=False, daily_limit=100),
    ])

    p2 = PermissionProfile(name="Autonomous Scout (Auto-Post)", description="High trust profile allowing direct automated posting for verified agents.")
    db.add(p2)
    await db.commit()
    await db.refresh(p2)

    db.add_all([
        Permission(profile_id=p2.id, action_type="comment", requires_approval=False, daily_limit=30),
        Permission(profile_id=p2.id, action_type="publish", requires_approval=False, daily_limit=20),
        Permission(profile_id=p2.id, action_type="search", requires_approval=False, daily_limit=200),
    ])

    p3 = PermissionProfile(name="High Security (Strict Review)", description="Maximum security policy requiring approval for ALL actions including searches.")
    db.add(p3)
    await db.commit()
    await db.refresh(p3)

    db.add_all([
        Permission(profile_id=p3.id, action_type="comment", requires_approval=True, daily_limit=5),
        Permission(profile_id=p3.id, action_type="publish", requires_approval=True, daily_limit=5),
        Permission(profile_id=p3.id, action_type="search", requires_approval=True, daily_limit=20),
    ])

    await db.commit()
