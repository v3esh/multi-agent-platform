from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class ApprovalBase(BaseModel):
    agent_id: int
    action_type: str
    proposed_content: str

class ApprovalCreate(ApprovalBase):
    pass

class ApprovalUpdate(BaseModel):
    status: Optional[str] = None
    proposed_content: Optional[str] = None

class ApprovalInDBBase(ApprovalBase):
    id: int
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Approval(ApprovalInDBBase):
    pass
