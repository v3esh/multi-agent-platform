from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base

class Agent(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String)
    
    # Status: active, paused, stopped
    status = Column(String, default="active")
    
    # Schedule window (e.g., "09:00-17:00")
    active_window = Column(String)
    
    # Maximum actions per day
    frequency_limit = Column(Integer, default=10)
    
    # Permission Profile linkage
    permission_profile_id = Column(Integer, ForeignKey("permissionprofile.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
