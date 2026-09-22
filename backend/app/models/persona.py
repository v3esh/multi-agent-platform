from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Persona(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    
    # Characteristics
    personality = Column(Text, nullable=False)
    interests = Column(Text)
    communication_style = Column(Text)
    behavior = Column(Text)
    
    # Relationships
    agent_id = Column(Integer, ForeignKey("agent.id"))
    agent = relationship("Agent", backref="personas")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
