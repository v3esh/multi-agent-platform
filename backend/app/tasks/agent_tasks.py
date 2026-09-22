import asyncio
from datetime import datetime, time
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.celery_app import celery_app
from app.core.config import settings
from app.models.agent import Agent
from app.models.persona import Persona
from app.models.reddit_account import RedditAccount
from app.models.approval import Approval
from app.models.log import ActivityLog
from app.core.ai_service import ai_service
from app.core.policy_engine import policy_engine
from app.core.reddit_adapter import RedditAdapter

def get_celery_db_session():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, poolclass=NullPool, echo=False)
    return sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)()

def is_within_active_window(window_str: str) -> bool:
    """Check if current local time falls within window string e.g. '09:00-17:00' or '24/7'."""
    if not window_str or window_str.strip().lower() in ["24/7", "all day", "always"]:
        return True
    try:
        parts = window_str.split("-")
        if len(parts) != 2:
            return True
        start_t = datetime.strptime(parts[0].strip(), "%H:%M").time()
        end_t = datetime.strptime(parts[1].strip(), "%H:%M").time()
        now_t = datetime.now().time()
        if start_t <= end_t:
            return start_t <= now_t <= end_t
        else: # Crosses midnight
            return now_t >= start_t or now_t <= end_t
    except Exception:
        return True

async def process_scheduled_agent_cycles() -> dict:
    """
    Core function that iterates through active agents, checks schedule rules,
    synthesizes AI content, and routes through Policy Engine / Approvals.
    """
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    summary = {"total_agents": 0, "evaluated": 0, "queued_approvals": 0, "auto_executed": 0, "skipped": 0, "details": []}

    async with get_celery_db_session() as db:
        res = await db.execute(select(Agent).where(Agent.status == "active"))
        active_agents = res.scalars().all()
        summary["total_agents"] = len(active_agents)

        sample_topics = [
            "AI Agent Frameworks & System Design",
            "Open Source LLMs vs Commercial Models",
            "DeFi Yield Strategies & Layer 2 Scaling",
            "Best Practices in Async Python & Rust",
            "Web3 Identity & Zero Knowledge Proofs"
        ]

        for agent in active_agents:
            # 1. Window Check
            if not is_within_active_window(agent.active_window):
                summary["skipped"] += 1
                summary["details"].append(f"Agent #{agent.id} '{agent.name}': Outside active window ({agent.active_window})")
                continue

            # 2. Daily Frequency Limit Check
            count_res = await db.execute(
                select(func.count(ActivityLog.id))
                .where(ActivityLog.agent_id == agent.id)
                .where(ActivityLog.created_at >= today_start)
            )
            daily_count = count_res.scalar() or 0
            if daily_count >= (agent.frequency_limit or 10):
                summary["skipped"] += 1
                summary["details"].append(f"Agent #{agent.id} '{agent.name}': Daily limit reached ({daily_count}/{agent.frequency_limit})")
                continue

            summary["evaluated"] += 1

            # 3. Get associated Persona
            persona_res = await db.execute(select(Persona).where(Persona.agent_id == agent.id))
            persona_obj = persona_res.scalars().first()
            if not persona_obj:
                all_personas = (await db.execute(select(Persona))).scalars().all()
                persona_obj = random.choice(all_personas) if all_personas else None

            persona_dict = {
                "name": persona_obj.name if persona_obj else agent.name,
                "personality": persona_obj.personality if persona_obj else "Knowledgeable tech commentator",
                "communication_style": persona_obj.communication_style if persona_obj else "Concise and articulate"
            }

            topic = random.choice(sample_topics)
            submission_id = f"t3_{random.randint(1000, 9999)}"

            # 4. Generate AI Content
            generated_comment = await ai_service.generate_content(persona_dict, topic)

            # 5. Route via Policy Engine
            decision = await policy_engine.evaluate_action(db, agent.id, "publish")

            if decision.requires_approval:
                approval = Approval(
                    agent_id=agent.id,
                    action_type="comment",
                    proposed_content=f"[Subreddit Thread: {submission_id}] {generated_comment}",
                    status="pending"
                )
                db.add(approval)
                log = ActivityLog(
                    agent_id=agent.id,
                    action_type="scheduled_comment_queued",
                    status="pending_approval",
                    details=f"Target: {submission_id} | Proposed: {generated_comment[:60]}..."
                )
                db.add(log)
                await db.commit()
                summary["queued_approvals"] += 1
                summary["details"].append(f"Agent #{agent.id} '{agent.name}': Action intercepted by Policy Engine (Queued Approval #{approval.id})")
            else:
                acc_res = await db.execute(select(RedditAccount).where(RedditAccount.agent_id == agent.id))
                account = acc_res.scalars().first()
                token = account.access_token if account else "mock_token"
                adapter = RedditAdapter(token)
                exec_output = await adapter.post_comment(submission_id, generated_comment)

                log = ActivityLog(
                    agent_id=agent.id,
                    action_type="scheduled_comment_posted",
                    status="success",
                    details=f"Posted to {submission_id}: {generated_comment[:60]}..."
                )
                db.add(log)
                await db.commit()
                summary["auto_executed"] += 1
                summary["details"].append(f"Agent #{agent.id} '{agent.name}': Auto-posted comment to {submission_id}")

    return summary

@celery_app.task(name="app.tasks.agent_tasks.run_scheduled_agent_cycles", acks_late=True)
def run_scheduled_agent_cycles() -> dict:
    """Celery Beat scheduled task."""
    return asyncio.run(process_scheduled_agent_cycles())

@celery_app.task(name="app.tasks.agent_tasks.execute_agent_action", acks_late=True)
def execute_agent_action(agent_id: int, action_type: str, payload: dict) -> dict:
    """Celery task for single agent action execution."""
    async def _run():
        async with get_celery_db_session() as db:
            log = ActivityLog(
                agent_id=agent_id,
                action_type=action_type,
                status="success",
                details=f"Task payload: {payload}"
            )
            db.add(log)
            await db.commit()
            return {"status": "success", "agent_id": agent_id, "action": action_type}
    return asyncio.run(_run())
