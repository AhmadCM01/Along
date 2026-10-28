"""RFC 9457 Problem Details error hierarchy for API and domain exceptions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AlongDomainError(Exception):
    """Base domain exception mapped cleanly to RFC 9457 application/problem+json."""

    code: str
    title: str
    detail: str
    status: int = 400
    extra: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return f"[{self.code}] {self.title}: {self.detail}"

    def to_problem_json(self, trace_id: str | None = None) -> dict[str, Any]:
        slug = self.code.lower().replace("_", "-")
        body: dict[str, Any] = {
            "type": f"https://along.ai/errors/{slug}",
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
            "code": self.code,
        }
        if trace_id:
            body["trace_id"] = trace_id
        if self.extra:
            body.update(self.extra)
        return body


class OfferExpiredError(AlongDomainError):
    """Raised when a driver attempts to accept an expired or reassigned pod offer."""

    def __init__(self, detail: str = "Offer expired and was reassigned.") -> None:
        super().__init__(
            code="OFFER_EXPIRED",
            title="Pod Offer Expired",
            detail=detail,
            status=409,
        )


class ShortTripError(AlongDomainError):
    """Raised when origin and destination are closer than MIN_TRIP_DISTANCE_M (800m)."""

    def __init__(self, distance_m: int) -> None:
        super().__init__(
            code="SHORT_TRIP_ERROR",
            title="Origin and Destination Too Close",
            detail=f"Trip distance ({distance_m}m) is below the 800m minimum for Along pooling.",
            status=422,
            extra={"distance_m": distance_m},
        )


class LedgerImbalanceError(AlongDomainError):
    """Raised when a journal's signed entries do not sum to zero or violate non-negative constraints."""

    def __init__(self, detail: str) -> None:
        super().__init__(
            code="LEDGER_INVARIANT_VIOLATION",
            title="Ledger Invariant Violation",
            detail=detail,
            status=409,
        )


class GeofenceViolationError(AlongDomainError):
    """Raised when a driver marks arrived outside the anchor's geofence radius."""

    def __init__(self, distance_m: float, limit_m: int) -> None:
        super().__init__(
            code="GEOFENCE_VIOLATION",
            title="Outside Forecourt Geofence",
            detail=f"Driver is {int(distance_m)}m from anchor; must be within {limit_m}m.",
            status=409,
            extra={"distance_m": round(distance_m, 1), "limit_m": limit_m},
        )
