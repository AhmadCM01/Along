# Along Corridor Transit - API Contract

Authoritative API specification for the frontend and backend integration. The server is the single source of truth for pods, trips, stages, and telemetry.

---

## 1. Global Session and Security Standards

- **Session Header**: `X-Along-Session`
  - Required for session-isolated operations: 16 to 64 characters of `[A-Za-z0-9-]`.
  - If provided and invalid: returns HTTP `400` with `{"code": "INVALID_SESSION_HEADER", "message": "X-Along-Session header must be 16 to 64 alphanumeric or hyphen characters."}`.
  - Allowed in CORS preflight `OPTIONS` requests via `Access-Control-Allow-Headers`.
- **Session Pod Isolation**: Each valid session ID receives its own 4-seat pod (`POD-XXXX`). Sessions never share pods, seats, or state. Sessions idle for more than 2 hours (7200 seconds) are dropped, and total pods are capped at 500 globally.
- **Clock Injection**: Tests inject timestamps using `set_fake_clock(epoch_seconds)` and `reset_fake_clock()`.
- **Secrets & Credentials**: Never transmitted or returned in plain text. Boarding OTPs are validated via constant-time comparison against HMAC-SHA256 hashes bound to request IDs.

---

## 2. Server-Authoritative Stage Lifecycle

For any pod or trip, the stage is computed deterministically from server time:

1. `WAITING_FOR_DRIVER`: Quote generated, booking awaiting confirmation (`confirmed_at is None`).
2. `DRIVER_ON_THE_WAY`: Booking confirmed; driver en route to pickup for `DEMO_DRIVER_ARRIVAL_SECONDS` (default: 8.0s).
3. `BOARDING`: Driver docked at the pickup anchor forecourt awaiting OTP verification.
4. `IN_TRANSIT`: Pod departed (triggered when 4 riders board, or via manual dispatch shortcut with at least 1 boarded rider). Progress advances monotonically from 0.0 to 1.0 over `DEMO_TRIP_SECONDS` (default: 150.0s).
5. `COMPLETED`: Progress reaches 1.0. Simulated escrow is released exactly once (idempotent).

---

## 3. Endpoints

### 3.1 Chat & Booking

- **Method**: `POST`
- **Path**: `/api/v1/demo/chat`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Along-Session`: Optional (16 to 64 chars of `[A-Za-z0-9-]`)
- **Request Fields**:
  - `message_text`: `string` (required, e.g. "From Dutse first gate to Berger, 1 seat")
  - `phone`: `string` (optional, default: `"+2348031234567"`)
  - `audio_fixture_id`: `string | null` (optional, e.g. `"vn_pidgin_lugbe_area1"`)
  - `reset_session`: `boolean` (optional, default: `false`)
  - `is_peak`: `boolean` (optional, default: `false`)
- **Response Fields**:
  - `status`: `string` (`"ok"`)
  - `pane1_whatsapp`: object containing:
    - `stage`: `string` (`"IDLE"`, `"AWAITING_DESTINATION"`, `"AWAITING_CONFIRMATION"`, `"POOLING"`, `"SOS_ACTIVE"`, `"CANCELLED"`)
    - `reply_text`: `string`
    - `locale`: `string` (`"en"`, `"pcm"`, `"ha"`)
    - `boarding_otp`: `string | null` (4-digit code)
    - `share_token`: `string | null`
    - `share_url`: `string | null`
  - `pane2_xray`: object with AI trace, fallback banner, and extraction telemetry
  - `pane3_corridor`: object with corridor details, polyline, and fare in kobo
- **Error Codes**:
  - `400`: `INVALID_SESSION_HEADER`
  - `409`: Pod capacity exceeded (when requested seats exceed available free seats)

---

### 3.2 Booking Confirmation

- **Method**: `POST`
- **Path**: `/api/v1/demo/chat`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Along-Session`: Optional (16 to 64 chars)
- **Request Fields**:
  - `message_text`: `"YES"`
  - `phone`: `string`
- **Response Fields**: Same schema as Chat, with `pane1_whatsapp.stage` set to `"POOLING"`. Sets `confirmed_at` on the session pod and maps the generated `share_token` to `(pod_id, request_id)`.
- **Error Codes**: `400`, `409`.

---

### 3.3 Public Trip Telemetry (Safety Link)

- **Method**: `GET`
- **Path**: `/api/v1/trips/share/{share_token}`
- **Headers**:
  - No session header needed.
  - Not rate-limited.
  - Response header: `Cache-Control: no-store`
- **Response Fields**:
  - `stage`: `string` (`"WAITING_FOR_DRIVER"`, `"DRIVER_ON_THE_WAY"`, `"BOARDING"`, `"IN_TRANSIT"`, `"COMPLETED"`)
  - `stage_label`: `string` (e.g. `"In transit along corridor"`)
  - `progress`: `float` (clamped between `0.0` and `1.0`)
  - `position`: object with `lat`: `float`, `lon`: `float`
  - `previous_waypoint`: `string` (name of waypoint just passed)
  - `next_waypoint`: `string` (name of upcoming waypoint)
  - `eta_seconds`: `integer` (estimated seconds remaining)
  - `pickup`: `string` (origin pickup anchor)
  - `drop`: `string` (destination drop-off landmark)
  - `seats`: `integer` (seats booked by this rider)
  - `boarded_count`: `integer` (number of boarded seats in the pod)
  - `pod_seats_total`: `integer` (`4`)
  - `driver`: object (`full_name`, `profile_note`: `"Demo driver"`, `vehicle_desc`, `plate_number`, `id_on_file`: `true`, `rating`: `4.94`)
  - `plate`: `string` (e.g. `"ABJ-402-AL"`)
  - `escrow_status`: `string` (`"Simulated"`)
  - `sos_active`: `boolean`
  - `server_time`: `float` (server epoch seconds)
  - `departed_at`: `float | null` (epoch seconds when pod entered transit)
