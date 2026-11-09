"""XEROVA AI DEVFORCE — API v1 Router Aggregation."""

from fastapi import APIRouter
from app.api.v1.endpoints import health

api_v1_router = APIRouter()

# Include versioned endpoints
api_v1_router.include_router(health.router)

