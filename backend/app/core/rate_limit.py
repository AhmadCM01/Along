"""In-memory rate limiter protecting hackathon API credits (app/core/rate_limit.py).

Implements:
- 20 inference requests per IP per hour.
- 400 total inference requests per day globally.
- RFC 9457 Problem Details 429 response when limits are exceeded.
- Excludes /healthz, /api/v1/status, /metrics, and CORS OPTIONS.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter."""

    def __init__(self) -> None:
        self._ip_timestamps: dict[str, list[float]] = defaultdict(list)
        self._global_timestamps: list[float] = []

    def reset(self) -> None:
        """Clear all recorded request timestamps."""
        self._ip_timestamps.clear()
        self._global_timestamps.clear()

    def check(self, client_ip: str, now: float | None = None) -> tuple[bool, str]:
        """Check whether client_ip exceeds hourly or global daily limits.

        Returns (allowed, reason).
        """
        current_time = now if now is not None else time.time()
        one_hour_ago = current_time - 3600.0
        one_day_ago = current_time - 86400.0
        settings = get_settings()

        ip_limit = settings.RATE_LIMIT_IP_PER_HOUR
        global_limit = settings.RATE_LIMIT_GLOBAL_PER_DAY

        # Prune global timestamps older than 24h
        self._global_timestamps = [t for t in self._global_timestamps if t > one_day_ago]
        if len(self._global_timestamps) >= global_limit:
            return False, f"Global rate limit exceeded ({global_limit} requests/day). Credits protected."

        # Prune IP timestamps older than 1h
        ip_ts = [t for t in self._ip_timestamps[client_ip] if t > one_hour_ago]
        self._ip_timestamps[client_ip] = ip_ts
        if len(ip_ts) >= ip_limit:
            return False, f"Per-IP rate limit exceeded ({ip_limit} requests/hour). Please try again later."

        # Record this request
        self._ip_timestamps[client_ip].append(current_time)
        self._global_timestamps.append(current_time)
        return True, ""


_default_limiter = InMemoryRateLimiter()


def get_rate_limiter() -> InMemoryRateLimiter:
    return _default_limiter


def extract_client_ip(request: Request) -> str:
    """Extract real client IP from X-Forwarded-For or client.host."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[0]
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


async def rate_limit_middleware(request: Request, call_next: Any) -> Any:
    """Middleware enforcing credit-protection rate limits on API requests."""
    settings = get_settings()
    is_active = (settings.ENV == "production") or settings.RATE_LIMIT_ENABLED
    if not is_active:
        return await call_next(request)

    path = request.url.path
    # Exclude healthz, status, metrics, and OPTIONS from rate limits
    if request.method == "OPTIONS" or path in ("/healthz", "/api/v1/status", "/metrics"):
        return await call_next(request)

    limiter = get_rate_limiter()
    client_ip = extract_client_ip(request)
    allowed, reason = limiter.check(client_ip)

    if not allowed:
        problem = {
            "type": "https://along.ai/errors/rate-limit-exceeded",
            "title": "Too Many Requests",
            "status": 429,
            "detail": reason,
            "instance": path,
        }
        return JSONResponse(
            status_code=429,
            content=problem,
            media_type="application/problem+json",
        )

    return await call_next(request)
