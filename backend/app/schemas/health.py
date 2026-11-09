"""XEROVA AI DEVFORCE — Health Schema Definitions."""

from typing import Any, Literal
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    connected: bool
    status: Literal["healthy", "unhealthy"]
    latency_ms: float = Field(description="Query roundtrip time in milliseconds")
    error: str | None = None


class SystemHealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    project: str
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    database: DatabaseHealth

