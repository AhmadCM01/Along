"""Paystack & Judge Cockpit Mock Payment Provider (`app/payments/provider.py`)."""

from __future__ import annotations

from uuid import UUID

from app.core.config import get_settings
from app.core.ids import generate_short_code
from app.core.money import format_naira
from app.payments.schemas import PaymentIntentResponse


class PaymentProviderClient:
    """Dual-mode payment provider supporting instant Judge Cockpit mock settlement and Paystack DVA."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def create_payment_intent(
        self,
        *,
        ride_request_id: UUID,
        rider_id: UUID,
        amount_kobo: int,
        payment_ref: str | None = None,
    ) -> PaymentIntentResponse:
        ref = payment_ref or generate_short_code("PAY")
        suffix = str(ride_request_id.int % 10_000_000_000).zfill(10)
        return PaymentIntentResponse(
            payment_ref=ref,
            ride_request_id=ride_request_id,
            rider_id=rider_id,
            amount_kobo=amount_kobo,
            amount_naira=format_naira(amount_kobo),
            provider=self.settings.PAYMENT_PROVIDER,
            bank_name="Paystack-Titan (Along Escrow)",
            account_number=suffix,
            account_name="ALONG ESCROW TRANSIT",
            checkout_url=f"{self.settings.PUBLIC_BASE_URL}/pay/{ref}",
            status="PENDING",
        )
