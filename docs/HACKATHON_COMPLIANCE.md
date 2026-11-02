# Hackathon Compliance and Pre-Event Disclosure

## 1. Event Window and Rules
- **Event**: Meta Global AI Developer Hackathon.
- **Build Window**: October 26, 2026 to November 4, 2026.
- **Official Rules**:
  1. All work presented must be built between October 26 and November 4, 2026.
  2. The demo must show only what the team built during the event so judges can distinguish new work.
  3. No code, data, or assets may be used without appropriate rights.
  4. Repository must be public.

## 2. Timeline Evidence (Part 1 Results)
- **Total Files Analyzed**: 195 repository files (excluding `node_modules`, `.next`, `.git`, `__pycache__`, and audio files).
- **Filesystem Timestamps**:
  - Files created before the hackathon start (2026-10-26 11:00 local time, WAT, UTC+1):
    1. `MASTER_IMPLEMENTATION_PLAN.md`: Created 2026-10-23 10:43:20 local time.
    2. `PITCH_DECK.md`: Created 2026-10-26 10:34:04 local time.
  - All source code and configuration files were created on or after 2026-10-26 11:09 local time:
    - `.gitignore`: 2026-10-26 11:09:38
    - `.env.example`: 2026-10-26 11:09:41
    - `docker-compose.yml`: 2026-10-26 11:09:44
    - `docker-compose.prod.yml`: 2026-10-26 11:09:46
    - `Caddyfile`: 2026-10-26 11:09:48
    - `Makefile`: 2026-10-26 11:09:51
    - `README.md`: 2026-10-26 11:09:54
    - `backend/Dockerfile`: 2026-10-26 11:09:56
    - `backend/pyproject.toml`: 2026-10-26 11:09:58
    - `backend/app/core/config.py`: 2026-10-26 11:11:09
    - `backend/app/core/money.py`: 2026-10-26 11:11:12
    - `backend/app/core/phone.py`: 2026-10-26 11:11:20
    - `backend/app/core/ids.py`: 2026-10-26 11:11:28
    - `backend/app/core/security.py`: 2026-10-26 11:11:37
    - `backend/app/core/errors.py`: 2026-10-26 11:11:41
    - `backend/app/core/logging.py`: 2026-10-26 11:11:43
    - `backend/app/core/telemetry.py`: 2026-10-26 11:11:45
    - `supabase/config.toml`: 2026-10-26 11:12:57
    - `supabase/migrations/0001_extensions.sql`: 2026-10-26 11:12:59
    - `supabase/migrations/0002_enums.sql`: 2026-10-26 11:13:01
- **File Counts Per Day by Top Level Folder**:
  - `2026-10-23`: root (1: `MASTER_IMPLEMENTATION_PLAN.md`)
  - `2026-10-26`: root (8), `.github` (2), `backend` (92), `data` (9), `evals` (7), `frontend` (15), `supabase` (16)
  - `2026-10-27`: `evals` (1), `frontend` (6)
  - `2026-10-28`: root (1), `backend` (1)
  - `2026-10-29`: `backend` (3), `data` (1), `docs` (1), `frontend` (17), `scripts` (1)
  - `2026-10-30`: `backend` (1), `frontend` (1)
  - `2026-10-31`: `frontend` (2)
  - `2026-11-01`: `backend` (1), `docs` (1)
  - `2026-11-02`: `data` (7)
- **Git Commit History**:
  - First commit date: 2026-10-28 11:50:48 +0100 (`10e2a53 chore: initial commit with environment hygiene and secure configuration`).
  - Commits per day:
    - 2026-10-28: 1 commit
    - 2026-10-29: 6 commits
    - 2026-10-30: 3 commits
    - 2026-11-01: 1 commit
    - 2026-11-02: 5 commits
- **Git History Disclosure**: Git history created during the event does not prove when code was written; repository commits commenced on October 28 while filesystem creation dates verify code construction began on October 26 at 11:09 WAT.

## 3. Pre-Event Material
The following files were created prior to 2026-10-26 11:00 local time:
1. `MASTER_IMPLEMENTATION_PLAN.md` (created 2026-10-23 10:43:20 local time).
   - Owner statement: "MASTER_IMPLEMENTATION_PLAN.md was drafted on 2026-10-23 before the event. It contains no code."
2. `PITCH_DECK.md` (created 2026-10-26 10:34:04 local time).
   - Owner statement: "PITCH_DECK.md was created 2026-10-26 10:34 local time. All code and config files were created from 2026-10-26 11:09 local time (WAT, UTC+1)."

## 4. Contribution Map

