# Along Deployment Guide

This guide describes how to deploy the Along backend and frontend using free-tier cloud platforms for the live Meta AI Hackathon 2026 demonstration.

## 1. Architecture Overview

- **Backend**: Python FastAPI container deployed to a free Hugging Face Docker Space (port 7860).
- **Frontend**: Next.js 15 SSR web application deployed to Vercel.
- **Demo Mode**: The backend boots in `DEMO_MODE=true` with an in-memory double-entry ledger, preloaded Abuja seed catalog, prebuilt local FAISS vector search, and rate limiting to protect model inference credits.

## 2. Deploying Backend to Hugging Face Spaces

Hugging Face Spaces offers free CPU Docker spaces running on port 7860.

### Step 1: Create a Space
1. Log in to [Hugging Face](https://huggingface.co/).
2. Click **New Space**.
3. Set Space name (e.g. `along-backend`).
4. Select Space SDK: **Docker** (Blank).
5. Choose Hardware: **Free CPU (2 vCPU, 16 GB RAM)**.
6. Set Visibility: **Public**.

### Step 2: Push Repository
Clone your space repository and push the Along repository contents, or link your GitHub repository. The root `Dockerfile` will automatically build the container.

### Step 3: Configure Space Secrets and Variables
In Space Settings -> **Variables and secrets**, add the following:

**Variables (Plain Text)**:
- `ENV`: `production`
- `DEMO_MODE`: `true`
- `SIMULATE_ESCROW`: `true`
- `PORT`: `7860`
- `CORS_ALLOWED_ORIGINS`: `https://along.vercel.app,http://localhost:3000,http://localhost:3001`

**Secrets (Add your own API keys without sharing them)**:
- `LLM_BASE_URL`: OpenAI-compatible endpoint URL (e.g. Baseten or NVIDIA NIM)
- `LLM_API_KEY`: API key for primary LLM
- `LLM_MODEL`: Primary model name (e.g. `meta-models/muse-spark-open-1026`)
- `LLM_PROVIDER_LABEL`: Label for primary model
- `LLM_FALLBACK_BASE_URL`: Fallback endpoint URL (e.g. NVIDIA NIM)
- `LLM_FALLBACK_API_KEY`: API key for fallback LLM
- `LLM_FALLBACK_MODEL`: Fallback model name (e.g. `meta/llama-3.2-11b-vision-instruct`)
- `LLM_FALLBACK_PROVIDER_LABEL`: Label for fallback model
- `GROQ_API_KEY`: Groq API key for Whisper audio transcription
- `WHISPER_MODEL`: `whisper-large-v3-turbo`
- `JWT_SECRET_KEY`: 64-character hexadecimal signing string
- `OTP_PEPPER`: 64-character hexadecimal pepper string

### Step 4: Verify Deployment
Once built, test your space endpoint:
- `GET https://<your-space>.hf.space/healthz` -> returns `{"status": "ok", "version": "1.0.0"}`
- `GET https://<your-space>.hf.space/api/v1/status` -> reports live model ping and `demo_mode: true`

## 3. Deploying Frontend to Vercel

### Step 1: Import Project
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Framework Preset: **Next.js**.

### Step 2: Environment Variables
Add the following environment variable in the Vercel project settings:
- `NEXT_PUBLIC_API_URL`: Your Hugging Face Space URL (e.g. `https://<your-space>.hf.space`)

### Step 3: Deploy
Click **Deploy**. Vercel will run `npm run build` and publish your site at `https://along.vercel.app` (or your assigned Vercel URL).

## 4. Cold-Start and Operational Expectations

- **Hugging Face Free Tier**: Spaces go to sleep after 48 hours of inactivity. The first visitor will experience a 30-45 second cold start while the container spins up. The frontend automatically detects this and shows: `Server is waking up (free tier cold start)...`.
- **Rate Limits**: The backend enforces in-memory rate limits (20 requests per IP per hour, 400 global requests per day) to prevent automated scrapers from exhausting hackathon API credits.
- **Audio Uploads**: Audio voice notes are capped at 5 MB and 30 seconds maximum.

## 5. Live Demo Checklist for Judges

1. **WhatsApp Ride Booking**: Open the home page. Type a commute request (e.g. `I am at Dutse first gate going to Berger, 2 seats`) or send the demo voice note in Pidgin, English, or Hausa.
2. **Transparent AI Telemetry**: Open the Behind-the-Scenes drawer to inspect the exact model trace, latency, slot extraction, and hybrid FAISS scores.
3. **Driver Companion**: Navigate to `/driver` to test 4-digit OTP boarding, 150m geofence verification, and 2G feature-phone USSD mode.
4. **Operations Command Center**: Navigate to `/ops` to inspect the 6 active Abuja transit corridors, double-entry ledger balance, and Agbero savings proof.
5. **Zero Secret Leaks**: Verify that `/healthz` and `/api/v1/status` never return secret keys or authentication tokens.
