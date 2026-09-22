from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.db.database import engine, SessionLocal
from app.db.base_class import Base
from app.models.user import User
from sqlalchemy import select
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed admin user if missing
    async with SessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "admin@platform.com"))
        if not res.scalars().first():
            admin = User(
                email="admin@platform.com",
                hashed_password=hash_password("admin123"),
                full_name="Platform Admin",
                is_active=True,
                is_superuser=True
            )
            db.add(admin)
            await db.commit()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Set CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to the Multi-Agent Platform API"}
