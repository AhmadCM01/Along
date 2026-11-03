# Along Deployment Guide

This guide describes how to deploy the Along backend and frontend using Render and Vercel cloud platforms for the live Meta AI Hackathon 2026 demonstration.

## 1. Architecture Overview

- **Backend**: Python FastAPI container deployed as a Render Web Service (`https://along-api-i3ne.onrender.com`).
- **Frontend**: Next.js 15 SSR web application deployed to Vercel (`https://along-dusky.vercel.app/`).
- **Demo Mode**: The backend boots in `DEMO_MODE=true` with an in-memory double-entry ledger, preloaded Abuja seed catalog, prebuilt local FAISS vector search, and rate limiting to protect model inference credits.
- **Always Warm Availability**: A 5-minute automated uptime ping targets `/healthz` to prevent free-tier idling and keep the service warm.

## 2. Deploying Backend to Render

Render hosts the containerized FastAPI service.

### Step 1: Create a Web Service
1. Log in to [Render](https://render.com/).
2. Click **New** -> **Web Service**.
3. Connect your repository (`Along AI`).
4. Select Environment: **Docker**.
5. Set Name: `along-api-i3ne`.
6. Select Instance Type: **Free** (or Starter).

### Step 2: Configure Environment Variables
In Render Dashboard -> **Environment**, add the following:

**Variables (Plain Text)**:
- `ENV`: `production`
- `DEMO_MODE`: `true`
- `SIMULATE_ESCROW`: `true`
- `PORT`: `7860`
- `PUBLIC_BASE_URL`: `https://along-dusky.vercel.app`
- `CORS_ALLOWED_ORIGINS`: `https://along-dusky.vercel.app,http://localhost:3000,http://localhost:3001`

**Secrets (Add your own API keys without sharing them)**:
- `LLM_BASE_URL`: OpenAI-compatible endpoint URL (e.g. Baseten)
- `LLM_API_KEY`: API key for primary LLM
- `LLM_MODEL`: Primary model name (`meta-models/muse-spark-open-1026`)
- `LLM_PROVIDER_LABEL`: Label for primary model (`baseten_meta_ai`)
- `LLM_FALLBACK_BASE_URL`: Optional secondary endpoint URL (leave unset for default primary -> rule_based chain)
- `LLM_FALLBACK_API_KEY`: Optional secondary API key
- `LLM_FALLBACK_MODEL`: Optional secondary model name
- `LLM_FALLBACK_PROVIDER_LABEL`: Optional secondary provider label
- `GROQ_API_KEY`: Groq API key for Whisper audio transcription
- `WHISPER_MODEL`: `whisper-large-v3-turbo`
- `JWT_SECRET_KEY`: 64-character hexadecimal signing string
- `OTP_PEPPER`: 64-character hexadecimal pepper string

> Note: When `LLM_FALLBACK_API_KEY` is not set, the runtime fallback chain automatically runs `primary -> rule_based` using the local deterministic extractor.

### Step 3: Verify Deployment
Once built, test your Render endpoints:
- `GET https://along-api-i3ne.onrender.com/healthz` -> returns `{"status": "ok", "version": "1.0.0"}`
- `GET https://along-api-i3ne.onrender.com/api/v1/status` -> reports live model ping and `demo_mode: true`

## 3. Deploying Frontend to Vercel

### Step 1: Import Project
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Framework Preset: **Next.js**.

### Step 2: Environment Variables
Add the following environment variable in the Vercel project settings:
- `NEXT_PUBLIC_API_URL`: `https://along-api-i3ne.onrender.com`

### Step 3: Deploy
Click **Deploy**. Vercel runs `npm run build` and publishes your site at `https://along-dusky.vercel.app/`.

## 4. Cold-Start and Operational Expectations

- **Uptime Monitoring**: A 5-minute external uptime ping pings `https://along-api-i3ne.onrender.com/healthz` to prevent free-tier sleep cycles and ensure zero cold starts for evaluators.
- **Rate Limits**: The backend enforces in-memory rate limits (20 requests per IP per hour, 400 global requests per day) to prevent automated scrapers from exhausting hackathon API credits.
- **Audio Uploads**: Audio voice notes are capped at 5 MB and 30 seconds maximum.

## 5. Live Demo Checklist for Judges

1. **WhatsApp Ride Booking**: Open `https://along-dusky.vercel.app/`. Type a commute request (e.g. `I am at Dutse first gate going to Berger, 2 seats`) or send the demo voice note in Pidgin, English, or Hausa.
2. **Transparent AI Telemetry**: Open the Behind-the-Scenes drawer to inspect the exact model trace, latency, slot extraction, and hybrid FAISS scores.
3. **Driver Companion**: Navigate to `/driver` to test 4-digit OTP boarding, 150m geofence verification, and 2G feature-phone USSD mode.
4. **Operations Command Center**: Navigate to `/ops` to inspect the 6 active Abuja transit corridors, double-entry ledger balance, and Agbero savings proof.
5. **Zero Secret Leaks**: Verify that `/healthz` and `/api/v1/status` never return secret keys or authentication tokens.
