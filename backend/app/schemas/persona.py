from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class PersonaBase(BaseModel):
    name: str
    personality: str
    interests: Optional[str] = None
    communication_style: Optional[str] = None
    behavior: Optional[str] = None
    agent_id: Optional[int] = None

class PersonaCreate(PersonaBase):
    pass

class PersonaUpdate(PersonaBase):
    name: Optional[str] = None
    personality: Optional[str] = None

class PersonaInDBBase(PersonaBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Persona(PersonaInDBBase):
    pass

class PersonaGenerateRequest(BaseModel):
    base_description: str
    agent_id: Optional[int] = None
