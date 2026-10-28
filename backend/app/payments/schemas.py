"""Payment & Escrow Schemas (`app/payments/schemas.py` - §11)."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentIntentResponse(BaseModel):
    """Virtual Account / Payment Checkout details returned when a rider confirms a quote."""

    payment_ref: str
    ride_request_id: UUID
    rider_id: UUID
    amount_kobo: int
    amount_naira: str
    provider: Literal["mock", "paystack"] = "mock"
    bank_name: str = "Along / Titan Paystack"
    account_number: str = "9820411820"
    account_name: str = "ALONG ESCROW TRANSIT"
    checkout_url: str = "https://checkout.paystack.com/along-demo"
    status: Literal["PENDING", "HELD", "CAPTURED", "SETTLED", "RELEASED"] = "PENDING"


class PaystackWebhookPayload(BaseModel):
    """Normalized Paystack `charge.success` / `transfer.success` webhook payload."""

    event: str = Field(..., examples=["charge.success", "transfer.success"])
    data: dict[str, Any]
