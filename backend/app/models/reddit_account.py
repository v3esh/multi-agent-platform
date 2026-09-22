from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class RedditAccount(Base):
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agent.id"), unique=True)
    
    reddit_username = Column(String, nullable=False)
    
    # In a real app, these should be encrypted in the DB or stored in a Secret Manager like HashiCorp Vault.
    access_token = Column(String, nullable=False)
    refresh_token = Column(String)
    token_expires_at = Column(DateTime)
    
    agent = relationship("Agent", backref="reddit_account")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
