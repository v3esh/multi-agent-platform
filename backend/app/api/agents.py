from typing import Any, List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.api import deps
from app.models.agent import Agent
from app.models.user import User
from app.models.log import ActivityLog
from app.schemas.agent import Agent as AgentSchema, AgentCreate, AgentUpdate

router = APIRouter()

class BulkStatusRequest(BaseModel):
    status: str # active, paused, stopped
    agent_ids: Optional[List[int]] = None

@router.get("/", response_model=List[AgentSchema])
async def read_agents(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve agents.
    """
    from app.models.reddit_account import RedditAccount
    result = await db.execute(select(Agent).offset(skip).limit(limit))
    agents = result.scalars().all()
    
    # Query linked Reddit accounts for returned agents
    agent_ids = [a.id for a in agents]
    reddit_res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id.in_(agent_ids)))
    accounts = {acc.agent_id: acc for acc in reddit_res.scalars().all()}
    
    agent_list = []
    for a in agents:
        schema_obj = AgentSchema.model_validate(a)
        if a.id in accounts:
            schema_obj.reddit_username = accounts[a.id].reddit_username
            schema_obj.reddit_linked = True
        else:
            schema_obj.reddit_username = None
            schema_obj.reddit_linked = False
        agent_list.append(schema_obj)
        
    return agent_list

@router.post("/", response_model=AgentSchema)
async def create_agent(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    agent_in: AgentCreate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Create new agent.
    """
    agent_obj = Agent(**agent_in.model_dump())
    db.add(agent_obj)
    await db.commit()
    await db.refresh(agent_obj)
    return agent_obj

@router.post("/bulk-status")
async def bulk_update_status(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    req: BulkStatusRequest,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Bulk update agent status (active, paused, stopped) across all or targeted agents.
    Provides emergency safety controls (e.g. Pause All / Stop All / Resume All).
    """
    valid_statuses = ["active", "paused", "stopped"]
    if req.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{req.status}'. Must be one of {valid_statuses}")

    target_status = req.status.lower()

    if req.agent_ids:
        stmt = update(Agent).where(Agent.id.in_(req.agent_ids)).values(status=target_status)
    else:
        stmt = update(Agent).values(status=target_status)

    res = await db.execute(stmt)
    updated_count = res.rowcount

    log = ActivityLog(
        agent_id=None,
        action_type="bulk_status_update",
        status="success",
        details=f"Central Safeguard Control: Bulk updated {updated_count} agent(s) to status '{target_status.upper()}'"
    )
    db.add(log)
    await db.commit()

    return {
        "message": f"Successfully updated {updated_count} agent(s) to {target_status.upper()}",
        "updated_count": updated_count,
        "status": target_status
    }

@router.post("/run-cycles")
async def run_cycles(
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Manually trigger an immediate execution cycle across all active scheduled agents.
    """
    from app.tasks.agent_tasks import process_scheduled_agent_cycles
    summary = await process_scheduled_agent_cycles()
    return summary

@router.put("/{agent_id}", response_model=AgentSchema)
async def update_agent(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    agent_id: int,
    agent_in: AgentUpdate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Update an agent.
    """
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent_obj = result.scalars().first()
    if not agent_obj:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    update_data = agent_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent_obj, field, value)
        
    await db.commit()
    await db.refresh(agent_obj)
    return agent_obj

@router.delete("/{agent_id}", response_model=AgentSchema)
async def delete_agent(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    agent_id: int,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Delete an agent.
    """
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent_obj = result.scalars().first()
    if not agent_obj:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    from app.models.approval import Approval
    from app.models.reddit_account import RedditAccount
    from sqlalchemy import delete

    await db.execute(delete(Approval).where(Approval.agent_id == agent_id))
    await db.execute(delete(ActivityLog).where(ActivityLog.agent_id == agent_id))
    await db.execute(delete(RedditAccount).where(RedditAccount.agent_id == agent_id))

    await db.delete(agent_obj)
    await db.commit()
    return agent_obj
