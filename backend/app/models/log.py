from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class ActivityLog(Base):
    """
    Operational history of agent actions (e.g., search success, draft pending, publish failed).
    """
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agent.id"), index=True)
    
    action_type = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False) # success, failed, pending
    
    details = Column(JSON) # Request/response payload, error messages
    
    agent = relationship("Agent", backref="activity_logs")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class AuditLog(Base):
    """
    Administrative and security events (e.g., user login, permission changed, agent paused).
    """
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)
    
    event_type = Column(String, nullable=False)
    description = Column(Text)
    
    ip_address = Column(String)
    
    user = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
