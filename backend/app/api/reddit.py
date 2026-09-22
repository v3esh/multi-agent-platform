import os
from typing import Any, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api import deps
from app.models.user import User
from app.models.agent import Agent
from app.models.reddit_account import RedditAccount
from app.models.approval import Approval
from app.models.log import ActivityLog
from app.core.reddit_adapter import RedditAdapter
from app.core.policy_engine import policy_engine

router = APIRouter()

CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "mock_client_id")
REDIRECT_URI = os.getenv("REDDIT_REDIRECT_URI", "http://localhost:8000/api/reddit/callback")

class CommentRequest(BaseModel):
    agent_id: int
    submission_id: str
    content: str

class ConnectRequest(BaseModel):
    reddit_username: str

@router.get("/login/{agent_id}")
async def reddit_login(agent_id: int):
    """Initiate Reddit OAuth flow."""
    auth_url = (
        f"https://www.reddit.com/api/v1/authorize?client_id={CLIENT_ID}"
        f"&response_type=code&state={agent_id}&redirect_uri={REDIRECT_URI}"
        f"&duration=permanent&scope=identity read submit"
    )
    return {"url": auth_url}

@router.get("/callback")
async def reddit_callback(
    state: str,
    code: str,
    db: AsyncSession = Depends(deps.get_db)
):
    """Handle Reddit OAuth callback and redirect to frontend."""
    try:
        agent_id = int(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
        
    access_token = f"token_for_agent_{agent_id}_{code}"
    
    # Perform live OAuth token exchange if Reddit client credentials exist
    from app.core.config import settings
    if settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    "https://www.reddit.com/api/v1/access_token",
                    auth=(settings.REDDIT_CLIENT_ID, settings.REDDIT_CLIENT_SECRET),
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": REDIRECT_URI
                    },
                    headers={"User-Agent": settings.REDDIT_USER_AGENT}
                )
                if token_res.status_code == 200:
                    token_data = token_res.json()
                    access_token = token_data.get("access_token", access_token)
        except Exception:
            pass

    adapter = RedditAdapter(access_token)
    profile = await adapter.get_user_profile()
    username = profile.get("name", f"reddit_user_{agent_id}")
    if not username.startswith("u/"):
        username = f"u/{username}"
    
    # Check if account exists, update or create
    res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == agent_id))
    account = res.scalars().first()
    if not account:
        account = RedditAccount(
            agent_id=agent_id,
            reddit_username=username,
            access_token=access_token
        )
        db.add(account)
    else:
        account.reddit_username = username
        account.access_token = access_token
        
    log = ActivityLog(
        agent_id=agent_id,
        action_type="reddit_account_linked",
        status="success",
        details=f"Connected Reddit account: {username}"
    )
    db.add(log)
    await db.commit()
    
    # Redirect back to frontend agents manager UI
    return RedirectResponse(url=f"http://localhost:3000/agents?reddit_linked=true&agent_id={agent_id}&username={username}")

@router.post("/connect/{agent_id}")
async def connect_reddit_account(
    agent_id: int,
    req: ConnectRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Instantly link a Reddit handle to an agent (for dev/demo/staging)."""
    res = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent_obj = res.scalars().first()
    if not agent_obj:
        raise HTTPException(status_code=404, detail="Agent not found")

    username = req.reddit_username.strip()
    if not username.startswith("u/"):
        username = f"u/{username}"

    account_res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == agent_id))
    account = account_res.scalars().first()
    
    token = f"token_{agent_id}_{username}"
    if not account:
        account = RedditAccount(
            agent_id=agent_id,
            reddit_username=username,
            access_token=token
        )
        db.add(account)
    else:
        account.reddit_username = username
        account.access_token = token
        
    log = ActivityLog(
        agent_id=agent_id,
        action_type="reddit_account_linked",
        status="success",
        details=f"Linked Reddit account: {username}"
    )
    db.add(log)
    await db.commit()
    
    return {"message": "Reddit account connected successfully", "reddit_username": username, "agent_id": agent_id}

@router.delete("/disconnect/{agent_id}")
async def disconnect_reddit_account(
    agent_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Disconnect/Unlink a Reddit account from an agent."""
    await db.execute(delete(RedditAccount).where(RedditAccount.agent_id == agent_id))
    
    log = ActivityLog(
        agent_id=agent_id,
        action_type="reddit_account_unlinked",
        status="success",
        details="Disconnected Reddit account"
    )
    db.add(log)
    await db.commit()
    return {"message": "Reddit account unlinked", "agent_id": agent_id}

@router.get("/search")
async def reddit_search(
    query: str,
    agent_id: int,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Perform search on Reddit."""
    result = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == agent_id))
    account = result.scalars().first()
    token = account.access_token if account else "mock_token"
    
    adapter = RedditAdapter(token)
    results = await adapter.search(query=query)
    return {"query": query, "results": results}

@router.post("/comment")
async def post_comment(
    req: CommentRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Post a comment to Reddit or route it through the policy engine approval workflow.
    """
    decision = await policy_engine.evaluate_action(db, req.agent_id, "publish")
    
    if not decision.allowed:
        raise HTTPException(status_code=403, detail=f"Action forbidden: {decision.reason}")
        
    if decision.requires_approval:
        approval = Approval(
            agent_id=req.agent_id,
            action_type="comment",
            proposed_content=f"[Target Thread: {req.submission_id}] {req.content}",
            status="pending"
        )
        db.add(approval)
        
        log = ActivityLog(
            agent_id=req.agent_id,
            action_type="comment_queued",
            status="pending_approval",
            details=f"Target: {req.submission_id} | Content: {req.content[:60]}..."
        )
        db.add(log)
        await db.commit()
        
        return {
            "status": "pending_approval",
            "message": "Action policy requires admin review before posting to Reddit. Request queued.",
            "approval_id": approval.id
        }
        
    res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == req.agent_id))
    account = res.scalars().first()
    token = account.access_token if account else "mock_token"
    adapter = RedditAdapter(token)
    
    output = await adapter.post_comment(req.submission_id, req.content)
    
    log = ActivityLog(
        agent_id=req.agent_id,
        action_type="comment_posted",
        status="success",
        details=f"Posted to {req.submission_id}: {req.content[:60]}..."
    )
    db.add(log)
    await db.commit()
    
    return {"status": "executed", "result": output}
