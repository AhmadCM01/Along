# Along System Architecture

This document describes the request lifecycle, runtime inference chain, and server-authoritative trip state model for Along.

---

## 1. Request Lifecycle Flowchart

The following flowchart illustrates how conversational rider requests (text or voice) flow through speech recognition, deterministic safety guardrails, the multilingual language understanding fallback chain, hybrid spatial landmark resolution, and booking confirmation:

```mermaid
flowchart TD
    A["Rider Input (Text or Voice Note)"] --> B{"Input Format"}
    B -->|"Voice Note (.ogg)"| C["Speech-to-Text: Whisper via Groq"]
    B -->|"Typed Text"| D["Safety Gate (< 2ms Deterministic Regex)"]
    C --> D
    D -->|"Distress / Injection"| E["SOS Trigger or Security Block"]
    D -->|"Safe Input"| F["Multilingual NLU: Muse Spark Open via Baseten"]
    F -->|"Timeout / Error"| G["Fallback NLU: Llama 3.2 Vision via NVIDIA NIM"]
    G -->|"Timeout / Error"| H["Local Rule-Based Extractor (Abuja Grammar)"]
    F -->|"Structured JSON"| I["Landmark Resolver & Hybrid Search"]
    G -->|"Structured JSON"| I
    H -->|"Structured JSON"| I
    I --> J["FAISS Vector Match (768-D Char n-grams)"]
    J --> K["Jaro-Winkler Similarity & Popularity Reranking"]
    K --> L["Virtual Anchor Point Snap (Safe Forecourt)"]
    L --> M["Fare Matrix Calculation (Zone to Zone in Kobo)"]
    M --> N["Fare Quote & Seat Reservation"]
    N --> O["Booking Confirmation & HMAC Boarding Code"]
```

---

## 2. Live Trip Sequence Diagram

The sequence diagram below shows how the server clock serves as the single source of truth for pods, stages, and telemetry, with driver terminals, rider ride cards, and family trackers polling the same backend state:

```mermaid
sequenceDiagram
    autonumber
    actor Rider as Rider (Browser Session)
    actor Driver as Driver (Terminal)
    participant Server as Server (Pod & Trip State)
    actor Family as Family (Live Tracker)

    Rider->>Server: POST /api/v1/demo/chat (Confirm booking with X-Along-Session)
    Server-->>Rider: Booking confirmed (Random share token, 4-digit boarding OTP)
    Rider->>Family: Sends safety link (https://along-dusky.vercel.app/t/[shareToken])
    Note over Server: Server clock advances: stage = DRIVER_ON_THE_WAY (8s) -> BOARDING
    Driver->>Server: GET /api/v1/drivers/active-pod (Polls pod state via X-Along-Session)
    Server-->>Driver: Returns pod manifest (1 unboarded passenger, stage = BOARDING)
    Driver->>Server: POST /api/v1/drivers/{id}/pods/{pod}/verify-otp (OTP verification)
    Server-->>Driver: Rider verified (Escrow CAPTURED, pod auto-departs when 4 boarded)
    Driver->>Server: POST /api/v1/drivers/{id}/pods/{pod}/dispatch (Demo shortcut)
    Note over Server: Server marks departed_at = now, stage = IN_TRANSIT
    loop Every 2 seconds
        Family->>Server: GET /api/v1/trips/share/{shareToken} (No session header required)
        Note over Server: Telemetry: progress = clamp((now - departed_at) / DEMO_TRIP_SECONDS, 0, 1)
        Note over Server: Interpolates lat/lon along corridor polyline waypoints
        Server-->>Family: Server-authoritative state (progress, lat, lon, stage, demo driver)
    end
    Note over Server: Server clock reaches DEMO_TRIP_SECONDS (progress = 1.0)
    Note over Server: stage = COMPLETED, simulated escrow released exactly once
    Family->>Server: GET /api/v1/trips/share/{shareToken}
    Server-->>Family: stage = COMPLETED, escrow_status = Simulated
```

---

## 3. State Model Summary

- **Session and Pod Isolation**: Each browser session generates an `X-Along-Session` header (16 to 64 characters of `[A-Za-z0-9-]`). The server assigns each session a distinct 4-seat pod (`POD-XXXX`). Sessions never share pods, seats, or state. Idle sessions (inactive for over 2 hours) are evicted, and active pods are capped at 500.
- **Stage Progression**: Stages are derived deterministically on the server: `WAITING_FOR_DRIVER` (unconfirmed quote) -> `DRIVER_ON_THE_WAY` (8 seconds after confirmation) -> `BOARDING` (driver docked at safe anchor forecourt) -> `IN_TRANSIT` (pod departed) -> `COMPLETED` (progress reaches 1.0).
- **Telemetry Derivation**: Vehicle progress is computed as `clamp((now - departed_at) / DEMO_TRIP_SECONDS, 0, 1)`. Latitude and longitude are interpolated along corridor waypoints between pickup and drop-off.
- **Simulated Escrow Release**: When progress reaches 1.0, simulated escrow settlement releases 90% to the driver and 10% to the platform. The release operation is strictly idempotent.
- **In-Memory Volatility**: Demonstration state resides in server memory and resets whenever the free Render instance restarts or redeploys.
