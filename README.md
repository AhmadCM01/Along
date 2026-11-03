# Along

**The AI-Orchestrated Operating System for Shared Urban Corridor Transit in Africa (Abuja, FCT, Nigeria)**

> **Hackathon Opening Statement (What Existed Before vs. What Was Built This Week):**
> Zero code existed prior to this hackathon; this entire repository (including the conversational state machine, the 6-corridor Abuja spatial and relational landmark engine, the simulated double-entry Kobo escrow ledger, the 2G USSD/Voice driver dispatch system, and the 3-step live corridor web application) was built from scratch this week for the Meta AI Developer Hackathon.

---

## 1. What Runs Live vs. Simulated (Hackathon Runtime Transparency)

The system combines live Meta AI open-weight models, character n-gram hashing and Jaro-Winkler reranking over a FAISS index, and realistic simulations for operational infrastructure:

| Runtime Pipeline Stage | Technology / Model ID | Where It Runs | Implementation Status | Role in Along |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Conversational NLU, Slot Extraction & Relational Reasoning** | `meta-models/muse-spark-open-1026` (*Meta Muse Spark Open*) | Baseten Meta AI API (`https://inference.baseten.co/v1`) | **Live** | Extracts origin, destination, relational landmarks, seat counts, safety classification, and natural trilingual replies across **Nigerian Pidgin (`pcm`)**, **Hausa (`ha`)**, and **Nigerian English (`en`)**. |
| **Deterministic Fallback Extraction** | Rule-Based Extractor (`backend/app/ai/rule_based.py`) | In-process Python runtime | **Live (Fallback)** | Deterministic keyword and regex slot extractor that activates if primary LLM is unavailable (chain: primary -> rule_based). |
| **Speech-to-Text Audio Transcription** | `whisper-large-v3-turbo` (*OpenAI Whisper via Groq*) & Web Audio API | Groq API & Browser Web Audio | **Live** | Transcribes commuter WhatsApp voice notes (English, Pidgin, Hausa) with sub-500ms latency. |
| **Spatial Landmark Gazetteer & Search** | **Meta FAISS** (768-D L2-normalized index) + character n-gram hashing + Jaro-Winkler reranker | In-process Python runtime (`backend/data/faiss/`) | **Live** | Resolves 142 Abuja landmarks across 1,122 aliases (1,247 indexed vector representations) in sub-15ms p95 latency. |
| **Boarding Code Security & Verification** | Per-trip 4-digit OTP + HMAC-SHA256 | Backend memory / Redis store | **Live** | HMAC-SHA256 verification, 30-minute expiry, 3-attempt lock, and 150m anchor geofence. |
| **Double-Entry Escrow Ledger** | Double-entry Kobo balance ledger | Backend simulated store | **Simulated** | Simulates 90% driver net and 10% platform fee split without live NIP interbank clearing. |
| **Corridor Pod Telemetry & GPS** | Dynamic 4-seat pod simulator | Backend & Map state | **Simulated** | Simulates real-time corridor movement along actual Abuja FCT roadway coordinates. |

---

## 2. Roadmap (Planned Capabilities)

The following capabilities are in design on our roadmap:
1. **Meta SAM 3.1 (`sam-3.1`) Vehicle Segmentation**: Automating driver onboarding KYC with sub-part segmentation of vehicle body panels, plate clarity, and cabin seat arrangements.
2. **National Identity Number (NIN) Verification**: Live integration with Nigerian NIMC API for driver identity and criminal background verification.
3. **Live NIP Instant Settlement**: Direct real-time bank account disbursement to commercial driver accounts upon trip completion.

---

## 3. Quick Start & Setup Instructions (Run & Verify the Demo Locally)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & `npm`

### Step 1: Configure Environment
Copy `.env.example` to `.env` in the repository root and set your Meta AI API credentials:
```bash
cp .env.example .env
```
Ensure the following variables are set in `.env`:
```env
LLM_BASE_URL=https://inference.baseten.co/v1
LLM_API_KEY=<your_meta_ai_baseten_api_key>
LLM_MODEL=meta-models/muse-spark-open-1026
LLM_PROVIDER_LABEL=baseten_meta_ai
```

### Step 2: Start the FastAPI Backend Server (Port 8000)
```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

### Step 3: Start the Next.js Frontend Server (Port 3001)
```bash
npm --prefix frontend install
npm --prefix frontend run dev -- -H 0.0.0.0 -p 3001
```

### Step 4: Verify the 3-Step Commuter, Driver & Live Corridor Flow
Open **`http://localhost:3001`** in your browser:
1. **Step 1: Ride (`http://localhost:3001`)**:
   - Click **Play Pidgin Voice**, tap any of the instant test prompts on the left sidebar, record a live voice note with the microphone button, or type any Abuja route in English, Pidgin, or Hausa (e.g., `"From Wuse to Bwari"`, `"From Banex to Dutse"`, `"Ina Bwari zan je Kasuwar Wuse kujera biyu"`, `"From Gwarinpa to Mpape"`).
   - Click **Confirm & Lock Seat** on the WhatsApp quote card to lock the fare in simulated escrow and receive your 4-digit **Boarding OTP**.
2. **Step 2: Driver OTP (`http://localhost:3001/driver`)**:
   - Click **Open driver view with this code** (Demo shortcut) to prefill the code into the Driver Terminal.
   - Verify the 4-digit OTP via HMAC-SHA256 to initiate the trip (`IN_TRANSIT`).
3. **Step 3: Live Corridor (`http://localhost:3001/t/<shareToken>`)**:
   - Watch the active pod (`POD-842A`) travel in real time along the highlighted Abuja FCT corridor from the exact pickup point to the destination.
   - Click **AI X-Ray** in the top header at any time to inspect live model telemetry, latency traces, and landmark resolver confidence scores.

### Step 5: Run the Automated Test Suite
```bash
pytest backend/tests/unit/test_migrations_and_seeds.py backend/tests/integration/test_capacity_and_otp.py backend/tests/integration/test_otp_security.py
```

---

## 4. Architecture & Documentation
- See [`MASTER_IMPLEMENTATION_PLAN.md`](./MASTER_IMPLEMENTATION_PLAN.md) for the complete system specification.
- See [`PITCH_DECK.md`](./PITCH_DECK.md) for the hackathon presentation and 3-minute demo script.
- See [`docs/NATIVE_REVIEW.md`](./docs/NATIVE_REVIEW.md) for the native Hausa and Pidgin template review strings.
