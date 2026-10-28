create table corridors (
  id              text primary key,                         -- 'BWR-DUT-WUS', 'ZUB-KUB-WUS', 'ZUB-DEI-DUT', 'ZUB-KRM-JAB', 'GWL-LUG-AR1', 'MRB-NYA-CEN'
  name            text not null,                            -- 'Bwari <-> Dutse <-> Berger <-> Wuse / Central Area'
  path_s          geography(LineString,4326) not null,      -- polyline oriented S (inbound to city center)
  length_m        integer not null,
  is_active       boolean not null default true,
  service_start   time not null default '05:30',
  service_end     time not null default '22:00',
  created_at      timestamptz not null default now()
);

create table fare_zones (
  id              text primary key,                         -- 'ZONE-BWR', 'ZONE-DUT', 'ZONE-KAT-OAN', 'ZONE-WUS', etc.
  corridor_id     text not null references corridors(id),
  name            text not null,                            -- 'Katampe Ext / Oando Bridge Axis'
  seq_order       smallint not null,                        -- order along corridor S (1..N)
  start_km_m      integer not null,
  end_km_m        integer not null,
  created_at      timestamptz not null default now()
);
create index fare_zones_corr on fare_zones(corridor_id, seq_order);

create table anchor_points (
  id              text primary key,                         -- 'ANC-DUT-01'
  corridor_id     text not null references corridors(id),
  zone_id         text not null references fare_zones(id),
  direction       direction_code not null,                  -- side of carriageway / boarding direction
  name            text not null,                            -- 'A.A. Rano Filling Station (Dutse, southbound)'
  short_name      text not null,                            -- 'A.A. Rano Dutse'
  location        geography(Point,4326) not null,
  km_marker       integer not null,                         -- metres along path_s
  geofence_m      integer not null default 150,
  partner_name    text,                                     -- station operator
  partner_contact text,
  instructions    jsonb not null default '{}'::jsonb,       -- {"en": "...", "pcm": "...", "ha": "..."} walking/wait instructions
  photo_url       text,
  capacity_pods   smallint not null default 2,              -- simultaneous pods the forecourt can host
  is_active       boolean not null default true,
  verified        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index anchor_points_geo on anchor_points using gist(location);
create index anchor_points_corr on anchor_points(corridor_id, direction) where is_active;

create table landmarks (
  id              text primary key,                         -- 'LMK-DUT-FG', 'LMK-OAN-KAT'
  corridor_id     text not null references corridors(id),
  zone_id         text not null references fare_zones(id),
  canonical_name  text not null,                            -- 'Oando Filling Station (After Katampe Ext Bridge)'
  kind            landmark_kind not null,
  location        geography(Point,4326) not null,
  km_marker       integer not null,
  side            direction_code,                           -- null = both sides / centre
  area            text,                                     -- 'Katampe Extension / Gwarinpa Border'
  popularity      real not null default 0.5,                -- prior in [0,1], updated from usage
  is_drop_point   boolean not null default false,           -- valid destination drop-off
  verified        boolean not null default false,
  source          text not null default 'seed',             -- seed|osm|field|ops
  created_at      timestamptz not null default now()
);
create index landmarks_geo on landmarks using gist(location);
create index landmarks_kind_km on landmarks(corridor_id, kind, km_marker);

create table landmark_aliases (
  id              bigserial primary key,
  landmark_id     text not null references landmarks(id) on delete cascade,
  alias           text not null,                            -- 'first gate', 'Dutse 1st gate', 'gate one', 'kofar farko'
  locale          locale_code,
  weight          real not null default 1.0,
  created_at      timestamptz not null default now(),
  unique (landmark_id, alias)
);
create index landmark_aliases_trgm on landmark_aliases using gin (alias gin_trgm_ops);

create table landmark_index_versions (
  version         text primary key,                         -- sha256 of alias set + model id
  embedding_model text not null,
  dim             integer not null,
  n_vectors       integer not null,
  artifact_path   text not null,
  built_at        timestamptz not null default now(),
  is_current      boolean not null default false
);
create unique index one_current_index on landmark_index_versions(is_current) where is_current;
