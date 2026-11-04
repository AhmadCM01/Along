# Hackathon Compliance and Pre-Event Disclosure

I built Along as a student project for the Meta Global AI Developer Hackathon. This document records project timeline evidence, pre-event materials, data provenance, toolchain disclosure, and owner statements.

## 1. Event Window and Hackathon Rules
- **Event**: Meta Global AI Developer Hackathon.
- **Build Window**: October 26, 2026 to November 4, 2026.
- **Rules**:
  1. All work presented must be built between October 26 and November 4, 2026.
  2. The demo must show only what the team built during the event so judges can distinguish new work.
  3. No code, data, or assets may be used without appropriate rights.
  4. Repository must be public.

## 2. Timeline Evidence
- **Total Repository Files Analyzed**: 195 files (excluding `node_modules`, `.next`, `.git`, `__pycache__`, and audio clips).
- **Filesystem Creation Timestamps**:
  - Pre-event files created before 2026-10-26 11:00 WAT (local time, UTC+1):
    1. `MASTER_IMPLEMENTATION_PLAN.md`: Created 2026-10-23 10:43:20 WAT. Contains design specifications and system architecture, with no application code.
    2. `PITCH_DECK.md`: Created 2026-10-26 10:34:04 WAT. Draft presentation outline.
  - All source code, configuration files, backend logic, and frontend components were created on or after 2026-10-26 11:09 WAT:
    - `.gitignore`: 2026-10-26 11:09:38
    - `Caddyfile`, `Makefile`, `docker-compose.yml`: 2026-10-26 11:09:44
    - `backend/app/core/*`: 2026-10-26 11:11:09
    - `supabase/migrations/*`: 2026-10-26 11:12:59
- **Git Commit History**:
  - Initial repository commit: 2026-10-28 11:50:48 +0100 (`10e2a53 chore: initial commit with environment hygiene and secure configuration`).
  - While git commits commenced on October 28, filesystem timestamps confirm that implementation began on October 26 at 11:09 WAT.

## 3. Data Sources, Coordinates, and Provenance

I live in Abuja and regularly travel the Berger, Wuse, and Banex corridors. The transit data was compiled as follows:
- **Corridors and Landmarks**: 142 landmarks across 6 transit corridors. Compiled from personal knowledge of commuter routes, consultations with a professional driver who is a friend of my dad, and first-hand complaints heard from riders at roadside junctions.
- **Coordinates & Kilometer Markers**:
  - Owner statement: "I do not know the exact technical toolchain by which the coordinates and km markers were initially produced."
  - Technical evidence: All 142 landmark coordinates and 24 anchor coordinates have uniform 4-decimal precision (approx 11m resolution), and all fall strictly within the Abuja FCT bounding box (lat 8.4 to 9.4, lon 6.7 to 7.8). Route markers (`km_marker`) represent approximate corridor meters. They are hand-curated map pin coordinates rather than automated high-precision GPS survey tracks.
- **Virtual Anchor Points**: 24 well-lit commercial filling stations (A.A. Rano, Oando, TotalEnergies, NNPC, Conoil) chosen for safety. These partner brand names serve as illustrative staging locations.
- **Fares**: Zone-to-zone fare matrix in `supabase/seed/fare_matrix.csv`. Stored as integer kobo based on customary roadside commuter fares and driver consultations.
- **Aliases**: Multilingual aliases in English, Pidgin, and Hausa were hand-written directly in `landmarks.csv` to capture everyday commuter speech. No automated script generated them.
- **OpenStreetMap Usage**:
  - Owner statement: "I am not sure whether OpenStreetMap was used."
  - Technical evidence: OpenStreetMap is not queried at runtime and was not used to produce the seed CSV files. `backend/scripts/fetch_osm_abuja.py` is an offline validation script used to check coordinates against the Abuja bounding box.
- **Other Data Sources**:
  - Owner statement: "I did online research (specific sites not recorded) and also used complaints I heard first hand from other riders."
- **Market Figures and Commuter Statistics**:
  - Any figures cited in pitch materials (e.g. commuter population numbers, market size estimates) are illustrative estimates (source not recorded).

## 4. Pre-Event Materials and Disclosures
The following files were drafted before the official hackathon start:
1. `MASTER_IMPLEMENTATION_PLAN.md` (created 2026-10-23 10:43:20 WAT).
   - Owner statement: "MASTER_IMPLEMENTATION_PLAN.md was drafted on 2026-10-23 before the event. It contains no code."
   - Pre-event material note: "MASTER_IMPLEMENTATION_PLAN.md received a banner and one hosting reference update after the event started. No other changes were made." (Banner: 2026-11-02, commit 3486890; Hosting update: 2026-11-04, commit eaeb48f).
