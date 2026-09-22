from fastapi import APIRouter
from app.api import auth, agents, personas, reddit, approvals, logs, permissions

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(personas.router, prefix="/personas", tags=["personas"])
api_router.include_router(reddit.router, prefix="/reddit", tags=["reddit"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
