from typing import Any, List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.approval import Approval
from app.models.log import ActivityLog
from app.models.user import User
from app.schemas.approval import Approval as ApprovalSchema, ApprovalCreate, ApprovalUpdate
from app.core.reddit_adapter import RedditAdapter
from app.models.reddit_account import RedditAccount

router = APIRouter()

@router.get("", response_model=List[ApprovalSchema])
@router.get("/", response_model=List[ApprovalSchema], include_in_schema=False)
async def read_approvals(
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve pending/history approval requests.
    """
    query = select(Approval)
    if status:
        query = query.where(Approval.status == status)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=ApprovalSchema)
async def create_approval(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    approval_in: ApprovalCreate,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Create a new approval request (usually called internally or by agent engine).
    """
    approval_obj = Approval(**approval_in.model_dump(), status="pending")
    db.add(approval_obj)
    await db.commit()
    await db.refresh(approval_obj)
    
    # Log action
    log = ActivityLog(
        agent_id=approval_in.agent_id,
        action_type=f"approval_requested:{approval_in.action_type}",
        status="pending",
        details=approval_in.proposed_content[:100]
    )
    db.add(log)
    await db.commit()
    
    return approval_obj

@router.post("/{approval_id}/approve", response_model=ApprovalSchema)
async def approve_action(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    approval_id: int,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Approve a pending action and execute it on Reddit if applicable.
    """
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    approval.status = "approved"
    
    # Execute on platform if action is comment/post
    if approval.action_type in ["comment", "publish"]:
        account_res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == approval.agent_id))
        account = account_res.scalars().first()
        token = account.access_token if account else "mock_token"
        adapter = RedditAdapter(token)
        # Execute post/comment action
        await adapter.post_comment(submission_id="mock_submission", text=approval.proposed_content)

    # Log approval
    log = ActivityLog(
        agent_id=approval.agent_id,
        action_type=f"approved:{approval.action_type}",
        status="success",
        details=f"Approved by user {current_user.email}: {approval.proposed_content[:100]}"
    )
    db.add(log)
    await db.commit()
    await db.refresh(approval)
    return approval

@router.post("/{approval_id}/reject", response_model=ApprovalSchema)
async def reject_action(
    *,
    db: Annotated[AsyncSession, Depends(deps.get_db)],
    approval_id: int,
    current_user: Annotated[User, Depends(deps.get_current_active_user)],
) -> Any:
    """
    Reject a pending action request.
    """
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    approval.status = "rejected"
    
    log = ActivityLog(
        agent_id=approval.agent_id,
        action_type=f"rejected:{approval.action_type}",
        status="rejected",
        details=f"Rejected by user {current_user.email}"
    )
    db.add(log)
    await db.commit()
    await db.refresh(approval)
    return approval
