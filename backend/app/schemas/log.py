from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class ActivityLogBase(BaseModel):
    agent_id: Optional[int] = None
    action_type: str
    status: str
    details: Optional[str] = None
    target_reference: Optional[str] = None

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLog(ActivityLogBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
