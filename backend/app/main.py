"""FastAPI application entrypoint with RFC 9457 Problem Details error handling and health telemetry."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.api.v1.demo_emulator import router as demo_emulator_router
from app.api.v1.driver_ussd import router as driver_ussd_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.ops import router as ops_router
from app.api.v1.status import router as status_router
from app.api.v1.trips_public import router as trips_public_router
from app.api.v1.webhooks_payments import router as payments_webhook_router
from app.api.v1.webhooks_whatsapp import router as whatsapp_webhook_router
from app.core.config import get_settings
from app.core.errors import AlongDomainError
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import rate_limit_middleware
from app.core.telemetry import metrics
from scripts.seed import load_abuja_seed_catalog

logger = get_logger("along.api")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Initialize logging and preload Abuja 6-corridor seed catalog on startup."""
    settings = get_settings()
    configure_logging(json_logs=(settings.ENV == "production"))
    catalog = load_abuja_seed_catalog()
    logger.info(
        "along_api_started",
        corridors=len(catalog.corridors),
        anchors=len(catalog.anchors),
        landmarks=len(catalog.landmarks),
        aliases=catalog.total_aliases,
    )
    yield


def create_app() -> FastAPI:
    """Construct and configure the Along FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title="Along Corridor Transit API",
        version="1.0.0",
        description="AI-orchestrated shared urban corridor transit platform for Abuja, Nigeria.",
        lifespan=lifespan,
    )

    if settings.ENV == "production":
        origins = [o.strip() for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
        if not origins:
            origins = ["https://along.vercel.app", "http://localhost:3000", "http://localhost:3001"]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.middleware("http")(rate_limit_middleware)

    @app.exception_handler(AlongDomainError)
    async def handle_domain_error(_request: Request, exc: AlongDomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content=exc.to_problem_json(),
            media_type="application/problem+json",
        )

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        """Fast, lightweight health check probe for load balancers, Render, and uptime monitors."""
        return {
            "status": "ok",
            "version": "1.0.0",
        }

    @app.get("/metrics", response_class=PlainTextResponse)
    async def prometheus_metrics() -> str:
        return metrics.render_prometheus()

    app.include_router(whatsapp_webhook_router)
    app.include_router(payments_webhook_router)
    app.include_router(drivers_router)
    app.include_router(driver_ussd_router)
    app.include_router(trips_public_router)
    app.include_router(ops_router)
    app.include_router(status_router)
    app.include_router(demo_emulator_router)

    return app


app = create_app()
