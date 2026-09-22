from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AgentBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    active_window: Optional[str] = None
    frequency_limit: Optional[int] = 10
    permission_profile_id: Optional[int] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(AgentBase):
    name: Optional[str] = None

class AgentInDBBase(AgentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Agent(AgentInDBBase):
    reddit_username: Optional[str] = None
    reddit_linked: bool = False
    permission_profile_id: Optional[int] = None
