from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.agent import Agent
from app.tasks.agent_tasks import execute_agent_action

class Scheduler:
    """
    Identifies eligible tasks for agents and places them on the Redis queue via Celery.
    """
    
    async def schedule_eligible_agents(self, db: AsyncSession):
        """
        Periodically runs to check which agents should execute an action right now.
        """
        # Fetch all active agents
        result = await db.execute(select(Agent).where(Agent.status == "active"))
        active_agents = result.scalars().all()
        
        current_hour = datetime.now().hour
        
        for agent in active_agents:
            # Check Active Window (e.g., "09:00-17:00")
            if agent.active_window:
                try:
                    start_str, end_str = agent.active_window.split("-")
                    start_hour = int(start_str.split(":")[0])
                    end_hour = int(end_str.split(":")[0])
                    
                    if not (start_hour <= current_hour < end_hour):
                        continue # Outside active window
                except ValueError:
                    pass # Malformed window, ignore for POC
            
            # Check Frequency Limit (In a real app, query activity_logs to count today's actions)
            # if today_actions >= agent.frequency_limit: continue
            
            # Identify a task based on agent configuration and campaign (mocked action)
            action_type = "search" # Example
            
            # Queue the job to the workers
            # delay() is Celery's method for putting a task on the queue
            execute_agent_action.delay(
                agent_id=agent.id,
                action_type=action_type,
                payload={"query": f"latest topics for agent {agent.name}"}
            )

scheduler = Scheduler()
