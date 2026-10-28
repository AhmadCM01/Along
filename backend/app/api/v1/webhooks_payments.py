"""Paystack Webhook & Escrow Settlement Ingress Router (`app/api/v1/webhooks_payments.py`).

Implements:
- `POST /api/v1/webhooks/paystack`: Constant-time HMAC-SHA512 verification (`x-paystack-signature`),
  Redis idempotency deduplication (`idem:ps:{reference}`), and double-entry wallet top-up + escrow hold.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request

from app.api.v1.webhooks_whatsapp import get_webhook_redis_store
from app.core.config import get_settings
from app.core.security import verify_paystack_signature
from app.payments.escrow import get_escrow_service
from app.redis.keys import idem_paystack_key

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


@router.post("/paystack")
async def receive_paystack_webhook(
    request: Request,
    x_paystack_signature: str | None = Header(default=None, alias="x-paystack-signature"),
    x_along_emulator: str | None = Header(default=None, alias="X-Along-Emulator"),
) -> dict[str, Any]:
    """Verify Paystack HMAC-SHA512 signature and execute idempotent escrow funding."""
    settings = get_settings()
    raw_body = await request.body()

    is_emulator_bypass = (x_along_emulator == "1") and (settings.ENV != "production")
    if not is_emulator_bypass:
        secret = settings.PAYSTACK_SECRET_KEY
        if not verify_paystack_signature(raw_body, x_paystack_signature, secret):
            raise HTTPException(status_code=401, detail="Invalid x-paystack-signature header")

    payload = json.loads(raw_body.decode("utf-8"))
    event_type = str(payload.get("event", ""))
    data = payload.get("data", {})
    reference = str(data.get("reference", ""))
    if not reference:
        raise HTTPException(status_code=400, detail="Missing payment reference")

    redis_store = get_webhook_redis_store(request)
    dedup_key = idem_paystack_key(reference)
    is_first = await redis_store.set(dedup_key, "1", nx=True, ex=172800)
    if not is_first:
        return {
            "status": "ok",
            "reference": reference,
            "deduplicated": True,
        }

    if event_type == "charge.success":
        amount_kobo = int(data.get("amount", 0))
        metadata = data.get("metadata", {})
        rider_id = UUID(str(metadata["rider_id"]))
        ride_request_id = UUID(str(metadata["ride_request_id"]))

        escrow_svc = get_escrow_service()
        hold = await escrow_svc.fund_and_lock_escrow(
            ride_request_id=ride_request_id,
            rider_id=rider_id,
            fare_kobo=amount_kobo,
            payment_ref=reference,
        )
        return {
            "status": "ok",
            "reference": reference,
            "deduplicated": False,
            "escrow_state": hold.state,
            "amount_kobo": hold.amount_kobo,
        }

    return {"status": "ignored", "event": event_type, "reference": reference}
