from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class PermissionProfile(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    
    permissions = relationship("Permission", backref="profile", cascade="all, delete-orphan")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Permission(Base):
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("permissionprofile.id"))
    
    # e.g., 'search', 'draft', 'publish'
    action_type = Column(String, nullable=False)
    
    # Is human approval required before execution?
    requires_approval = Column(Boolean, default=True)
    
    # Maximum allowed per day
    daily_limit = Column(Integer)
