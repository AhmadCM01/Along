"""Pydantic schemas for structured intent and slot extraction (`app/ai/schemas.py` - §8.3)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

IntentType = Literal[
    "BOOK_RIDE",
    "PROVIDE_SLOT",
    "CONFIRM_YES",
    "CONFIRM_NO",
    "CHANGE_ORIGIN",
    "CHANGE_DESTINATION",
    "CHECK_STATUS",
    "CANCEL_RIDE",
    "CHECK_WALLET",
    "TOPUP_WALLET",
    "REPORT_SOS",
    "RATE_RIDE",
    "SWITCH_LOCALE",
    "FAQ_OR_HELP",
    "HUMAN_HANDOFF",
    "UNKNOWN",
]

LandmarkKindLiteral = Literal[
    "JUNCTION",
    "FILLING_STATION",
    "BUS_STOP",
    "BRIDGE",
    "MARKET",
    "TRANSFORMER",
    "CHURCH",
    "MOSQUE",
    "SCHOOL",
    "ESTATE_GATE",
    "PLAZA",
    "BANK",
    "OTHER",
]


class RelationalRef(BaseModel):
    """Structured representation of a relational Abuja landmark reference."""

    target_kind: LandmarkKindLiteral | None = None
    ordinal: int = Field(default=1, ge=1, le=5)
    relation: Literal["AFTER", "BEFORE", "OPPOSITE", "NEAR", "UNDER"]
    base_landmark_mention: str


class ExtractionOutput(BaseModel):
    """Strict JSON schema returned by the slot extraction pipeline."""

    detected_locale: Literal["en", "pcm", "ha"] = "en"
    intent: IntentType = "BOOK_RIDE"
    origin_mention: str | None = None
    origin_relational: RelationalRef | None = None
    destination_mention: str | None = None
    destination_relational: RelationalRef | None = None
    direction_hint: Literal["S", "N"] | None = None
    seat_count_requested: int = Field(default=1, ge=1, le=4)
    rating_stars: int | None = Field(default=None, ge=1, le=5)
    has_relational_modifier: bool = False
    safety_passed: bool = True
    safety_reason: str = Field(default="Safe transit message", max_length=200)
    clarifying_question: str | None = None
    conversational_lead: str | None = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    reasoning_brief: str = Field(default="Extracted route slots.", max_length=160)
    model_used: str = Field(default="none")
