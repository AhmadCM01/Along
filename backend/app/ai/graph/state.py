"""Conversation State Schema and Redis Session Persistence (`app/ai/graph/state.py` - §8.1)."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.redis.keys import RedisKeys

ConversationStage = Literal[
    "IDLE",
    "AWAITING_ORIGIN",
    "AWAITING_DESTINATION",
    "DISAMBIGUATING_ORIGIN",
    "DISAMBIGUATING_DEST",
    "AWAITING_CONFIRMATION",
    "AWAITING_PAYMENT",
    "POOLING",
    "MATCHED",
    "IN_TRANSIT",
    "SOS_ACTIVE",
    "COMPLETED",
    "CANCELLED",
]


class DisambiguationOption(BaseModel):
    """Candidate landmark option presented during disambiguation."""

    index: int
    landmark_id: str
    canonical_name: str
    corridor_id: str
    zone_id: str
    area: str
    lat: float
    lng: float
    km_marker: int


class ConversationSessionState(BaseModel):
    """Serializable WhatsApp rider conversation state persisted in Redis."""

    wa_id_hash: str
    phone_e164: str = "+2348030000000"
    locale: Literal["en", "pcm", "ha"] = "en"
    stage: ConversationStage = "IDLE"
    turn_count: int = 0
    clarify_turns: int = 0

    # Slot state
    origin_mention: str | None = None
    origin_landmark_id: str | None = None
    origin_name: str | None = None
    origin_zone_id: str | None = None
    origin_lat: float | None = None
    origin_lng: float | None = None
    origin_km_marker: int | None = None

    destination_mention: str | None = None
    destination_landmark_id: str | None = None
    destination_name: str | None = None
    destination_zone_id: str | None = None
    destination_lat: float | None = None
    destination_lng: float | None = None
    destination_km_marker: int | None = None

    corridor_id: str | None = None
    direction: Literal["S", "N"] = "S"
    anchor_id: str | None = None
    anchor_name: str | None = None
    seats: int = Field(default=1, ge=1, le=4)

    # Pricing & Escrow
    unit_fare_kobo: int = 0
    total_fare_kobo: int = 0
    savings_pct: int = 0

    # Active booking / pod references
    request_id: str | None = None
    request_code: str | None = None
    pod_id: str | None = None
    pod_code: str | None = None
    boarding_otp: str | None = None
    share_token: str | None = None

    # Disambiguation options when top-2 candidates are close
    disambiguation_options: list[DisambiguationOption] = Field(default_factory=list)

    # Outbound response and AI X-Ray trace for Judge Cockpit & Ops Console
    last_reply_text: str = ""
    last_buttons: list[dict[str, str]] = Field(default_factory=list)
    xray_trace: dict[str, Any] = Field(default_factory=dict)


SESSION_TTL_SECONDS = 1800  # 30 minutes


async def load_session_state(
    redis_client: Any,
    wa_id_hash: str,
    phone_e164: str = "+2348030000000",
) -> ConversationSessionState:
    """Load `ConversationSessionState` from Redis or initialize a fresh `IDLE` session."""
    key = RedisKeys.wa_session(wa_id_hash)
    raw = await redis_client.get(key)
    if raw:
        try:
            data = json.loads(raw)
            return ConversationSessionState.model_validate(data)
        except Exception:
            pass
    return ConversationSessionState(wa_id_hash=wa_id_hash, phone_e164=phone_e164)


async def save_session_state(
    redis_client: Any,
    state: ConversationSessionState,
) -> None:
    """Persist `ConversationSessionState` to Redis with 30-minute sliding TTL."""
    key = RedisKeys.wa_session(state.wa_id_hash)
    payload = state.model_dump_json()
    await redis_client.set(key, payload, ex=SESSION_TTL_SECONDS)
