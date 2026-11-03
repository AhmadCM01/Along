"""Unit tests for credit-protection rate limiter and audio upload limits."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.rate_limit import InMemoryRateLimiter, get_rate_limiter
from app.main import create_app


def test_in_memory_rate_limiter_per_ip_and_global() -> None:
    """Verify per-IP limit (20/hr) and global limit (400/day)."""
    limiter = InMemoryRateLimiter()

    # 1. Per-IP: first 20 requests allowed
    for _ in range(20):
        allowed, reason = limiter.check("192.168.1.1", now=1000.0)
        assert allowed is True
        assert reason == ""

    # 21st request from same IP rejected
    allowed, reason = limiter.check("192.168.1.1", now=1000.0)
    assert allowed is False
    assert "Per-IP rate limit exceeded" in reason

    # Different IP is still allowed
    allowed, reason = limiter.check("192.168.1.2", now=1000.0)
    assert allowed is True

    # After 1 hour, original IP can request again
    allowed, reason = limiter.check("192.168.1.1", now=4601.0)
    assert allowed is True

    # 2. Global limit: test with custom limiter
    global_limiter = InMemoryRateLimiter()
    settings = get_settings()
    global_limit = settings.RATE_LIMIT_GLOBAL_PER_DAY

    for i in range(global_limit):
        allowed, _ = global_limiter.check(f"10.0.{i // 20}.{i % 20}", now=2000.0)
        assert allowed is True

    # Next request from any IP exceeds global limit
    allowed, reason = global_limiter.check("10.99.99.99", now=2000.0)
    assert allowed is False
    assert "Global rate limit exceeded" in reason


def test_rate_limit_middleware_integration_and_exclusions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verify middleware returns 429 problem details on excess and excludes healthz/status."""
    limiter = get_rate_limiter()
    limiter.reset()

    # Enable rate limiting for test
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    get_settings.cache_clear()

    app = create_app()
    client = TestClient(app)

    # Healthz and status are excluded from rate limits
    for _ in range(25):
        h_res = client.get("/healthz")
        assert h_res.status_code == 200
        assert h_res.json()["status"] == "ok"

    # Inference requests to /api/v1/ops/overview count toward rate limit
    for _ in range(20):
        res = client.get("/api/v1/ops/overview", headers={"X-Forwarded-For": "203.0.113.50"})
        assert res.status_code == 200

    # 21st request from same IP returns 429
    blocked = client.get("/api/v1/ops/overview", headers={"X-Forwarded-For": "203.0.113.50"})
    assert blocked.status_code == 429
    assert blocked.headers["content-type"] == "application/problem+json"
    problem = blocked.json()
    assert problem["status"] == 429
    assert "Per-IP rate limit exceeded" in problem["detail"]

    # Healthz is still accessible even after rate limit triggered
    h_after = client.get("/healthz")
    assert h_after.status_code == 200

    # Clean up
    limiter.reset()
    get_settings.cache_clear()


def test_audio_upload_size_and_duration_limits() -> None:
    """Verify audio uploads > 5 MB or > 30s are rejected with 413 or 422."""
    app = create_app()
    client = TestClient(app)

    # Payload larger than 5 MB -> 413
    oversized = b"0" * (5 * 1024 * 1024 + 10)
    res_large = client.post("/api/v1/demo/asr", content=oversized)
    assert res_large.status_code == 413
    assert "5 MB" in res_large.json()["detail"]

    # Duration header > 30s -> 422
    res_long = client.post(
        "/api/v1/demo/asr",
        content=b"RIFF...",
        headers={"X-Audio-Duration-S": "35.5"},
    )
    assert res_long.status_code == 422
    assert "30 seconds" in res_long.json()["detail"]
