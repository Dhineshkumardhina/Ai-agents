"""XEROVA AI DEVFORCE — Health Endpoint Implementations."""

import datetime
import time
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.session import check_database_connection
from app.schemas.health import DatabaseHealth, SystemHealthResponse

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get(
    "/health",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Detailed system and database health check",
)
async def health_check() -> JSONResponse:
    """Performs deep health check across application and PostgreSQL database."""
    db_result = await check_database_connection()

    db_health = DatabaseHealth(
        connected=bool(db_result["connected"]),
        status="healthy" if db_result["connected"] else "unhealthy",
        latency_ms=float(db_result["latency_ms"]),
        error=str(db_result["error"]) if "error" in db_result else None,
    )

    is_healthy = db_health.connected
    overall_status = "healthy" if is_healthy else "degraded"
    status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    payload = SystemHealthResponse(
        status=overall_status,
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        uptime_seconds=round(time.time() - START_TIME, 2),
        database=db_health,
    )

    return JSONResponse(status_code=status_code, content=payload.model_dump())

