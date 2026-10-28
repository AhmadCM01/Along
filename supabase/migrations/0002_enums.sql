create type locale_code       as enum ('en','pcm','ha');
create type direction_code    as enum ('S','N');               -- S: Inbound to city center, N: Outbound
create type kyc_status        as enum ('PENDING','IN_REVIEW','APPROVED','REJECTED','SUSPENDED');
create type driver_status     as enum ('OFFLINE','AVAILABLE','QUEUED_AT_ANCHOR','OFFERED','ON_TRIP');
create type request_state     as enum ('DRAFT','AWAITING_PAYMENT','QUEUED','PODDED','ASSIGNED','BOARDED',
                                       'DROPPED','COMPLETED','CANCELLED','EXPIRED','TIMED_OUT','NO_SHOW');
create type pod_state         as enum ('FORMING','OFFERING','ASSIGNED','EN_ROUTE','ARRIVED','BOARDING',
                                       'IN_TRIP','COMPLETED','DISSOLVED','CANCELLED_BY_DRIVER','INCIDENT');
create type offer_state       as enum ('PENDING','ACCEPTED','DECLINED','EXPIRED','CANCELLED');
create type escrow_state      as enum ('HELD','CAPTURED','PARTIAL_CAPTURED','RELEASED','SETTLED');
create type account_type      as enum ('RIDER_WALLET','DRIVER_WALLET','DRIVER_PAYABLE','ESCROW',
                                       'PLATFORM_REVENUE','PROVIDER_CLEARING','FEES_EXPENSE','PROMO_EXPENSE');
create type payment_state     as enum ('INITIALIZED','PENDING','SUCCEEDED','FAILED','ABANDONED','REFUNDED');
create type payout_state      as enum ('QUEUED','PROCESSING','SUCCEEDED','FAILED','REVERSED');
create type landmark_kind     as enum ('JUNCTION','FILLING_STATION','BUS_STOP','BRIDGE','MARKET','TRANSFORMER',
                                       'CHURCH','MOSQUE','SCHOOL','ESTATE_GATE','PLAZA','BANK','OTHER');
create type incident_severity as enum ('LOW','MEDIUM','HIGH','CRITICAL');
create type incident_state    as enum ('OPEN','ACKNOWLEDGED','ESCALATED','RESOLVED','FALSE_ALARM');
create type actor_type        as enum ('RIDER','DRIVER','OPS','SYSTEM');
