"""
Database Dependencies for FastAPI route injection
"""
from database import db

async def get_db():
    """Dependency provider for database access."""
    return db
