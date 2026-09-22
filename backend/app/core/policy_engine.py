from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.agent import Agent
from app.models.permission import PermissionProfile, Permission

class PolicyDecision:
    def __init__(self, allowed: bool, requires_approval: bool, reason: str):
        self.allowed = allowed
        self.requires_approval = requires_approval
        self.reason = reason

class PolicyEngine:
    """
    Centralized policy enforcement engine.
    Ensures that an agent is allowed to perform a specific action before it is queued or executed.
    """
    
    async def evaluate_action(
        self, db: AsyncSession, agent_id: int, action_type: str
    ) -> PolicyDecision:
        """
        Evaluate if an agent can perform an action.
        """
        # Fetch agent
        result = await db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalars().first()
        
        if not agent:
            return PolicyDecision(False, False, "Agent not found.")
            
        if agent.status != "active":
            return PolicyDecision(False, False, f"Agent is currently {agent.status}.")
            
        # Fetch permission profile rules if assigned
        requires_approval = True
        if agent.permission_profile_id:
            profile_res = await db.execute(select(PermissionProfile).where(PermissionProfile.id == agent.permission_profile_id))
            profile = profile_res.scalars().first()
            if profile:
                perm_res = await db.execute(
                    select(Permission)
                    .where(Permission.profile_id == profile.id)
                    .where(Permission.action_type == action_type)
                )
                perm = perm_res.scalars().first()
                if perm:
                    requires_approval = perm.requires_approval
                elif "Autonomous" in profile.name or "Auto-Post" in profile.name:
                    requires_approval = False
                else:
                    requires_approval = True
        else:
            requires_approval = True if action_type in ["publish", "comment"] else False

        return PolicyDecision(
            allowed=True,
            requires_approval=requires_approval,
            reason="Action evaluated against agent capability policy profile."
        )

policy_engine = PolicyEngine()
