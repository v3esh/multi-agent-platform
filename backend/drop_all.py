import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def reset():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    async with engine.begin() as conn:
        await conn.execute(text('DROP TABLE IF EXISTS alembic_version CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS permission CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS permissionprofile CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS activitylog CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS approval CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS redditaccount CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS persona CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS agent CASCADE'))
        await conn.execute(text('DROP TABLE IF EXISTS "user" CASCADE'))
    print('All tables dropped successfully.')
    await engine.dispose()

asyncio.run(reset())
