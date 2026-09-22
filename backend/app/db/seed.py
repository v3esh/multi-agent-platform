import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import SessionLocal
from app.core import security
from app.models.user import User
from app.models.agent import Agent
from app.models.persona import Persona
from app.models.approval import Approval

async def seed_db():
    async with SessionLocal() as db:
        # Check if user exists
        res = await db.execute(select(User).where(User.email == "admin@example.com"))
        user = res.scalars().first()
        if not user:
            admin_user = User(
                email="admin@example.com",
                hashed_password=security.get_password_hash("password123"),
                full_name="Admin User",
                is_active=True,
                is_superuser=True
            )
            db.add(admin_user)
            print("Created default admin user: admin@example.com / password123")

        # Check if agents exist
        res = await db.execute(select(Agent))
        agents = res.scalars().all()
        if not agents:
            agent1 = Agent(
                name="Alex (Tech Scout)",
                description="Monitors r/technology and r/programming for AI & Web3 news",
                status="active",
                active_window="09:00-17:00",
                frequency_limit=15
            )
            agent2 = Agent(
                name="Jordan (Crypto Analyst)",
                description="Monitors crypto trends and posts educational insights",
                status="active",
                active_window="24/7",
                frequency_limit=10
            )
            db.add_all([agent1, agent2])
            print("Created sample agents")

        # Check if personas exist
        res = await db.execute(select(Persona))
        personas = res.scalars().all()
        if not personas:
            p1 = Persona(
                name="TechScout_Alex",
                personality="Analytical, forward-thinking, and pragmatic software developer.",
                interests="Artificial Intelligence, Distributed Systems, Open Source Software.",
                communication_style="Constructive, technical, uses concise code examples.",
                behavior="Engages in technical discussions, avoids fluff, provides peer insights."
            )
            p2 = Persona(
                name="Crypto_Jordan",
                personality="Enthusiastic, risk-aware, data-driven crypto researcher.",
                interests="DeFi, Layer-2 Scaling, Zero-Knowledge Proofs, Tokenomics.",
                communication_style="Articulate, optimistic yet balanced, uses data references.",
                behavior="Responds to market trend posts with fundamental analysis."
            )
            db.add_all([p1, p2])
            print("Created sample personas")

        await db.commit()

if __name__ == "__main__":
    asyncio.run(seed_db())
