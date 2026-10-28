"""Unit and 200-concurrent-operation invariant tests for P1-T3 (Double-Entry Kobo Ledger)."""

from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from app.core.errors import LedgerImbalanceError
from app.db.models import LedgerEntryInput
from app.db.repositories.ledger import LedgerRepository


@pytest.mark.asyncio
async def test_all_eight_ledger_workflows_and_idempotency() -> None:
    repo = LedgerRepository()
    await repo.ensure_system_accounts()

    rider_id = uuid4()
    driver_id = uuid4()
    pod_id = uuid4()
    rr_boarded = uuid4()
    rr_cancelled = uuid4()
    rr_late = uuid4()
    rr_noshow = uuid4()

    # 1. Top-up 5,000 NGN (500,000 kobo) + idempotent replay check
    j1 = await repo.record_topup(rider_id, "ALGPAY_001", 500000)
    j1_replay = await repo.record_topup(rider_id, "ALGPAY_001", 500000)
    assert j1 == j1_replay

    rider_wallet = await repo.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
    assert (await repo.get_account(rider_wallet.id)).balance_kobo == 500000

    # 2. Escrow Hold #1: Dutse -> Oando (700 NGN = 70,000 kobo) -> Boarded -> Settled
    hold_1 = await repo.create_escrow_hold(rr_boarded, rider_id, 70000)
    assert hold_1.state == "HELD"
    hold_1 = await repo.capture_escrow_on_boarding(rr_boarded)
    assert hold_1.state == "CAPTURED"
    hold_1 = await repo.settle_boarded_ride(pod_id, rr_boarded, driver_id)
    assert hold_1.state == "SETTLED"

    # 3a. Escrow Hold #2: Free Cancel / Full Refund (1,000 NGN = 100,000 kobo)
    await repo.create_escrow_hold(rr_cancelled, rider_id, 100000)
    hold_2 = await repo.release_escrow_full_refund(rr_cancelled)
    assert hold_2.state == "RELEASED"

    # 3b. Escrow Hold #3: Late Cancel after driver assigned (1,200 NGN = 120,000 kobo -> 240 NGN fee)
    await repo.create_escrow_hold(rr_late, rider_id, 120000)
    hold_3 = await repo.apply_late_cancel_penalty(rr_late, driver_id)
    assert hold_3.state == "PARTIAL_CAPTURED"

    # 3c. Escrow Hold #4: Rider No-Show at Forecourt (1,200 NGN = 120,000 kobo -> 600 NGN split)
    await repo.create_escrow_hold(rr_noshow, rider_id, 120000)
    hold_4 = await repo.apply_no_show_penalty(rr_noshow, driver_id)
    assert hold_4.state == "PARTIAL_CAPTURED"

    # 8. Driver Cancel Goodwill Credit (+200 NGN = 20,000 kobo to rider)
    await repo.credit_driver_cancel_goodwill(pod_id, rider_id)

    # Check driver payable balance:
    # 90% of 70,000 (63,000) + 24,000 (late cancel) + 60,000 (no-show) = 147,000 kobo
    # Add another settled ride of 2,000 NGN (200,000 kobo -> 180,000 driver net) so driver can withdraw
    rr_bwari = uuid4()
    await repo.record_topup(rider_id, "ALGPAY_002", 200000)
    await repo.create_escrow_hold(rr_bwari, rider_id, 200000)
    await repo.capture_escrow_on_boarding(rr_bwari)
    await repo.settle_boarded_ride(pod_id, rr_bwari, driver_id)

    # 6 & 7b & 7a. Driver Payout Initiate -> Reverse -> Initiate -> Complete
    await repo.initiate_driver_payout(driver_id, "ALGOUT_FAIL", 250000)
    await repo.reverse_driver_payout(driver_id, "ALGOUT_FAIL", 250000)
    await repo.initiate_driver_payout(driver_id, "ALGOUT_OK", 250000)
    await repo.complete_driver_payout(driver_id, "ALGOUT_OK", 250000)

    # Universal Trial Balance Invariant must be strictly 0
    assert await repo.compute_trial_balance() == 0
    assert await repo.verify_account_balances_match_entries() is True


@pytest.mark.asyncio
async def test_unbalanced_and_negative_balance_journals_rejected() -> None:
    repo = LedgerRepository()
    await repo.ensure_system_accounts()
    rider_id = uuid4()
    wallet = await repo.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
    clearing = await repo.get_or_create_account("PROVIDER_CLEARING")

    # 1. Unbalanced journal rejected
    with pytest.raises(LedgerImbalanceError):
        await repo.post_journal(
            idempotency_key="bad:unbalanced",
            kind="ADJUSTMENT",
            description="Unbalanced test",
            ref_type=None,
            ref_id=None,
            entries=[
                LedgerEntryInput(account_id=clearing.id, amount_kobo=-100000),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=90000),
            ],
        )

    # 2. Negative balance on RIDER_WALLET (allow_negative=False) rejected
    with pytest.raises(LedgerImbalanceError):
        await repo.create_escrow_hold(uuid4(), rider_id, 70000)

    assert await repo.compute_trial_balance() == 0


@pytest.mark.asyncio
async def test_200_concurrent_ledger_postings_trial_balance_zero() -> None:
    """Acceptance Gate P1-T3: 200 concurrent holds/captures/releases/settlements end with trial_balance == 0."""
    repo = LedgerRepository()
    await repo.ensure_system_accounts()
    driver_id = uuid4()
    pod_id = uuid4()

    async def _run_rider_flow(idx: int) -> None:
        rider_id = uuid4()
        rr_id = uuid4()
        fares = [70000, 90000, 100000, 120000, 180000, 200000]
        fare = fares[idx % len(fares)]

        await repo.record_topup(rider_id, f"ALGPAY_CONC_{idx}", fare)
        await repo.create_escrow_hold(rr_id, rider_id, fare)

        mode = idx % 4
        if mode == 0:
            await repo.capture_escrow_on_boarding(rr_id)
            await repo.settle_boarded_ride(pod_id, rr_id, driver_id)
        elif mode == 1:
            await repo.release_escrow_full_refund(rr_id)
        elif mode == 2:
            await repo.apply_late_cancel_penalty(rr_id, driver_id)
        else:
            await repo.apply_no_show_penalty(rr_id, driver_id)

    await asyncio.gather(*(_run_rider_flow(i) for i in range(200)))

    assert await repo.compute_trial_balance() == 0
    assert await repo.verify_account_balances_match_entries() is True
