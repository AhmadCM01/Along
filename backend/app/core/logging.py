"""Structured JSON logging configuration using structlog (with stdlib fallback)."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

try:
    import structlog
except ImportError:
    structlog = None  # type: ignore[assignment]


class _FallbackBoundLogger:
    """Lightweight structured logger fallback when structlog is not installed."""

    def __init__(self, name: str) -> None:
        self._logger = logging.getLogger(name)

    def info(self, event: str, **kw: Any) -> None:
        self._logger.info("%s %s", event, json.dumps(kw, default=str))

    def warning(self, event: str, **kw: Any) -> None:
        self._logger.warning("%s %s", event, json.dumps(kw, default=str))

    def error(self, event: str, **kw: Any) -> None:
        self._logger.error("%s %s", event, json.dumps(kw, default=str))


def configure_logging(json_logs: bool = True, log_level: str = "INFO") -> None:
    """Configure structlog for structured JSON output with trace and latency context."""
    if structlog is None:
        logging.basicConfig(level=getattr(logging, log_level.upper(), logging.INFO))
        return

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    renderer: Any = (
        structlog.processors.JSONRenderer()
        if json_logs
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "along") -> Any:
    """Return a bound structlog logger or fallback logger."""
    if structlog is None:
        return _FallbackBoundLogger(name)
    return structlog.get_logger(name)
