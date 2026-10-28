create table ledger_accounts (
  id                 uuid primary key default gen_random_uuid(),
  type               account_type not null,
  owner_id           uuid,                                  -- rider/driver id; null for system accounts
  ref_id             uuid,                                  -- e.g. ride_request_id for ESCROW sub-accounts
  currency           char(3) not null default 'NGN',
  balance_kobo       bigint not null default 0,             -- denormalized running balance (credit-normal for liabilities)
  allow_negative     boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (type, owner_id, ref_id),
  constraint non_negative check (allow_negative or balance_kobo >= 0)
);

create table ledger_journals (
  id                 uuid primary key default gen_random_uuid(),
  idempotency_key    text not null unique,                  -- e.g. 'hold:{ride_request_id}', 'settle:{pod_id}:{rr_id}'
  kind               text not null,                         -- TOPUP|HOLD|CAPTURE|RELEASE|SETTLE|FEE|PAYOUT|REFUND|PROMO|ADJUSTMENT
  description        text,
  ref_type           text,                                  -- 'ride_request'|'pod'|'payment'|'payout'
  ref_id             uuid,
  created_by         actor_type not null default 'SYSTEM',
  created_at         timestamptz not null default now()
);

create table ledger_entries (
  id                 bigserial primary key,
  journal_id         uuid not null references ledger_journals(id),
  account_id         uuid not null references ledger_accounts(id),
  amount_kobo        bigint not null check (amount_kobo <> 0), -- +credit / -debit (signed convention, see §11.3)
  created_at         timestamptz not null default now()
);
create index ledger_entries_account on ledger_entries(account_id, created_at);

-- Immutability
create or replace function forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'ledger is append-only'; end $$;
create trigger ledger_entries_immutable before update or delete on ledger_entries for each row execute function forbid_mutation();
create trigger ledger_journals_immutable before update or delete on ledger_journals for each row execute function forbid_mutation();

-- Atomic posting function: validates zero-sum, updates balances, enforces non-negative.
-- p_entries: jsonb array of {"account_id": uuid, "amount_kobo": bigint}
create or replace function post_journal(p_key text, p_kind text, p_desc text,
                                        p_ref_type text, p_ref_id uuid, p_entries jsonb)
returns uuid language plpgsql as $$
declare v_journal uuid; v_sum bigint; e jsonb;
begin
  select id into v_journal from ledger_journals where idempotency_key = p_key;
  if found then return v_journal; end if;                  -- idempotent replay

  select coalesce(sum((x->>'amount_kobo')::bigint),0) into v_sum from jsonb_array_elements(p_entries) x;
  if v_sum <> 0 then raise exception 'journal % not balanced: %', p_key, v_sum; end if;

  insert into ledger_journals(idempotency_key, kind, description, ref_type, ref_id)
  values (p_key, p_kind, p_desc, p_ref_type, p_ref_id) returning id into v_journal;

  -- lock accounts in deterministic order to avoid deadlocks
  perform 1 from ledger_accounts
   where id in (select (x->>'account_id')::uuid from jsonb_array_elements(p_entries) x)
   order by id for update;

  for e in select * from jsonb_array_elements(p_entries) loop
    insert into ledger_entries(journal_id, account_id, amount_kobo)
    values (v_journal, (e->>'account_id')::uuid, (e->>'amount_kobo')::bigint);
    update ledger_accounts set balance_kobo = balance_kobo + (e->>'amount_kobo')::bigint
     where id = (e->>'account_id')::uuid;                  -- CHECK non_negative fires here
  end loop;
  return v_journal;
end $$;

create table escrow_holds (
  ride_request_id    uuid primary key references ride_requests(id),
  rider_id           uuid not null references riders(id),
  amount_kobo        bigint not null,
  state              escrow_state not null default 'HELD',
  hold_journal_id    uuid not null references ledger_journals(id),
  final_journal_id   uuid references ledger_journals(id),
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  rider_id           uuid not null references riders(id),
  provider           text not null default 'paystack',
  reference          text not null unique,                  -- 'ALGPAY_{ulid}'
  amount_kobo        bigint not null,
  fee_kobo           bigint,
  channel            text,                                  -- card|bank_transfer|ussd|dedicated_nuban
  state              payment_state not null default 'INITIALIZED',
  authorization_url  text,
  purpose            text not null default 'WALLET_TOPUP',
  ride_request_id    uuid references ride_requests(id),     -- auto-hold after top-up if set
  provider_payload   jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table payouts (
  id                 uuid primary key default gen_random_uuid(),
  driver_id          uuid not null references drivers(id),
  reference          text not null unique,                  -- 'ALGOUT_{ulid}'
  amount_kobo        bigint not null,
  transfer_code      text,
  state              payout_state not null default 'QUEUED',
  journal_id         uuid references ledger_journals(id),
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table webhook_events (                               -- inbound webhook idempotency + audit
  id                 bigserial primary key,
  source             text not null check (source in ('whatsapp','paystack','emulator')),
  external_id        text not null,                         -- wamid | paystack event id/reference+event
  payload            jsonb not null,
  received_at        timestamptz not null default now(),
  processed_at       timestamptz,
  error              text,
  unique (source, external_id)
);