| Area | Main Folders and Files | Commit Range |
|---|---|---|
| Backend AI pipeline | `backend/app/ai/` (extraction, llm, asr, relational, schemas) | `10e2a53..adc0e06` |
| Landmark matching and FAISS index | `backend/app/ai/landmarks/`, `backend/app/matching/` (corridor, anchors) | `10e2a53..4b2c95a` |
| Ledger and escrow simulation | `backend/app/db/`, `backend/app/payments/` (models, schemas) | `10e2a53..2682a28` |
| Driver and pod logic | `backend/app/matching/dispatcher.py`, `pod_former.py`, `pool.py`, `frontend/src/app/driver/` | `10e2a53..2682a28` |
| Frontend chat and ride flow | `frontend/src/components/demo/WhatsAppSimulator.tsx`, `frontend/src/app/page.tsx` | `10e2a53..2682a28` |
| Tracker | `frontend/src/app/t/[shareToken]/`, `frontend/src/components/tracker/` | `10e2a53..caa5707` |
| Multi-rider lab | `frontend/src/app/lab/`, `frontend/src/components/demo/MultiRiderDrawer.tsx` | `2ad0a57..2682a28` |
| Deployment files | `docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile`, `Dockerfile`, `Makefile` | `10e2a53..4b2c95a` |
| Evaluation | `data/clips/`, `evals/`, `backend/tests/` | `fc1b533..18e7a67` |

Everything listed was created during the event unless listed under Pre-event material.

## 5. What We Did Not Write
- **Open Source Libraries**: Third-party Python dependencies (FastAPI, Uvicorn, Pydantic, RapidFuzz, Structlog, AsyncPG, Redis, PyYAML, PyJWT, NumPy, HTTPX) and Node.js dependencies (Next.js, React, React-DOM, TypeScript). Full license inventory in `docs/THIRD_PARTY.md`.
- **Meta Models Accessed via Hosted APIs**:
  - `meta-models/muse-spark-open-1026` (*Meta Muse Spark Open*) hosted on Baseten.
  - `meta/llama-3.2-11b-vision-instruct` (*Meta Llama 3.2 Vision*) hosted on NVIDIA NIM.
- **Non-Meta Hosted Models**:
  - `whisper-large-v3-turbo` (*OpenAI Whisper*) hosted on Groq Cloud API for audio transcription.
- **Web Fonts**:
  - `Bricolage Grotesque`, `Instrument Sans`, `JetBrains Mono` served via Google Fonts under SIL Open Font License 1.1.

## 6. AI Tooling Disclosure
- Owner statement: "Tooling: the code was written with AI coding assistants (Claude and Gemini models inside the Antigravity IDE) directed by the owner. Runtime models: Muse Spark Open via Baseten (primary), Llama 3.2 Vision via NVIDIA NIM (fallback), Whisper via Groq for speech (not a Meta model)."

## 7. Owner Statements
The following statements are quoted from the project owner:
- Owner statement: "MASTER_IMPLEMENTATION_PLAN.md was drafted on 2026-10-23 before the event. It contains no code."
- Owner statement: "PITCH_DECK.md was created 2026-10-26 10:34 local time. All code and config files were created from 2026-10-26 11:09 local time (WAT, UTC+1)."
- Owner statement: "Data: the corridor landmarks, local names, aliases and fare levels were compiled mostly from the owner's first-hand knowledge of Abuja commuter routes (the owner regularly travels Berger, Wuse and Banex) and from informal conversations with a professional driver who is a friend of the owner's father. Parts of the data NOT from these sources: owner to list. Method for coordinates and km markers: owner to confirm."
- Owner statement: "Audio: the 30 evaluation clips and the demo voice sample were recorded by the owner and the owner's brother, both consenting. The clips are not in the repository; the demo sample is."
- Owner statement: "Tooling: the code was written with AI coding assistants (Claude and Gemini models inside the Antigravity IDE) directed by the owner. Runtime models: Muse Spark Open via Baseten (primary), Llama 3.2 Vision via NVIDIA NIM (fallback), Whisper via Groq for speech (not a Meta model)."

### Owner Confirmation Sign-off
- I confirm that MASTER_IMPLEMENTATION_PLAN.md was drafted on 2026-10-23 and contains no code: _____________________
- I confirm that all code was created from 2026-10-26 11:09 WAT: _____________________
- I confirm that audio participants provided informed consent: _____________________
- I confirm that data sources, coordinates, and km markers are accurately attributed: _____________________
- I confirm that AI assistant usage has been disclosed transparently: _____________________
