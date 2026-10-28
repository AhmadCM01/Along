create table riders (
  id              uuid primary key default gen_random_uuid(),
  phone_e164      text not null unique,
  wa_id           text not null unique,                     -- digits only
  display_name    text,
  preferred_locale locale_code not null default 'en',
  consent_at      timestamptz,                              -- NDPA consent captured on first use
  is_blocked      boolean not null default false,
  trust_score     real not null default 0.5,
  rides_completed integer not null default 0,
  no_show_count   integer not null default 0,
  emergency_contact_e164 text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table drivers (
  id              uuid primary key default gen_random_uuid(),
  phone_e164      text not null unique,
  full_name       text not null,
  photo_url       text,
  nin_last4       text,                                     -- never store full NIN in plaintext
  nin_hash        text,                                     -- HMAC-SHA256(NIN, pepper)
  kyc_status      kyc_status not null default 'PENDING',
  kyc_provider_ref text,
  status          driver_status not null default 'OFFLINE',
  device_tier     text not null default 'SMARTPHONE' check (device_tier in ('SMARTPHONE','FEATURE_PHONE')),
  price_band_preference text not null default 'STANDARD' check (price_band_preference in ('STANDARD','PEAK')),
  home_corridor_id text references corridors(id),
  rating_avg      real not null default 5.0,
  rating_count    integer not null default 0,
  strikes_7d      smallint not null default 0,
  paystack_recipient_code text,                             -- RCP_xxx for transfers
  bank_code       text,
  account_number_last4 text,
  push_subscription jsonb,                                  -- Web Push subscription
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table vehicles (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references drivers(id) on delete cascade,
  plate_number    citext not null unique,                   -- 'ABC-123-XY'
  make            text not null,                            -- 'Volkswagen'
  model           text not null,                            -- 'Golf 3'
  color           text not null,
  seats           smallint not null default 4 check (seats >= 4),
  photo_url       text,
  is_primary      boolean not null default true,
  verified        boolean not null default false,
  created_at      timestamptz not null default now()
);

create table driver_documents (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references drivers(id) on delete cascade,
  doc_type        text not null check (doc_type in ('NIN_SLIP','DRIVERS_LICENSE','VEHICLE_PAPERS','SELFIE','LASG_LIKE_FCT_PERMIT')),
  storage_path    text not null,                            -- Supabase Storage private bucket
  status          kyc_status not null default 'PENDING',
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

create table ops_users (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  password_hash   text not null,                            -- argon2id
  role            text not null check (role in ('ops_admin','ops_agent','ops_viewer')),
  created_at      timestamptz not null default now()
);

create table auth_otps (                                      -- driver PWA login OTPs (delivered via WhatsApp auth template)
  id              uuid primary key default gen_random_uuid(),
  phone_e164      text not null,
  code_hash       text not null,
  attempts        smallint not null default 0,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index auth_otps_phone on auth_otps(phone_e164, created_at desc);

create table refresh_tokens (
  id              uuid primary key default gen_random_uuid(),
  subject_type    actor_type not null,
  subject_id      uuid not null,
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);
