"""High-level Escrow Orchestration Service (`app/payments/escrow.py` - §11.2)."""

from __future__ import annotations

from uuid import UUID

from app.db.models import EscrowHoldModel
from app.db.repositories.ledger import LedgerRepository


class EscrowService:
    """High-level service coordinating wallet funding, escrow holds, boarding capture, and settlement."""

    def __init__(self, ledger: LedgerRepository | None = None) -> None:
        self.ledger = ledger or LedgerRepository()
        self._processed_webhook_refs: set[str] = set()

    async def fund_and_lock_escrow(
        self,
        *,
        ride_request_id: UUID,
        rider_id: UUID,
        fare_kobo: int,
        payment_ref: str,
    ) -> EscrowHoldModel:
        """Idempotently credit rider wallet from payment ref (if needed) and lock an Escrow Hold."""
        await self.ledger.ensure_system_accounts()
        wallet = await self.ledger.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        if wallet.balance_kobo < fare_kobo:
            shortfall = fare_kobo - wallet.balance_kobo
            await self.ledger.record_topup(
                rider_id=rider_id,
                payment_ref=payment_ref,
                amount_kobo=shortfall,
            )
        hold = await self.ledger.create_escrow_hold(
            ride_request_id=ride_request_id,
            rider_id=rider_id,
            fare_kobo=fare_kobo,
        )
        self._processed_webhook_refs.add(payment_ref)
        return hold

    async def confirm_boarding_otp(self, ride_request_id: UUID) -> EscrowHoldModel:
        """Transition escrow hold from HELD -> CAPTURED when rider boards with 4-digit OTP."""
        return await self.ledger.capture_escrow_on_boarding(ride_request_id)

    async def complete_and_settle_ride(
        self,
        *,
        pod_id: UUID,
        ride_request_id: UUID,
        driver_id: UUID,
    ) -> EscrowHoldModel:
        """Settle a CAPTURED escrow hold: 90% to DRIVER_PAYABLE, 10% to PLATFORM_REVENUE."""
        return await self.ledger.settle_boarded_ride(
            pod_id=pod_id,
            ride_request_id=ride_request_id,
            driver_id=driver_id,
        )

    async def refund_cancelled_ride(self, ride_request_id: UUID) -> EscrowHoldModel:
        """Refund 100% of a HELD escrow back to RIDER_WALLET."""
        return await self.ledger.release_escrow_full_refund(ride_request_id)


_default_escrow_service: EscrowService | None = None


def get_escrow_service() -> EscrowService:
    global _default_escrow_service
    if _default_escrow_service is None:
        _default_escrow_service = EscrowService()
    return _default_escrow_service
