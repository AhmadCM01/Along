create table ride_requests (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,                  -- 'ALG-4821'
  rider_id           uuid not null references riders(id),
  corridor_id        text not null references corridors(id),
  direction          direction_code not null,
  origin_text        text not null,                         -- raw utterance span
  origin_landmark_id text references landmarks(id),
  anchor_id          text not null references anchor_points(id),
  dest_text          text not null,
  dest_landmark_id   text not null references landmarks(id),
  dest_km_marker     integer not null,
  departure_at       timestamptz,                           -- null = now
  state              request_state not null default 'DRAFT',
  fare_kobo          bigint not null,
  priority           smallint not null default 0,           -- bumped after pod dissolution
  pod_id             uuid,
  seat_label         text check (seat_label in ('FRONT','BACK_LEFT','BACK_MIDDLE','BACK_RIGHT')),
  resolution_meta    jsonb not null default '{}'::jsonb,    -- FAISS scores, candidates, model versions (for audits/evals)
  queued_at          timestamptz,
  boarded_at         timestamptz,
  dropped_at         timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index rr_rider_active on ride_requests(rider_id) where state in ('DRAFT','AWAITING_PAYMENT','QUEUED','PODDED','ASSIGNED','BOARDED');
create unique index rr_one_active_per_rider on ride_requests(rider_id)
  where state in ('AWAITING_PAYMENT','QUEUED','PODDED','ASSIGNED','BOARDED');   -- BR: one live ride per rider
create index rr_pool on ride_requests(corridor_id, direction, anchor_id, state, queued_at);

create table pods (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,                  -- 'POD-7KQ2'
  corridor_id        text not null references corridors(id),
  direction          direction_code not null,
  anchor_id          text not null references anchor_points(id),
  state              pod_state not null default 'FORMING',
  size               smallint not null check (size between 3 and 4),
  is_partial         boolean not null default false,
  driver_id          uuid references drivers(id),
  vehicle_id         uuid references vehicles(id),
  manifest_json      jsonb not null default '[]'::jsonb,    -- 4-seat co-rider manifest (Front, Back L/M/R)
  share_token        text unique,                           -- public trip-share URL token (random 22 chars)
  gross_kobo         bigint not null,
  commission_kobo    bigint not null,
  driver_net_kobo    bigint not null,
  formed_at          timestamptz not null default now(),
  assigned_at        timestamptz,
  arrived_at         timestamptz,
  departed_at        timestamptz,
  completed_at       timestamptz,
  dissolved_reason   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table ride_requests add constraint rr_pod_fk foreign key (pod_id) references pods(id);
create index pods_state on pods(state, corridor_id);
create index pods_driver on pods(driver_id, state);

create table pod_offers (
  id                 uuid primary key default gen_random_uuid(),
  pod_id             uuid not null references pods(id),
  driver_id          uuid not null references drivers(id),
  rank               smallint not null,                     -- cascade order 1..N
  state              offer_state not null default 'PENDING',
  distance_m         integer,
  offered_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  responded_at       timestamptz,
  unique (pod_id, driver_id)
);

create table boarding_otps (
  ride_request_id    uuid primary key references ride_requests(id),
  pod_id             uuid not null references pods(id),
  code_hash          text not null,                         -- HMAC-SHA256(code, OTP_PEPPER || request_id)
  attempts           smallint not null default 0,
  verified_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table trip_events (                                  -- append-only audit/event log
  id                 bigserial primary key,
  pod_id             uuid references pods(id),
  ride_request_id    uuid references ride_requests(id),
  actor              actor_type not null,
  actor_id           uuid,
  event              text not null,                         -- 'POD_FORMED','OFFER_SENT','DRIVER_ARRIVED','RIDER_BOARDED',...
  payload            jsonb not null default '{}'::jsonb,
  location           geography(Point,4326),
  created_at         timestamptz not null default now()
);
create index trip_events_pod on trip_events(pod_id, created_at);

create table driver_locations (                             -- sampled breadcrumbs (every 15 s while ON_TRIP, 60 s otherwise)
  id                 bigserial primary key,
  driver_id          uuid not null references drivers(id),
  pod_id             uuid references pods(id),
  location           geography(Point,4326) not null,
  speed_mps          real,
  heading_deg        real,
  recorded_at        timestamptz not null
);
create index driver_locations_pod on driver_locations(pod_id, recorded_at);

create table ratings (
  id                 uuid primary key default gen_random_uuid(),
  pod_id             uuid not null references pods(id),
  rater_type         actor_type not null,
  rater_id           uuid not null,
  ratee_type         actor_type not null,
  ratee_id           uuid not null,
  stars              smallint not null check (stars between 1 and 5),
  comment            text,
  created_at         timestamptz not null default now(),
  unique (pod_id, rater_id, ratee_id)
);
