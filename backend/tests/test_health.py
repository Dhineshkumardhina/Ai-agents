"""Unit tests for root and versioned health endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_health_endpoint(client: AsyncClient):
    """Verifies that the root /health endpoint responds with 200 OK."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_api_v1_health_endpoint(client: AsyncClient):
    """Verifies that the /api/v1/health endpoint responds with full system health."""
    response = await client.get("/api/v1/health")
    # Endpoint returns 200 (if connected) or 503 (if DB offline)
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "project" in data
    assert "version" in data
    assert "database" in data
    assert "connected" in data["database"]
    assert "latency_ms" in data["database"]

