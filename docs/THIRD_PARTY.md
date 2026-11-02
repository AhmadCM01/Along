# Third-Party Inventory and License Audit

This document catalogues all third-party software packages, runtime models, fonts, icons, geodata assets, and audio files utilized in the Along AI codebase.

## 1. Python Dependencies (`backend/pyproject.toml`)

All Python packages were inspected directly from package distribution metadata in `backend/.venv`:

| Package | Version Specifier | Purpose | License | License Category |
|---|---|---|---|---|
| `fastapi` | `>=0.115.0` | Asynchronous REST and WebSocket web API framework | MIT | Permissive |
| `uvicorn` | `>=0.30.0` (standard) | High-performance ASGI server runtime | BSD-3-Clause | Permissive |
| `pydantic` | `>=2.9.0` | Schema validation and data modeling with type hints | MIT | Permissive |
| `pydantic-settings` | `>=2.5.0` | Environment variable and configuration parsing | MIT | Permissive |
| `asyncpg` | `>=0.29.0` | Asynchronous PostgreSQL database driver | Apache-2.0 | Permissive |
| `redis` | `>=5.1.0` | Asynchronous Redis client for spatial state and queues | MIT | Permissive |
| `httpx` | `>=0.27.0` | Asynchronous HTTP client for inference endpoints | BSD-3-Clause | Permissive |
| `structlog` | `>=24.4.0` | Structured JSON and console telemetry logging | MIT or Apache-2.0 | Permissive |
| `PyYAML` | `>=6.0.2` | YAML parser for corridor configuration files | MIT | Permissive |
| `PyJWT` | `>=2.9.0` | Cryptographic JSON Web Token signing for driver auth | MIT | Permissive |
| `numpy` | `>=1.26.0` | Vector array computations for index calculations | BSD-3-Clause | Permissive |
| `rapidfuzz` | `>=3.9.0` | High-speed C++ fuzzy string similarity and reranking | MIT | Permissive |

*License Flag*: None. All 12 direct backend packages use standard permissive open source licenses (MIT, BSD, Apache-2.0). No copyleft or viral licenses (such as GPL or AGPL) are present.

## 2. Node.js & Frontend Dependencies (`frontend/package.json`)

All npm dependencies were inspected directly from `package.json` and `node_modules/*/package.json`:

| Package | Version Specifier | Purpose | License | License Category |
|---|---|---|---|---|
| `next` | `^15.0.3` | React web application framework and SSR engine | MIT | Permissive |
| `react` | `^19.0.0` | User interface component library | MIT | Permissive |
| `react-dom` | `^19.0.0` | React DOM renderer | MIT | Permissive |
| `@types/node` | `^22.9.0` (dev) | TypeScript definitions for Node.js runtime | MIT | Permissive |
| `@types/react` | `^19.0.0` (dev) | TypeScript definitions for React | MIT | Permissive |
| `@types/react-dom` | `^19.0.0` (dev) | TypeScript definitions for React DOM | MIT | Permissive |
| `typescript` | `^5.6.3` (dev) | Static type checker and compiler | Apache-2.0 | Permissive |

*License Flag*: None. All frontend packages use standard permissive licenses (MIT or Apache-2.0).

## 3. Web Fonts

Fonts are loaded dynamically via Google Fonts in `frontend/src/app/layout.tsx`:

| Font Family | Designer / Source | Purpose | License |
|---|---|---|---|
| `Bricolage Grotesque` | Mathieu Triay (Google Fonts) | Primary headings, departure numerals, and badges | SIL Open Font License 1.1 (OFL) |
| `Instrument Sans` | Instrument (Google Fonts) | Body text, UI labels, and conversational chat | SIL Open Font License 1.1 (OFL) |
| `JetBrains Mono` | JetBrains (Google Fonts) | OTP codes, monospaced markers, and coordinates | SIL Open Font License 1.1 (OFL) |

*License Flag*: None. All 3 web fonts are distributed under the SIL Open Font License (OFL-1.1), permitting free commercial and non-commercial embedding and distribution.

## 4. Icons and SVG Assets

- **Icons**: Defined in `frontend/src/components/icons/AlongIcons.tsx` as inline React SVG functional components.
  - PodNavIcon, SteeringNavIcon, RadarNavIcon, CheckmarkDoubleIcon, MicWaveIcon, PhoneKeypadIcon, etc.
  - Handcrafted SVG path coordinates authored specifically for this project.
  - License / Provenance: Original work authored during the event.

## 5. Visual and Image Assets

- **Images**: The repository contains zero raster image files (`.png`, `.jpg`, `.jpeg`, `.ico`). The user interface relies entirely on SVG geometry, typography, and CSS design tokens.
- **Corridor Polylines (`data/corridor/*.geojson`)**:
  - `bwr_dut_wus.geojson` (Bwari - Dutse - Wuse)
  - `dut-ber.geojson` (Dutse - Berger)
  - `gwl_lug_ar1.geojson` (Gwagwalada - Lugbe - Area 1)
  - `mrb_nya_cen.geojson` (Mararaba - Nyanya - Central Area)
  - `zub_dei_dut.geojson` (Zuba - Dei-Dei - Dutse)
  - `zub_krm_jab.geojson` (Zuba - Karmo - Jabi)
  - `zub_kub_wus.geojson` (Zuba - Kubwa - Wuse)
  - *Provenance Note*: Geodata polylines digitized for Abuja roadway corridors; source method: owner to confirm.

## 6. Audio Assets

| File | Purpose | Provenance & Consent | License / Rights |
|---|---|---|---|
| `frontend/public/audio/pidgin_voice_note.ogg` | Demonstration voice sample in WhatsApp chat interface | Recorded by project owner and owner brother | Original recording, consented |
| `data/clips/c01.ogg` to `c30.ogg` | 30 evaluation audio clips (stored locally in `data/clips/`, git-ignored) | Recorded by project owner and owner brother | Original recordings, consented |

*Asset Flag*: No third-party proprietary audio, copyright music, or unauthorized voice recordings exist in the repository.

## 7. Hosted Machine Learning Models (Inference APIs)

| Model Name | Provider / Host | Role in Along | Terms & Attribution |
|---|---|---|---|
| `meta-models/muse-spark-open-1026` | Baseten Inference API | Primary multilingual NLU, intent classification, slot extraction | Meta open-weight model license |
| `meta/llama-3.2-11b-vision-instruct` | NVIDIA NIM Inference API | Secondary fallback NLU and vehicle photo inspection | Meta Llama 3.2 Community License |
| `whisper-large-v3-turbo` | Groq Cloud API | Speech-to-text audio transcription | OpenAI Whisper open-source license (MIT) via Groq API terms |
