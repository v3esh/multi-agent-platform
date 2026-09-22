"""Seed script: create initial superuser if not exists."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import os, sys

sys.path.insert(0, "/app")
from app.models.user import User

DATABASE_URL = (
    f"postgresql+asyncpg://"
    f"{os.getenv('POSTGRES_USER','admin')}:{os.getenv('POSTGRES_PASSWORD','password')}"
    f"@{os.getenv('POSTGRES_SERVER','db')}:{os.getenv('POSTGRES_PORT','5432')}"
    f"/{os.getenv('POSTGRES_DB','multiagent')}"
)

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

def hash_password(password: str) -> str:
    """Hash using bcrypt directly to avoid passlib version issues."""
    import bcrypt
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

async def seed():
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "admin@platform.com"))
        existing = result.scalars().first()
        if existing:
            print("Admin user already exists.")
            return
        admin = User(
            email="admin@platform.com",
            hashed_password=hash_password("admin123"),
            full_name="Platform Admin",
            is_active=True,
            is_superuser=True,
        )
        session.add(admin)
        await session.commit()
        print("✅ Admin user created: admin@platform.com / admin123")

asyncio.run(seed())
