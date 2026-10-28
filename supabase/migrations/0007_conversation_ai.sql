create table messages (                                     -- rider-visible transcript (both directions)
  id                 bigserial primary key,
  rider_id           uuid references riders(id),
  wa_id              text not null,
  direction          text not null check (direction in ('IN','OUT')),
  wamid              text unique,                           -- Meta message id (null for emulator OUT until sent)
  msg_type           text not null,                         -- text|audio|interactive|location|template|system
  body               text,                                  -- text or transcript
  payload            jsonb not null default '{}'::jsonb,
  status             text,                                  -- sent|delivered|read|failed (from status webhooks)
  created_at         timestamptz not null default now()
);
create index messages_wa on messages(wa_id, created_at desc);

create table agent_traces (                                 -- one row per graph node execution
  id                 bigserial primary key,
  thread_id          text not null,
  run_id             uuid not null,                         -- one graph invocation
  node               text not null,
  started_at         timestamptz not null,
  latency_ms         integer not null,
  model              text,
  prompt_version     text,
  input_tokens       integer,
  output_tokens      integer,
  outcome            text,                                  -- ok|retry|escalated|error|clarify
  data               jsonb not null default '{}'::jsonb     -- redacted inputs/outputs, candidate scores
);
create index agent_traces_thread on agent_traces(thread_id, started_at desc);

create table handoffs (                                     -- human-in-the-loop queue
  id                 uuid primary key default gen_random_uuid(),
  rider_id           uuid references riders(id),
  wa_id              text not null,
  reason             text not null,                         -- MAX_CLARIFY|SOS|PAYMENT_DISPUTE|USER_REQUEST|GUARD_BLOCK
  state              text not null default 'OPEN' check (state in ('OPEN','CLAIMED','RESOLVED')),
  claimed_by         uuid references ops_users(id),
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);

create table incidents (
  id                 uuid primary key default gen_random_uuid(),
  pod_id             uuid references pods(id),
  reporter_type      actor_type not null,
  reporter_id        uuid,
  severity           incident_severity not null,
  state              incident_state not null default 'OPEN',
  category           text not null,                         -- SOS|WRONG_VEHICLE|ROUTE_DEVIATION|HARASSMENT|OVERLOAD|OTHER
  description        text,
  last_location      geography(Point,4326),
  created_at         timestamptz not null default now(),
  acknowledged_at    timestamptz,
  resolved_at        timestamptz
);

create table eval_runs (
  id                 uuid primary key default gen_random_uuid(),
  git_sha            text not null,
  suite              text not null,
  config             jsonb not null,
  metrics            jsonb not null,
  passed             boolean not null,
  report_md          text,
  created_at         timestamptz not null default now()
);

create table fare_matrix (
  id                     uuid primary key default gen_random_uuid(),
  corridor_id            text not null references corridors(id),
  origin_zone_id         text not null references fare_zones(id),
  dest_zone_id           text not null references fare_zones(id),
  street_min_kobo        bigint not null,                 -- informal street Along min benchmark
  street_max_kobo        bigint not null,                 -- informal street Along max benchmark
  standard_fare_kobo     bigint not null,                 -- Along off-peak / standard 4-seat fare
  peak_fare_kobo         bigint not null,                 -- Along peak rush-hour / driver upper band
  solo_ridehail_est_kobo bigint not null,                 -- Uber/Bolt solo comparison benchmark
  distance_km_est        real not null,
  commission_bps         integer not null default 1000,   -- 10%
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  unique (corridor_id, origin_zone_id, dest_zone_id)
);
create index fare_matrix_lookup on fare_matrix(corridor_id, origin_zone_id, dest_zone_id) where is_active;

create table pricing_rules (
  id                 uuid primary key default gen_random_uuid(),
  corridor_id        text not null references corridors(id),
  direction          direction_code,
  peak_morning_start time not null default '06:30',
  peak_morning_end   time not null default '09:30',
  peak_evening_start time not null default '16:30',
  peak_evening_end   time not null default '20:00',
  base_fallback_kobo bigint not null default 35000,       -- 350 NGN + per_km_kobo when zone pair unlisted
  per_km_kobo        bigint not null default 5500,        -- 55 NGN/km
  min_fare_kobo      bigint not null default 50000,       -- 500 NGN floor
  commission_bps     integer not null default 1000,
  valid_from         timestamptz not null default now(),
  valid_to           timestamptz,
  created_at         timestamptz not null default now()
);

create table audit_logs (
  id                 bigserial primary key,
  actor_type         actor_type not null,
  actor_id           uuid,
  action             text not null,
  target_type        text,
  target_id          text,
  diff               jsonb,
  ip                 inet,
  created_at         timestamptz not null default now()
);
