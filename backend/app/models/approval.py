from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Approval(Base):
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agent.id"))
    
    action_type = Column(String, nullable=False)
    proposed_content = Column(Text, nullable=False)
    
    # Status: pending, approved, rejected, edited
    status = Column(String, default="pending")
    
    agent = relationship("Agent", backref="approvals")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
