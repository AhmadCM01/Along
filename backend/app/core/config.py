"""Application settings and non-negotiable business rule constants."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def is_valid_secret(val: str | None) -> bool:
    """Return True only if val is non-empty and not a placeholder."""
    if not val:
        return False
    cleaned = val.strip()
    if not cleaned:
        return False
    lower = cleaned.lower()
    if "replace_me" in lower or lower in ("test", "your_key_here", "none", "null", "undefined"):
        return False
    return True


class BusinessRules:
    """Authoritative domain constants defined in MASTER_IMPLEMENTATION_PLAN.md Section 2.3."""

    POD_SIZE: int = 4
    PARTIAL_POD_MIN_SIZE: int = 3
    PARTIAL_POD_WAIT_S: int = 480
    POD_MAX_WAIT_S: int = 900
    ANCHOR_SNAP_RADIUS_M: int = 600
    ANCHOR_FALLBACK_RADIUS_M: int = 2500
    ANCHOR_GEOFENCE_M: int = 150
    MIN_TRIP_DISTANCE_M: int = 800
    DRIVER_OFFER_TTL_S: int = 30
    DRIVER_CASCADE_MAX: int = 5
    DRIVER_SEARCH_RADIUS_M: int = 3000
    DRIVER_STALE_HEARTBEAT_S: int = 45
    BOARDING_GRACE_S: int = 180
    OTP_MAX_ATTEMPTS: int = 3
    PLATFORM_COMMISSION_BPS: int = 1000
    LATE_CANCEL_FEE_BPS: int = 2000
    NO_SHOW_FEE_BPS: int = 5000
    DRIVER_CANCEL_GOODWILL_KOBO: int = 20000
    MIN_WALLET_TOPUP_KOBO: int = 50000
    MIN_DRIVER_PAYOUT_KOBO: int = 200000
    MAX_CLARIFY_TURNS: int = 3
    ROUTE_DEVIATION_THRESHOLD_M: int = 800
    AGBERO_AVG_FEE_AVOIDED_KOBO: int = 125000


class Settings(BaseSettings):
    """Environment-backed runtime settings."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", ".env.example", "../.env.example"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: Literal["development", "test", "production"] = "development"
    PUBLIC_BASE_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"
    ALLOW_SIMULATED_GPS: bool = True

    DATABASE_URL: str = "postgresql://along:along_dev_password@localhost:5432/along"
    DIRECT_DATABASE_URL: str = "postgresql://along:along_dev_password@localhost:5432/along"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Primary OpenAI-Compatible LLM Endpoint (default: NVIDIA free tier)
    LLM_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "meta/muse-glimmer-30b"
    LLM_PROVIDER_LABEL: str = "nvidia_free_endpoint"

    # Speech-to-Text Fallback Endpoint (Groq Whisper)
    GROQ_API_KEY: str = ""
    WHISPER_MODEL: str = "whisper-large-v3-turbo"

    # Optional Direct Meta Model API (Disabled when empty)
    META_API_KEY: str = ""
    MODEL_API_KEY: str = ""
    META_MODEL_API_BASE_URL: str = "https://api.meta.ai/v1"

    # Spatial Vector Index Directory
    FAISS_ARTIFACT_DIR: str = "./data/faiss"

    # WhatsApp Integration
    WHATSAPP_TRANSPORT: str = "emulator"
    WHATSAPP_API_VERSION: str = "v21.0"
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_APP_SECRET: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "along_verify_token_2026"

    # Payments
    PAYMENT_PROVIDER: Literal["mock", "paystack"] = "mock"
    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PUBLIC_KEY: str = ""

    # Cryptographic Secrets
    JWT_SECRET_KEY: str = Field(
        default="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    )
    OTP_PEPPER: str = Field(
        default="fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
    )
    NIN_PEPPER: str = Field(
        default="abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
    )
    LOG_HASH_SALT: str = Field(default="0123456789abcdef0123456789abcdef")
    SEED_OPS_PASSWORD: str = Field(default="along_ops_2026!")

    # Web Push
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:ops@along.ai"

    rules: BusinessRules = BusinessRules()

    def get_effective_llm_key(self) -> str | None:
        """Return LLM_API_KEY if valid, else None."""
        return self.LLM_API_KEY.strip() if is_valid_secret(self.LLM_API_KEY) else None

    def get_effective_groq_key(self) -> str | None:
        """Return GROQ_API_KEY if valid, else None."""
        return self.GROQ_API_KEY.strip() if is_valid_secret(self.GROQ_API_KEY) else None

    def get_effective_meta_key(self) -> str | None:
        """Return META_API_KEY or MODEL_API_KEY if valid, else None."""
        if is_valid_secret(self.META_API_KEY):
            return self.META_API_KEY.strip()
        if is_valid_secret(self.MODEL_API_KEY):
            return self.MODEL_API_KEY.strip()
        return None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton Settings instance."""
    return Settings()