- **Error Codes**:
  - `404`: Returned when `share_token` is unknown or expired:
    ```json
    {
      "code": "TRIP_NOT_FOUND",
      "message": "This trip is no longer available. The demo server may have restarted. Book a new ride."
    }
    ```

---

### 3.4 Driver Verify Boarding OTP

- **Method**: `POST`
- **Path**: `/api/v1/drivers/{driver_id}/pods/{pod_id}/verify-otp`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Along-Session`: Optional (routes to session pod)
- **Request Fields**:
  - `ride_request_id`: `string` (specific request ID or `"auto"`)
  - `otp_code`: `string` (4-digit numeric code)
  - `driver_lat`: `float` (driver GPS latitude)
  - `driver_lng`: `float` (driver GPS longitude)
- **Response Fields**:
  - `status`: `string` (`"BOARDED"`)
  - `pod_id`: `string`
  - `driver_id`: `string`
  - `ride_request_id`: `string`
  - `escrow_state`: `string` (`"CAPTURED"`)
  - `pod_status`: `string` (`"BOARDING"` if `< 4` seats boarded; `"IN_TRANSIT"` if all 4 boarded)
  - `boarded_count`: `integer`
- **Error Codes**:
  - `400`: Invalid 4-digit boarding OTP.
  - `404`: No boarding OTP registered for request.
  - `410`: Boarding OTP has expired (30-minute limit).
  - `422`: Driver is outside the 150m anchor geofence.
  - `429`: Maximum OTP attempts (5) exceeded. Verification locked.

---

### 3.5 Start Trip (Demo Dispatch Shortcut)

- **Method**: `POST`
- **Path**: `/api/v1/drivers/{driver_id}/pods/{pod_id}/dispatch`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Along-Session`: Optional
- **Request Fields**: None
- **Response Fields**:
  - `status`: `string` (`"IN_TRANSIT"`)
  - `pod_id`: `string`
  - `departed_at`: `float` (server timestamp)
  - `message`: `string` (`"Pod dispatched"`)
- **Error Codes**:
  - `404`: Pod not found.
  - `409`: Cannot start trip: at least one passenger must be boarded before departing.

---

### 3.6 Co-Riders Fill Shortcut

- **Method**: `POST`
- **Path**: `/api/v1/drivers/{driver_id}/pods/{pod_id}/fill-coriders`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Along-Session`: Optional
- **Request Fields**: None
- **Response Fields**:
  - `status`: `string` (`"ok"`)
  - `pod_id`: `string`
  - `added_count`: `integer`
  - `seats_occupied`: `integer` (`4`)
  - `pod_status`: `string` (`"IN_TRANSIT"`)
- **Rider Labels**: Fills empty seats with `"Rider B"`, `"Rider C"`, `"Rider D"` with `simulated: true`. The primary user booking remains `"Rider A (you)"` with `simulated: false`.

---

### 3.7 Active Pod State

- **Method**: `GET`
- **Path**: `/api/v1/drivers/active-pod`
- **Headers**:
  - `X-Along-Session`: Optional
- **Query Parameters**:
  - `corridor_id`: `string` (default: `"BWR-DUT-WUS"`)
  - `pod_id`: `string | null` (optional)
- **Response Fields**:
  - `status`: `string` (`"ok"`)
  - `pod`: object containing:
    - `pod_id`: `string`
    - `driver_id`: `string`
    - `driver_name`: `string`
    - `plate_number`: `string`
    - `vehicle_desc`: `string`
    - `corridor_id`: `string`
    - `seats_occupied`: `integer`
    - `passengers`: array of passenger objects (`request_id`, `first_name`, `display_name`, `simulated`, `origin`, `destination`, `seats`, `seat_numbers`, `fare_naira`, `otp_code`, `is_boarded`, `is_alighted`, `status`)
    - `status`: `string` (current stage)
    - `stage`: `string`
    - `stage_label`: `string`
    - `progress`: `float`
    - `departed_at`: `float | null`
    - `boarded_requests`: array of string IDs

---

### 3.8 Pod Reset

- **Method**: `POST`
- **Path**: `/api/v1/drivers/active-pod/reset`
- **Headers**:
  - `X-Along-Session`: Optional
- **Query Parameters**:
  - `corridor_id`: `string` (default: `"BWR-DUT-WUS"`)
  - `pod_id`: `string | null` (optional)
- **Response Fields**:
  - `status`: `string` (`"ok"`)
  - `message`: `string` (`"Pod reset to standby"`)
  - `pod_id`: `string`
- **Scope**: Resets only the calling session's pod and trips. The Multi-Rider Lab pod (`POD-LAB`) is isolated and preserved.

---

### 3.9 One-Tap Emergency SOS

- **Method**: `POST`
- **Path**: `/api/v1/trips/share/{share_token}/sos`
- **Headers**: None required
- **Response Fields**:
  - `status`: `string` (`"SOS_ACTIVATED"`)
  - `share_token`: `string`
  - `sos_active`: `boolean` (`true`)
  - `message`: `string` (`"Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service."`)
  - `text`: `string` (`"Demo only. This marks the trip as an emergency in this demo. It does not contact any emergency service."`)
  - `pod_code`: `string`
  - `driver_plate`: `string`
- **Scope**: Sets `sos_active` on that trip only. Other trips in the same pod or on the corridor remain unaffected.
- **Error Codes**:
  - `404`: `TRIP_NOT_FOUND`
