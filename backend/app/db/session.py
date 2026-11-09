"""XEROVA AI DEVFORCE — Asynchronous Database Session Management.

Provides connection pooling with SQLAlchemy 2.0 and asyncpg.
"""

from typing import AsyncGenerator
import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings
from app.core.logging import logger

engine: AsyncEngine = create_async_engine(
    settings.async_database_url,
    pool_size=settings.POSTGRES_POOL_SIZE,
    max_overflow=settings.POSTGRES_MAX_OVERFLOW,
    pool_timeout=settings.POSTGRES_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connection() -> dict[str, str | float | bool]:
    """Pings PostgreSQL to verify connectivity and measure latency."""
    start_time = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            val = result.scalar()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if val == 1:
                return {
                    "connected": True,
                    "latency_ms": latency_ms,
                    "status": "healthy",
                }
            return {
                "connected": False,
                "latency_ms": latency_ms,
                "status": "unhealthy",
                "error": "Unexpected query result",
            }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Database health check failed: {exc}")
        return {
            "connected": False,
            "latency_ms": latency_ms,
            "status": "unhealthy",
            "error": str(exc),
        }

