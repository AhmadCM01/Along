"""Pydantic row models representing PostgreSQL / PostGIS domain entities."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

LocaleCode = Literal["en", "pcm", "ha"]
DirectionCode = Literal["S", "N"]
SeatLabel = Literal["FRONT", "BACK_LEFT", "BACK_MIDDLE", "BACK_RIGHT"]
AccountType = Literal[
    "RIDER_WALLET",
    "DRIVER_WALLET",
    "DRIVER_PAYABLE",
    "ESCROW",
    "PLATFORM_REVENUE",
    "PROVIDER_CLEARING",
    "FEES_EXPENSE",
    "PROMO_EXPENSE",
]
EscrowState = Literal["HELD", "CAPTURED", "PARTIAL_CAPTURED", "RELEASED", "SETTLED"]


class GeoPoint(BaseModel):
    """WGS84 geographic coordinate."""

    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class CorridorModel(BaseModel):
    """Directed urban transit corridor."""

    id: str
    name: str
    length_m: int
    is_active: bool = True
    coordinates: list[tuple[float, float]] = Field(
        default_factory=list,
        description="List of (lng, lat) vertices oriented southbound/inbound (S)",
    )


class FareZoneModel(BaseModel):
    """Linear fare zone along a corridor."""

    id: str
    corridor_id: str
    name: str
    seq_order: int
    start_km_m: int
    end_km_m: int


class FareMatrixRowModel(BaseModel):
    """Origin-Destination zone pricing row in integer kobo."""

    corridor_id: str
    origin_zone_id: str
    dest_zone_id: str
    street_min_kobo: int
    street_max_kobo: int
    standard_fare_kobo: int
    peak_fare_kobo: int
    solo_ridehail_est_kobo: int
    distance_km_est: float
    commission_bps: int = 1000
    is_active: bool = True


class AnchorPointModel(BaseModel):
    """Private commercial forecourt pickup anchor (Agbero-free)."""

    id: str
    corridor_id: str
    zone_id: str
    direction: DirectionCode
    name: str
    short_name: str
    lat: float
    lng: float
    km_marker: int
    geofence_m: int = 150
    partner_name: str | None = None
    instructions: dict[str, str] = Field(default_factory=dict)
    capacity_pods: int = 2
    is_active: bool = True
    verified: bool = False


class LandmarkModel(BaseModel):
    """Named or colloquial Abuja landmark along a corridor."""

    id: str
    corridor_id: str
    zone_id: str
    canonical_name: str
    kind: str
    lat: float
    lng: float
    km_marker: int
    side: DirectionCode | None = None
    area: str | None = None
    popularity: float = 0.5
    is_drop_point: bool = True
    verified: bool = False
    aliases: list[tuple[str, LocaleCode, float]] = Field(default_factory=list)


class LedgerAccountModel(BaseModel):
    """Double-entry ledger account in integer kobo."""

    id: UUID
    type: AccountType
    owner_id: UUID | None = None
    ref_id: UUID | None = None
    currency: str = "NGN"
    balance_kobo: int = 0
    allow_negative: bool = False


class LedgerEntryInput(BaseModel):
    """Single signed entry in a journal posting (+credit / -debit)."""

    account_id: UUID
    amount_kobo: int


class LedgerJournalModel(BaseModel):
    """Immutable double-entry journal header."""

    id: UUID
    idempotency_key: str
    kind: str
    description: str | None = None
    ref_type: str | None = None
    ref_id: UUID | None = None
    created_at: datetime


class EscrowHoldModel(BaseModel):
    """Rider escrow hold record tied to a specific ride request."""

    ride_request_id: UUID
    rider_id: UUID
    amount_kobo: int
    state: EscrowState = "HELD"
    hold_journal_id: UUID
    final_journal_id: UUID | None = None
    updated_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
