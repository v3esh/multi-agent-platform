from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class PermissionBase(BaseModel):
    action_type: str
    requires_approval: bool = True
    daily_limit: Optional[int] = 20

class PermissionCreate(PermissionBase):
    pass

class Permission(PermissionBase):
    id: int
    profile_id: Optional[int] = None

    class Config:
        from_attributes = True

class PermissionProfileBase(BaseModel):
    name: str
    description: Optional[str] = None

class PermissionProfileCreate(PermissionProfileBase):
    permissions: List[PermissionCreate] = []

class PermissionProfile(PermissionProfileBase):
    id: int
    created_at: Optional[datetime] = None
    permissions: List[Permission] = []

    class Config:
        from_attributes = True
