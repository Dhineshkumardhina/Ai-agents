"""XEROVA AI DEVFORCE — FastAPI Application Entrypoint.

Initializes middleware, routers, exception handlers, and database lifecycle.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger
from app.db.session import check_database_connection, engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and graceful shutdown."""
    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]"
    )
    # Check database connectivity during startup
    db_status = await check_database_connection()
    if db_status["connected"]:
        logger.info(
            f"Connected to PostgreSQL database in {db_status['latency_ms']} ms"
        )
    else:
        logger.warning(
            f"PostgreSQL connection warning on startup: {db_status.get('error')}"
        )

    yield

    logger.info("Gracefully disposing database engine connection pool...")
    await engine.dispose()
    logger.info("Application shutdown complete.")


def create_application() -> FastAPI:
    """Application factory for DEVFORCE Backend."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Autonomous Multi-Agent Software Engineering Workforce Platform",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register centralized exception handlers
    register_exception_handlers(app)

    # Root health endpoint (for Docker / Load Balancer probes)
    @app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
    async def root_health() -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "service": settings.PROJECT_NAME,
                "version": settings.VERSION,
            },
        )

    # Include versioned API routers
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_application()

