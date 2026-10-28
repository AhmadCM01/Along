"""Integer kobo financial arithmetic and Naira edge display formatting."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PodFinancialBreakdown:
    """Immutable financial summary for a pod in integer kobo."""

    gross_kobo: int
    commission_kobo: int
    driver_net_kobo: int


def naira_to_kobo(naira: int) -> int:
    """Convert whole integer Naira to kobo (1 NGN = 100 kobo)."""
    if not isinstance(naira, int) or isinstance(naira, bool):
        raise TypeError("naira must be an integer; float money is forbidden")
    if naira < 0:
        raise ValueError("naira amount cannot be negative")
    return naira * 100


def format_naira(kobo: int, include_symbol: bool = True, show_kobo: bool = False) -> str:
    """Format integer kobo into human-readable Naira string (e.g. '₦1,200')."""
    if not isinstance(kobo, int) or isinstance(kobo, bool):
        raise TypeError("kobo must be an integer; float money is forbidden")
    sign = "-" if kobo < 0 else ""
    abs_kobo = abs(kobo)
    naira_whole = abs_kobo // 100
    rem_kobo = abs_kobo % 100
    prefix = "₦" if include_symbol else ""
    if show_kobo or rem_kobo != 0:
        return f"{sign}{prefix}{naira_whole:,}.{rem_kobo:02d}"
    return f"{sign}{prefix}{naira_whole:,}"


def compute_commission_kobo(gross_kobo: int, commission_bps: int = 1000) -> int:
    """Compute platform commission in integer kobo using half-to-even rounding on basis points."""
    if gross_kobo < 0:
        raise ValueError("gross_kobo cannot be negative")
    if not (0 <= commission_bps <= 10000):
        raise ValueError("commission_bps must be between 0 and 10000")
    return (gross_kobo * commission_bps + 5000) // 10000


def compute_pod_financials(
    member_fares_kobo: list[int],
    commission_bps: int = 1000,
) -> PodFinancialBreakdown:
    """Compute Pod Gross, Platform Commission (10%), and Driver Net (90%) from member fares."""
    if not member_fares_kobo:
        raise ValueError("member_fares_kobo cannot be empty")
    if any(fare <= 0 for fare in member_fares_kobo):
        raise ValueError("Every member fare must be positive integer kobo")
    gross_kobo = sum(member_fares_kobo)
    commission_kobo = compute_commission_kobo(gross_kobo, commission_bps)
    driver_net_kobo = gross_kobo - commission_kobo
    return PodFinancialBreakdown(
        gross_kobo=gross_kobo,
        commission_kobo=commission_kobo,
        driver_net_kobo=driver_net_kobo,
    )
