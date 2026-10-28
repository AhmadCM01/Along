"""Double-entry kobo ledger and escrow state machine repository (§11 of MASTER_IMPLEMENTATION_PLAN.md).

Supports both PostgreSQL (via asyncpg `post_journal` stored function) and an atomic
asyncio-locked transactional store so all 8 financial workflows can be verified in unit,
integration, and offline demo modes with identical zero-sum and non-negative invariants.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID, uuid4

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore[assignment]

from app.core.config import BusinessRules
from app.core.errors import LedgerImbalanceError
from app.core.money import compute_commission_kobo
from app.db.models import (
    AccountType,
    EscrowHoldModel,
    EscrowState,
    LedgerAccountModel,
    LedgerEntryInput,
    LedgerJournalModel,
)

CREDIT_NORMAL_TYPES: frozenset[AccountType] = frozenset(
    {
        "RIDER_WALLET",
        "DRIVER_WALLET",
        "DRIVER_PAYABLE",
        "ESCROW",
        "PLATFORM_REVENUE",
    }
)
DEBIT_NORMAL_ALLOW_NEGATIVE_TYPES: frozenset[AccountType] = frozenset(
    {
        "PROVIDER_CLEARING",
        "FEES_EXPENSE",
        "PROMO_EXPENSE",
    }
)


class LedgerRepository:
    """Atomic double-entry ledger enforcing zero-sum journals and non-negative liability balances."""

    def __init__(self, pool: asyncpg.Pool | None = None) -> None:
        self._pool = pool
        self._lock = asyncio.Lock()
        self._accounts_by_id: dict[UUID, LedgerAccountModel] = {}
        self._accounts_by_key: dict[tuple[AccountType, UUID | None, UUID | None], UUID] = {}
        self._journals_by_key: dict[str, LedgerJournalModel] = {}
        self._entries: list[tuple[UUID, UUID, int, datetime]] = []
        self._escrow_holds: dict[UUID, EscrowHoldModel] = {}

    async def ensure_system_accounts(self) -> dict[AccountType, LedgerAccountModel]:
        """Ensure singleton system accounts exist."""
        result: dict[AccountType, LedgerAccountModel] = {}
        for acct_type in (
            "PLATFORM_REVENUE",
            "PROVIDER_CLEARING",
            "FEES_EXPENSE",
            "PROMO_EXPENSE",
        ):
            result[acct_type] = await self.get_or_create_account(
                account_type=acct_type,
                owner_id=None,
                ref_id=None,
            )
        return result

    async def get_or_create_account(
        self,
        account_type: AccountType,
        owner_id: UUID | None = None,
        ref_id: UUID | None = None,
    ) -> LedgerAccountModel:
        """Retrieve or create a ledger account with appropriate allow_negative rules."""
        allow_negative = account_type in DEBIT_NORMAL_ALLOW_NEGATIVE_TYPES

        if self._pool is not None:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    select id, type, owner_id, ref_id, currency, balance_kobo, allow_negative
                    from ledger_accounts
                    where type = $1::account_type
                      and owner_id is not distinct from $2
                      and ref_id is not distinct from $3;
                    """,
                    account_type,
                    owner_id,
                    ref_id,
                )
                if row is not None:
                    return LedgerAccountModel(**dict(row))
                created = await conn.fetchrow(
                    """
                    insert into ledger_accounts(type, owner_id, ref_id, allow_negative)
                    values ($1::account_type, $2, $3, $4)
                    on conflict (type, owner_id, ref_id) do update
                      set allow_negative = excluded.allow_negative
                    returning id, type, owner_id, ref_id, currency, balance_kobo, allow_negative;
                    """,
                    account_type,
                    owner_id,
                    ref_id,
                    allow_negative,
                )
                return LedgerAccountModel(**dict(created))

        async with self._lock:
            composite_key = (account_type, owner_id, ref_id)
            existing_id = self._accounts_by_key.get(composite_key)
            if existing_id is not None:
                return self._accounts_by_id[existing_id]
            acct = LedgerAccountModel(
                id=uuid4(),
                type=account_type,
                owner_id=owner_id,
                ref_id=ref_id,
                balance_kobo=0,
                allow_negative=allow_negative,
            )
            self._accounts_by_id[acct.id] = acct
            self._accounts_by_key[composite_key] = acct.id
            return acct

    async def get_account(self, account_id: UUID) -> LedgerAccountModel:
        """Fetch latest state of an account by ID."""
        if self._pool is not None:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    select id, type, owner_id, ref_id, currency, balance_kobo, allow_negative
                    from ledger_accounts where id = $1;
                    """,
                    account_id,
                )
                if row is None:
                    raise KeyError(f"Ledger account not found: {account_id}")
                return LedgerAccountModel(**dict(row))

        async with self._lock:
            acct = self._accounts_by_id.get(account_id)
            if acct is None:
                raise KeyError(f"Ledger account not found: {account_id}")
            return acct.model_copy()

    async def post_journal(
        self,
        idempotency_key: str,
        kind: str,
        description: str,
        ref_type: str | None,
        ref_id: UUID | None,
        entries: Sequence[LedgerEntryInput],
    ) -> UUID:
        """Atomically post a balanced journal, enforcing idempotency, zero-sum, and non-negative balances."""
        if len(entries) < 2:
            raise LedgerImbalanceError("Journal must contain at least 2 entries.")

        for entry in entries:
            if not isinstance(entry.amount_kobo, int) or isinstance(entry.amount_kobo, bool):
                raise TypeError("amount_kobo must be an integer")
            if entry.amount_kobo == 0:
                raise LedgerImbalanceError("Ledger entry amount_kobo cannot be zero.")

        net_sum = sum(e.amount_kobo for e in entries)
        if net_sum != 0:
            raise LedgerImbalanceError(
                f"Journal {idempotency_key!r} is not balanced: sum={net_sum} kobo"
            )

        if self._pool is not None:
            entries_json = json.dumps(
                [{"account_id": str(e.account_id), "amount_kobo": e.amount_kobo} for e in entries]
            )
            async with self._pool.acquire() as conn:
                try:
                    journal_id: UUID = await conn.fetchval(
                        "select post_journal($1, $2, $3, $4, $5, $6::jsonb);",
                        idempotency_key,
                        kind,
                        description,
                        ref_type,
                        ref_id,
                        entries_json,
                    )
                    return journal_id
                except asyncpg.CheckViolationError as exc:
                    raise LedgerImbalanceError(
                        f"Negative balance violation on journal {idempotency_key!r}: {exc}"
                    ) from exc

        async with self._lock:
            existing = self._journals_by_key.get(idempotency_key)
            if existing is not None:
                return existing.id

            # Validate all accounts exist and check projected balances before mutating
            projected_balances: dict[UUID, int] = {}
            for entry in sorted(entries, key=lambda item: str(item.account_id)):
                acct = self._accounts_by_id.get(entry.account_id)
                if acct is None:
                    raise KeyError(f"Unknown ledger account {entry.account_id}")
                base_bal = projected_balances.get(acct.id, acct.balance_kobo)
                new_bal = base_bal + entry.amount_kobo
                if not acct.allow_negative and new_bal < 0:
                    raise LedgerImbalanceError(
                        f"Account {acct.type} ({acct.id}) would become negative ({new_bal} kobo)"
                    )
                projected_balances[acct.id] = new_bal

            now = datetime.now(timezone.utc)
            journal = LedgerJournalModel(
                id=uuid4(),
                idempotency_key=idempotency_key,
                kind=kind,
                description=description,
                ref_type=ref_type,
                ref_id=ref_id,
                created_at=now,
            )
            self._journals_by_key[idempotency_key] = journal

            for entry in entries:
                self._entries.append((journal.id, entry.account_id, entry.amount_kobo, now))

            for acct_id, new_balance in projected_balances.items():
                self._accounts_by_id[acct_id].balance_kobo = new_balance

            return journal.id

    async def record_topup(
        self,
        rider_id: UUID,
        payment_ref: str,
        amount_kobo: int,
    ) -> UUID:
        """1. Rider Top-up: Debit PROVIDER_CLEARING (-T), Credit RIDER_WALLET (+T)."""
        if amount_kobo <= 0:
            raise ValueError("Top-up amount must be positive kobo")
        clearing = await self.get_or_create_account("PROVIDER_CLEARING")
        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        return await self.post_journal(
            idempotency_key=f"topup:{payment_ref}",
            kind="TOPUP",
            description=f"Rider wallet top-up via {payment_ref}",
            ref_type="payment",
            ref_id=rider_id,
            entries=[
                LedgerEntryInput(account_id=clearing.id, amount_kobo=-amount_kobo),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=amount_kobo),
            ],
        )

    async def create_escrow_hold(
        self,
        ride_request_id: UUID,
        rider_id: UUID,
        fare_kobo: int,
    ) -> EscrowHoldModel:
        """2. Escrow Hold: Debit RIDER_WALLET (-F), Credit ESCROW:{rr_id} (+F)."""
        if fare_kobo <= 0:
            raise ValueError("fare_kobo must be positive")
        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        escrow_acct = await self.get_or_create_account(
            "ESCROW", owner_id=rider_id, ref_id=ride_request_id
        )
        journal_id = await self.post_journal(
            idempotency_key=f"hold:{ride_request_id}",
            kind="HOLD",
            description=f"Escrow hold for ride request {ride_request_id}",
            ref_type="ride_request",
            ref_id=ride_request_id,
            entries=[
                LedgerEntryInput(account_id=wallet.id, amount_kobo=-fare_kobo),
                LedgerEntryInput(account_id=escrow_acct.id, amount_kobo=fare_kobo),
            ],
        )
        hold = EscrowHoldModel(
            ride_request_id=ride_request_id,
            rider_id=rider_id,
            amount_kobo=fare_kobo,
            state="HELD",
            hold_journal_id=journal_id,
            updated_at=datetime.now(timezone.utc),
        )
        async with self._lock:
            self._escrow_holds[ride_request_id] = hold
        return hold

    async def capture_escrow_on_boarding(self, ride_request_id: UUID) -> EscrowHoldModel:
        """4. Boarding Confirmed ([I Have Entered]): Transition escrow hold state to CAPTURED."""
        async with self._lock:
            hold = self._escrow_holds.get(ride_request_id)
            if hold is None:
                raise KeyError(f"Escrow hold not found for ride_request_id={ride_request_id}")
            if hold.state == "CAPTURED":
                return hold
            if hold.state != "HELD":
                raise LedgerImbalanceError(
                    f"Cannot capture escrow hold in state {hold.state}"
                )
            hold.state = "CAPTURED"
            hold.updated_at = datetime.now(timezone.utc)
            return hold.model_copy()

    async def release_escrow_full_refund(self, ride_request_id: UUID) -> EscrowHoldModel:
        """3a. Free Cancel / Pod Timeout Refund: 100% of held fare returned to RIDER_WALLET."""
        async with self._lock:
            hold = self._escrow_holds.get(ride_request_id)
            if hold is None:
                raise KeyError(f"Escrow hold not found: {ride_request_id}")
            if hold.state == "RELEASED":
                return hold.model_copy()
            if hold.state != "HELD":
                raise LedgerImbalanceError(
                    f"Cannot full-release escrow hold in state {hold.state}"
                )
            rider_id = hold.rider_id
            fare_kobo = hold.amount_kobo

        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        escrow_acct = await self.get_or_create_account(
            "ESCROW", owner_id=rider_id, ref_id=ride_request_id
        )
        journal_id = await self.post_journal(
            idempotency_key=f"release:{ride_request_id}",
            kind="RELEASE",
            description=f"Full escrow release for {ride_request_id}",
            ref_type="ride_request",
            ref_id=ride_request_id,
            entries=[
                LedgerEntryInput(account_id=escrow_acct.id, amount_kobo=-fare_kobo),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=fare_kobo),
            ],
        )
        async with self._lock:
            hold = self._escrow_holds[ride_request_id]
            hold.state = "RELEASED"
            hold.final_journal_id = journal_id
            hold.updated_at = datetime.now(timezone.utc)
            return hold.model_copy()

    async def apply_late_cancel_penalty(
        self,
        ride_request_id: UUID,
        driver_id: UUID,
    ) -> EscrowHoldModel:
        """3b. Late Cancel After Driver Assigned: clamp(20% F, 200 NGN, 400 NGN) to driver, rest refunded."""
        async with self._lock:
            hold = self._escrow_holds.get(ride_request_id)
            if hold is None:
                raise KeyError(f"Escrow hold not found: {ride_request_id}")
            if hold.state == "PARTIAL_CAPTURED":
                return hold.model_copy()
            if hold.state != "HELD":
                raise LedgerImbalanceError(
                    f"Cannot apply late-cancel penalty in state {hold.state}"
                )
            rider_id = hold.rider_id
            fare_kobo = hold.amount_kobo

        raw_fee = (fare_kobo * BusinessRules.LATE_CANCEL_FEE_BPS) // 10000
        driver_comp_kobo = max(20000, min(40000, raw_fee))
        driver_comp_kobo = min(driver_comp_kobo, fare_kobo)
        refund_kobo = fare_kobo - driver_comp_kobo

        escrow_acct = await self.get_or_create_account(
            "ESCROW", owner_id=rider_id, ref_id=ride_request_id
        )
        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        driver_payable = await self.get_or_create_account("DRIVER_PAYABLE", owner_id=driver_id)

        entries = [
            LedgerEntryInput(account_id=escrow_acct.id, amount_kobo=-fare_kobo),
            LedgerEntryInput(account_id=driver_payable.id, amount_kobo=driver_comp_kobo),
        ]
        if refund_kobo > 0:
            entries.append(LedgerEntryInput(account_id=wallet.id, amount_kobo=refund_kobo))

        journal_id = await self.post_journal(
            idempotency_key=f"late_cancel:{ride_request_id}",
            kind="CAPTURE",
            description=f"Late cancellation split for {ride_request_id}",
            ref_type="ride_request",
            ref_id=ride_request_id,
            entries=entries,
        )
        async with self._lock:
            hold = self._escrow_holds[ride_request_id]
            hold.state = "PARTIAL_CAPTURED"
            hold.final_journal_id = journal_id
            hold.updated_at = datetime.now(timezone.utc)
            return hold.model_copy()

    async def apply_no_show_penalty(
        self,
        ride_request_id: UUID,
        driver_id: UUID,
    ) -> EscrowHoldModel:
        """3c. Rider No-Show at Forecourt: 50% refunded to rider, 50% credited to driver."""
        async with self._lock:
            hold = self._escrow_holds.get(ride_request_id)
            if hold is None:
                raise KeyError(f"Escrow hold not found: {ride_request_id}")
            if hold.state == "PARTIAL_CAPTURED":
                return hold.model_copy()
            if hold.state != "HELD":
                raise LedgerImbalanceError(f"Cannot apply no-show in state {hold.state}")
            rider_id = hold.rider_id
            fare_kobo = hold.amount_kobo

        driver_fee_kobo = (fare_kobo * BusinessRules.NO_SHOW_FEE_BPS) // 10000
        refund_kobo = fare_kobo - driver_fee_kobo

        escrow_acct = await self.get_or_create_account(
            "ESCROW", owner_id=rider_id, ref_id=ride_request_id
        )
        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        driver_payable = await self.get_or_create_account("DRIVER_PAYABLE", owner_id=driver_id)

        journal_id = await self.post_journal(
            idempotency_key=f"noshow:{ride_request_id}",
            kind="CAPTURE",
            description=f"Forecourt no-show 50/50 split for {ride_request_id}",
            ref_type="ride_request",
            ref_id=ride_request_id,
            entries=[
                LedgerEntryInput(account_id=escrow_acct.id, amount_kobo=-fare_kobo),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=refund_kobo),
                LedgerEntryInput(account_id=driver_payable.id, amount_kobo=driver_fee_kobo),
            ],
        )
        async with self._lock:
            hold = self._escrow_holds[ride_request_id]
            hold.state = "PARTIAL_CAPTURED"
            hold.final_journal_id = journal_id
            hold.updated_at = datetime.now(timezone.utc)
            return hold.model_copy()

    async def settle_boarded_ride(
        self,
        pod_id: UUID,
        ride_request_id: UUID,
        driver_id: UUID,
        commission_bps: int = BusinessRules.PLATFORM_COMMISSION_BPS,
    ) -> EscrowHoldModel:
        """5. Trip Completed: Debit ESCROW (-F), Credit DRIVER_PAYABLE (+90% F) & PLATFORM_REVENUE (+10% F)."""
        async with self._lock:
            hold = self._escrow_holds.get(ride_request_id)
            if hold is None:
                raise KeyError(f"Escrow hold not found: {ride_request_id}")
            if hold.state == "SETTLED":
                return hold.model_copy()
            if hold.state != "CAPTURED":
                raise LedgerImbalanceError(
                    f"Cannot settle uncaptured escrow hold (state={hold.state})"
                )
            rider_id = hold.rider_id
            fare_kobo = hold.amount_kobo

        commission_kobo = compute_commission_kobo(fare_kobo, commission_bps)
        driver_net_kobo = fare_kobo - commission_kobo

        escrow_acct = await self.get_or_create_account(
            "ESCROW", owner_id=rider_id, ref_id=ride_request_id
        )
        driver_payable = await self.get_or_create_account("DRIVER_PAYABLE", owner_id=driver_id)
        platform_rev = await self.get_or_create_account("PLATFORM_REVENUE")

        journal_id = await self.post_journal(
            idempotency_key=f"settle:{pod_id}:{ride_request_id}",
            kind="SETTLE",
            description=f"Trip settlement for pod {pod_id} request {ride_request_id}",
            ref_type="pod",
            ref_id=pod_id,
            entries=[
                LedgerEntryInput(account_id=escrow_acct.id, amount_kobo=-fare_kobo),
                LedgerEntryInput(account_id=driver_payable.id, amount_kobo=driver_net_kobo),
                LedgerEntryInput(account_id=platform_rev.id, amount_kobo=commission_kobo),
            ],
        )
        async with self._lock:
            hold = self._escrow_holds[ride_request_id]
            hold.state = "SETTLED"
            hold.final_journal_id = journal_id
            hold.updated_at = datetime.now(timezone.utc)
            return hold.model_copy()

    async def initiate_driver_payout(
        self,
        driver_id: UUID,
        payout_ref: str,
        amount_kobo: int,
    ) -> UUID:
        """6. Driver Payout Initiated: Debit DRIVER_PAYABLE (-X), Credit DRIVER_WALLET (+X)."""
        if amount_kobo < BusinessRules.MIN_DRIVER_PAYOUT_KOBO:
            raise ValueError(
                f"Payout {amount_kobo} kobo is below minimum {BusinessRules.MIN_DRIVER_PAYOUT_KOBO}"
            )
        payable = await self.get_or_create_account("DRIVER_PAYABLE", owner_id=driver_id)
        wallet = await self.get_or_create_account("DRIVER_WALLET", owner_id=driver_id)
        return await self.post_journal(
            idempotency_key=f"payout_init:{payout_ref}",
            kind="PAYOUT",
            description=f"Lock driver payout {payout_ref}",
            ref_type="payout",
            ref_id=driver_id,
            entries=[
                LedgerEntryInput(account_id=payable.id, amount_kobo=-amount_kobo),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=amount_kobo),
            ],
        )

    async def complete_driver_payout(
        self,
        driver_id: UUID,
        payout_ref: str,
        amount_kobo: int,
    ) -> UUID:
        """7a. Driver Payout Succeeded: Debit DRIVER_WALLET (-X), Credit PROVIDER_CLEARING (+X)."""
        wallet = await self.get_or_create_account("DRIVER_WALLET", owner_id=driver_id)
        clearing = await self.get_or_create_account("PROVIDER_CLEARING")
        return await self.post_journal(
            idempotency_key=f"payout_ok:{payout_ref}",
            kind="PAYOUT",
            description=f"Settled driver payout {payout_ref}",
            ref_type="payout",
            ref_id=driver_id,
            entries=[
                LedgerEntryInput(account_id=wallet.id, amount_kobo=-amount_kobo),
                LedgerEntryInput(account_id=clearing.id, amount_kobo=amount_kobo),
            ],
        )

    async def reverse_driver_payout(
        self,
        driver_id: UUID,
        payout_ref: str,
        amount_kobo: int,
    ) -> UUID:
        """7b. Driver Payout Failed/Reversed: Debit DRIVER_WALLET (-X), Credit DRIVER_PAYABLE (+X)."""
        wallet = await self.get_or_create_account("DRIVER_WALLET", owner_id=driver_id)
        payable = await self.get_or_create_account("DRIVER_PAYABLE", owner_id=driver_id)
        return await self.post_journal(
            idempotency_key=f"payout_rev:{payout_ref}",
            kind="PAYOUT",
            description=f"Reversed failed driver payout {payout_ref}",
            ref_type="payout",
            ref_id=driver_id,
            entries=[
                LedgerEntryInput(account_id=wallet.id, amount_kobo=-amount_kobo),
                LedgerEntryInput(account_id=payable.id, amount_kobo=amount_kobo),
            ],
        )

    async def credit_driver_cancel_goodwill(
        self,
        pod_id: UUID,
        rider_id: UUID,
        goodwill_kobo: int = BusinessRules.DRIVER_CANCEL_GOODWILL_KOBO,
    ) -> UUID:
        """8. Driver No-Show Goodwill Credit: Debit PROMO_EXPENSE (-20000), Credit RIDER_WALLET (+20000)."""
        promo = await self.get_or_create_account("PROMO_EXPENSE")
        wallet = await self.get_or_create_account("RIDER_WALLET", owner_id=rider_id)
        return await self.post_journal(
            idempotency_key=f"goodwill:{pod_id}:{rider_id}",
            kind="PROMO",
            description=f"Driver cancellation goodwill credit for pod {pod_id}",
            ref_type="pod",
            ref_id=pod_id,
            entries=[
                LedgerEntryInput(account_id=promo.id, amount_kobo=-goodwill_kobo),
                LedgerEntryInput(account_id=wallet.id, amount_kobo=goodwill_kobo),
            ],
        )

    async def compute_trial_balance(self) -> int:
        """Return sum of all ledger_entries.amount_kobo (must equal 0 at all times)."""
        if self._pool is not None:
            async with self._pool.acquire() as conn:
                val = await conn.fetchval(
                    "select coalesce(must_be_zero, 0) from v_ledger_trial_balance;"
                )
                return int(val or 0)

        async with self._lock:
            return sum(item[2] for item in self._entries)

    async def verify_account_balances_match_entries(self) -> bool:
        """Verify every ledger_account.balance_kobo equals the sum of its ledger_entries."""
        async with self._lock:
            sums_by_acct: dict[UUID, int] = {acct_id: 0 for acct_id in self._accounts_by_id}
            for _journal_id, acct_id, amount_kobo, _ts in self._entries:
                sums_by_acct[acct_id] = sums_by_acct.get(acct_id, 0) + amount_kobo
            for acct_id, acct in self._accounts_by_id.items():
                if acct.balance_kobo != sums_by_acct.get(acct_id, 0):
                    return False
            return True
