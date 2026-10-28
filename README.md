# Along

**The Operating System for Shared Urban Corridor Transit in Africa (Abuja, FCT, Nigeria)**

Along turns Abuja's informal roadside carpooling ("Along") into verified, escrow-backed, 4-seat commuter pods on **WhatsApp** (for riders) and **Dual-Theme Smartphone PWA + 2G Feature-Phone Voice/USSD** (for drivers), loading at safe private filling station forecourts with zero Agbero extortion.

## Architecture Highlights
- **Meta AI Ecosystem:** Powered by `muse-spark-1.3` and `sam-3.1` via the Official Meta Model API (`api.meta.ai/v1`), open-weight **Meta Llama 3.3 70B & 3.1 8B**, **Llama Guard 4**, **Meta FAISS** in-process vector search, and the **Meta WhatsApp Cloud API**.
- **6 Interconnected Abuja Corridors & Dynamic Zone Fare Matrix:** Covers `Bwari - Dutse - Oando - Berger - Wuse`, `Zuba - Dei-Dei - Kubwa - Wuse`, `Zuba - Dei-Dei - Dutse`, `Zuba - Karmo - Jabi`, `Gwagwalada - Lugbe - Area 1`, and `Mararaba - Nyanya - Central Area` with 20 fare zones, 36+ origin-destination segment fares, 24 private filling station Virtual Anchor Points, and 500+ multilingual landmark aliases in English, Nigerian Pidgin, and Hausa.
- **Zero-Friction "Look, Sit, 1-Tap" Forecourt Boarding:** Commuters verify the car plate (`ABJ-402-AL`) and 4-Seat Co-Rider Manifest on WhatsApp, sit in their assigned seat (`1 Front, 3 Back`), and tap **`[ I Have Entered ]`**.
- **Inclusive 2G Feature-Phone Driver Support:** Traditional commercial drivers with non-smartphones (Nokia 105 / Itel) hold **Key `1`** to flash into the filling station queue, receive a spoken Hausa/Pidgin voice call ("Press 1 to accept"), and get an automatic SMS/tone when all 4 riders tap `[ I Have Entered ]`.
- **Atomic Redis Lua Matching & Balanced Double-Entry Kobo Ledger:** Zero over-booking under 500-concurrent load (`form_pod.lua`) and strict zero-sum financial accounting (`sum(amount_kobo) == 0`).

## Quick Start
See [MASTER_IMPLEMENTATION_PLAN.md](./MASTER_IMPLEMENTATION_PLAN.md) for the complete architecture and [PITCH_DECK.md](./PITCH_DECK.md) for the 12-slide investor deck.
