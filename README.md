# Along

**The Operating System for Shared Urban Corridor Transit in Africa (Abuja, FCT, Nigeria)**

Along turns Abuja's informal roadside carpooling ("Along") into verified, escrow-backed, 4-seat commuter pods on **WhatsApp** (for riders) and **Dual-Theme Smartphone PWA + 2G Feature-Phone Voice/USSD** (for drivers), loading at safe private filling station forecourts with zero Agbero extortion.

## Architecture Highlights
- **AI Tooling and Orchestration:**
  - **Meta open-weight models:** Powered by open-weight Meta models (such as Muse Glimmer or Llama) via OpenAI-compatible endpoints (`LLM_BASE_URL`) for multilingual entity extraction and landmark disambiguation.
  - **Meta Model API support:** Optional integration with `muse-spark-1.3-contributor` and `muse-voice-transcribe-1.0` via `api.meta.ai/v1` when configured with Meta developer credentials.
  - **Speech Recognition:** Non-Meta ASR via Groq Whisper (`whisper-large-v3-turbo`) when `GROQ_API_KEY` is configured; offline fallback with sample transcripts (`Sample transcript (no ASR run)`) when unconfigured.
  - **Spatial Snapping:** Character n-gram hashing combined with Meta FAISS index and Jaro-Winkler hybrid scoring for sub-15ms landmark alias snapping to private forecourt anchors.
  - **Safety Gate:** Rule-based safety gate actively scanning for SOS and emergency keywords.
  - **Messaging:** Meta WhatsApp Cloud API transport and built-in WhatsApp Web/Mobile emulator.
- **6 Interconnected Abuja Corridors & Dynamic Zone Fare Matrix:** Covers `Bwari -> Dutse -> Oando -> Berger -> Wuse`, `Zuba -> Dei-Dei -> Kubwa -> Wuse`, `Zuba -> Dei-Dei -> Dutse`, `Zuba -> Karmo -> Jabi`, `Gwagwalada -> Lugbe -> Area 1`, and `Mararaba -> Nyanya -> Central Area` with 20 fare zones, 36+ origin-destination segment fares, 24 private filling station Virtual Anchor Points, and 500+ multilingual landmark aliases in English, Nigerian Pidgin, and Hausa.
- **Zero-Friction "Look, Sit, 1-Tap" Forecourt Boarding:** Commuters verify the car plate (`ABJ-402-AL` [Demo data]) and 4-Seat Co-Rider Manifest on WhatsApp, sit in their assigned seat (`1 Front, 3 Back`), and tap **`[ I Have Entered ]`**.
- **Inclusive 2G Feature-Phone Driver Support:** Traditional commercial drivers with non-smartphones (Nokia 105 / Itel) hold **Key `1`** to flash into the filling station queue, receive a spoken Hausa/Pidgin voice call ("Press 1 to accept"), and get an automatic SMS/tone when all 4 riders tap `[ I Have Entered ]`.
- **Atomic Redis Lua Matching & Balanced Double-Entry Kobo Ledger:** Zero over-booking under concurrency (`form_pod.lua`) and strict zero-sum financial accounting (`sum(amount_kobo) == 0`). Fares held in simulated escrow during demonstration mode.

## Roadmap
- **Meta SAM 3.1 Segmentation:** Production driver KYC vehicle and cabin segmentation using Meta SAM 3.1 (`sam-3.1`) once public endpoint access is configured.
- **Llama Guard Safety Verification:** Upgrading secondary classifier to fine-tuned Llama Guard.

## Quick Start
See [MASTER_IMPLEMENTATION_PLAN.md](./MASTER_IMPLEMENTATION_PLAN.md) for architecture details and [PITCH_DECK.md](./PITCH_DECK.md) for the investor deck.
