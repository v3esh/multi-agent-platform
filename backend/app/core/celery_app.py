from celery import Celery
from app.core.config import settings

# Initialize Celery using Redis as both the message broker and result backend
celery_app = Celery(
    "worker",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    include=["app.tasks.agent_tasks"]
)

# Configure Celery Beat schedule: run agent schedule cycles periodically every 60 seconds
celery_app.conf.beat_schedule = {
    "run-agent-schedules-every-minute": {
        "task": "app.tasks.agent_tasks.run_scheduled_agent_cycles",
        "schedule": 60.0,
    }
}

