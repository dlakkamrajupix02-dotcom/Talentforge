import asyncio
import traceback
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import JobDescription, User
from app.repository import jd_repository as jd_repo
from uuid import UUID

async def main():
    raw_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    db_url = raw_url.split("?")[0]
    print(f"Connecting to database: {db_url}")
    
    engine = create_async_engine(db_url)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    jd_id = UUID("21d616c3-f2a0-4f80-91b5-1cdd72a39196")
    user_id = UUID("027c9fc5-a178-4ad8-a272-5639e9ded5d2")
    
    async with Session() as db:
        try:
            print("Fetching JobDescription...")
            stmt = select(JobDescription).where(JobDescription.id == jd_id)
            res = await db.execute(stmt)
            jd = res.scalar_one_or_none()
            if not jd:
                print(f"Error: Job description {jd_id} not found in database.")
                return
            
            print(f"Fetched JD: '{jd.title}' (Status: {jd.status})")
            
            print("Attempting to clone...")
            clone = await jd_repo.clone_jd(db, main_jd=jd, creator_id=user_id)
            print(f"Clone successful! New JD ID: {clone.id}")
            
        except Exception as e:
            print("\n--- ERROR TRACEBACK ---")
            traceback.print_exc()
            print("------------------------\n")
            
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