2. `PITCH_DECK.md` (created 2026-10-26 10:34:04 WAT).
   - Owner statement: "PITCH_DECK.md was created 2026-10-26 10:34 local time. All code and config files were created from 2026-10-26 11:09 local time (WAT, UTC+1)."

## 5. Contribution Map

| Area | Main Folders and Files | Commit Range |
|---|---|---|
| Backend AI pipeline | `backend/app/ai/` (extraction, llm, asr, relational, schemas) | `10e2a53..adc0e06` |
| Landmark matching and FAISS index | `backend/app/ai/landmarks/`, `backend/app/matching/` (corridor, anchors) | `10e2a53..4b2c95a` |
| Ledger and escrow simulation | `backend/app/db/`, `backend/app/payments/` (models, schemas) | `10e2a53..2682a28` |
| Driver and pod logic | `backend/app/matching/dispatcher.py`, `pod_former.py`, `pool.py`, `frontend/src/app/driver/` | `10e2a53..2682a28` |
| Frontend chat and ride flow | `frontend/src/components/demo/WhatsAppSimulator.tsx`, `frontend/src/app/page.tsx` | `10e2a53..2682a28` |
| Safety tracking link | `frontend/src/app/t/[shareToken]/`, `frontend/src/components/tracker/` | `10e2a53..caa5707` |
| Multi-rider cockpit | `frontend/src/app/lab/`, `frontend/src/components/demo/MultiRiderDrawer.tsx` | `2ad0a57..2682a28` |
| Deployment and Docker | `Dockerfile`, `docker-compose.yml`, `Caddyfile` | `10e2a53..main` |
| Evaluation suite | `data/clips/`, `evals/`, `backend/tests/` | `fc1b533..main` |

All code listed was created during the hackathon.

## 6. Third-Party Code, Models, and Tooling
- **Open Source Libraries**: Standard permissive libraries (FastAPI, Uvicorn, Pydantic, RapidFuzz, Next.js, React). See `docs/THIRD_PARTY.md`.
- **Hosted Models**:
  - `meta-models/muse-spark-open-1026` via Baseten (primary multilingual NLU).
  - `meta/llama-3.2-11b-vision-instruct` via NVIDIA NIM (fallback).
  - `whisper-large-v3-turbo` via Groq (speech-to-text audio transcription; OpenAI open-source model; Groq is used only for Whisper speech to text).
  - Deterministic rule-based extractor in `backend/app/ai/rule_based.py` (local in-process fallback; runtime chain is primary -> fallback -> rule_based).
- **Web Fonts**: `Bricolage Grotesque`, `Instrument Sans`, `JetBrains Mono` from Google Fonts under SIL Open Font License 1.1.
- **Audio Assets**: The 30 evaluation clips (`data/clips/`) and demo voice note were recorded by me and my brother with mutual consent.
- **AI Tooling Disclosure**:
  - Owner statement: "Tooling: the code was written with AI coding assistants (Claude and Gemini models inside the Antigravity IDE) directed by the owner. Runtime models: Muse Spark Open via Baseten (primary), Llama 3.2 Vision via NVIDIA NIM (fallback), Whisper via Groq for speech (not a Meta model; Groq is used only for Whisper speech to text)."
- **Channel Status**:
  - USSD: the backend endpoint and tests exist but the simulator was removed from the UI.
  - WhatsApp: The WhatsApp webhook handler exists but is not connected to a verified Meta Business account.

## 7. Owner Statements
- Owner statement: "MASTER_IMPLEMENTATION_PLAN.md was drafted on 2026-10-23 before the event. It contains no code."
- Owner statement: "PITCH_DECK.md was created 2026-10-26 10:34 local time. All code and config files were created from 2026-10-26 11:09 local time (WAT, UTC+1)."
- Owner statement: "Data: the corridor landmarks, local names, aliases and fare levels were compiled mostly from my first-hand knowledge of Abuja commuter routes (I regularly travel Berger, Wuse and Banex) and from informal conversations with a professional driver who is a friend of my father. I did online research (specific sites not recorded) and also used complaints I heard first hand from other riders."
- Owner statement: "Audio: the 30 evaluation clips and the demo voice sample were recorded by me and my brother, both consenting. The clips are kept locally; the demo sample is in the repository."
- Owner statement: "Tooling: the code was written with AI coding assistants (Claude and Gemini models inside the Antigravity IDE) directed by me. Runtime models: Muse Spark Open via Baseten (primary), Llama 3.2 Vision via NVIDIA NIM (fallback), Whisper via Groq for speech (not a Meta model; Groq is used only for Whisper speech to text)."
- Owner statement: "The backend runs on a free Render instance that sleeps after inactivity. An external UptimeRobot monitor, set up by the owner, pings /healthz every 5 minutes to keep it awake. The first request after a long pause can still take up to a minute."
