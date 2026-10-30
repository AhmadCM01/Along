"""WhatsApp Voice Note Speech-to-Text (app/ai/asr.py).

Providers:
1. Direct Meta Model API (when enabled):
   - Speech model: muse-voice-transcribe-1.0
   - Endpoint: POST /v1/asr/transcribe (multipart: 'request' JSON and 'audio' PCM WAV)
2. Groq Whisper (when GROQ_API_KEY is configured):
   - Model: whisper-large-v3-turbo
   - Labeled: "Non-Meta ASR"
3. Offline / Demo Voice Fixtures (when no keys are configured):
   - Pre-verified sample transcripts
   - Labeled: "Sample transcript (no ASR run)"
   - Returns provider="local_fallback", model_used="none", fallback=True
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from dataclasses import dataclass

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ABUJA_ASR_VOCABULARY_PROMPT = (
    "Abuja FCT Nigeria shared transit voice note in English, Nigerian Pidgin, or Hausa. "
    "Key locations: Bwari, Ushafa, Dutse, Dutse Alhaji, Dutse First Gate, Sokale Roundabout, "
    "Kubwa Express, Mopol Junction, Tipper Garage, Katampe Bridge, Oando Mabushi, "
    "Gwarinpa, Galadima, Berger Roundabout, Gadar Berger, Wuse, Wuse Market, Kasuwar Wuse, "
    "Zuba, Dei-Dei, Karimo, Life Camp, Jabi, Utako, Gwagwalada, Giri, Lugbe Police Signboard, "
    "City Gate, Area 1, Mararaba Orange Market, Nyanya, Kugbo, AYA Asokoro, Federal Secretariat. "
    "Hausa examples: Ina Bwari zan je Kasuwar Wuse kujera biyu. Zan je Wuse daga Dutse. "
    "Pidgin examples: Abeg I dey Dutse First Gate, two seats go Berger. Drop me for Oando Katampe."
)

DEMO_VOICE_FIXTURES: dict[str, tuple[str, str]] = {
    "vn_pidgin_dutse_berger": (
        "Abeg I dey Dutse first gate, two seats go Berger",
        "pcm",
    ),
    "vn_english_relational_oando": (
        "From Sokale roundabout, drop me for that Oando after Katampe bridge",
        "en",
    ),
    "vn_hausa_bwari_wuse": (
        "Ina Bwari zan je Kasuwar Wuse kujera biyu",
        "ha",
    ),
    "vn_pidgin_lugbe_area1": (
        "I dey Police signboard Lugbe, one seat go Area 1",
        "pcm",
    ),
    "vn_pidgin_mararaba_sec": (
        "From Orange market Mararaba, carry me reach Federal Secretariat",
        "pcm",
    ),
}


@dataclass(frozen=True)
class ASRResult:
    """Structured speech-to-text transcription output."""

    transcript: str
    detected_language: str
    model_used: str
    provider: str
    latency_ms: float
    fallback: bool = False
    label: str = "none"
    vocabulary_prompt_applied: bool = True


def _convert_to_pcm16_wav(raw_audio: bytes) -> bytes:
    """Convert audio payload to 16kHz mono 16-bit PCM WAV using ffmpeg if available."""
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "wav",
                "pipe:1",
            ],
            input=raw_audio,
            capture_output=True,
            check=True,
        )
        return proc.stdout
    except Exception:
        # Fallback to returning raw bytes if ffmpeg is not available on path
        return raw_audio


async def transcribe_voice_note(
    audio_bytes: bytes,
    *,
    filename: str = "voice_note.ogg",
    fixture_id: str | None = None,
    client_transcript: str | None = None,
    locale_hint: str | None = None,
) -> ASRResult:
    """Transcribe a WhatsApp voice note with API-first routing and Meta AI phonetic post-correction."""
    from app.ai.asr_normalizer import normalize_abuja_asr_transcript, reconstruct_asr_with_meta_llm
    from app.ai.extraction import detect_language

    start = time.perf_counter()
    settings = get_settings()

    meta_key = settings.get_effective_meta_key()
    groq_key = settings.get_effective_groq_key()

    # 1. Direct Meta Model API (when enabled)
    if meta_key and audio_bytes and not fixture_id:
        try:
            wav_bytes = _convert_to_pcm16_wav(audio_bytes)
            url = f"{settings.META_MODEL_API_BASE_URL.rstrip('/')}/asr/transcribe"
            req_json = {
                "model": "muse-voice-transcribe-1.0",
                "prompt": ABUJA_ASR_VOCABULARY_PROMPT,
            }
            files = {
                "request": (None, json.dumps(req_json), "application/json"),
                "audio": (filename.rsplit(".", 1)[0] + ".wav", wav_bytes, "audio/wav"),
            }
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {meta_key}"},
                    files=files,
                )
                resp.raise_for_status()
                payload = resp.json()
                returned_model = str(payload.get("model") or "muse-voice-transcribe-1.0")
                text_out = payload.get("text", "").strip()
                if text_out:
                    clean_text, _ = await reconstruct_asr_with_meta_llm(text_out, locale_hint=locale_hint)
                    latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
                    return ASRResult(
                        transcript=clean_text,
                        detected_language=detect_language(clean_text),
                        model_used=returned_model,
                        provider="meta_model_api",
                        label="Meta Model API (Muse Voice)",
                        latency_ms=latency_ms,
                        fallback=False,
                    )
        except Exception as exc:
            logger.warning("meta_asr_transcribe_fallback", error=str(exc))

    # 2. Groq Whisper (labeled Non-Meta ASR) + Meta AI Phonetic Reconstruction
    # Note: Skip real HTTP call for synthetic 15-byte unit-test stubs (e.g. b"OggS-demo-voice")
    is_real_audio = bool(audio_bytes and len(audio_bytes) > 256 and not fixture_id)
    if groq_key and is_real_audio:
        try:
            url = "https://api.groq.com/openai/v1/audio/transcriptions"
            mime_type = "audio/webm" if filename.lower().endswith(".webm") else "audio/ogg"
            data_fields: dict[str, str] = {
                "model": settings.WHISPER_MODEL,
                "prompt": ABUJA_ASR_VOCABULARY_PROMPT,
                "response_format": "json",
            }
            if locale_hint == "ha":
                data_fields["language"] = "ha"
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {groq_key}"},
                    data=data_fields,
                    files={"file": (filename, audio_bytes, mime_type)},
                )
                resp.raise_for_status()
                payload = resp.json()
                returned_model = str(payload.get("model") or settings.WHISPER_MODEL)
                text_out = payload.get("text", "").strip()
                if text_out:
                    clean_text, meta_model = await reconstruct_asr_with_meta_llm(
                        text_out,
                        locale_hint=locale_hint,
                    )
                    latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
                    label_str = (
                        f"Whisper + Meta {meta_model.split('/')[-1]} Correction"
                        if meta_model
                        else "Non-Meta ASR"
                    )
                    return ASRResult(
                        transcript=clean_text,
                        detected_language=detect_language(clean_text),
                        model_used=returned_model,
                        provider="groq_whisper",
                        label=label_str,
                        latency_ms=latency_ms,
                        fallback=False,
                    )
        except Exception as exc:
            logger.warning("groq_whisper_error", error=str(exc))

    # 2b. Live Browser Web Speech API Transcript + Meta AI Phonetic Reconstruction
    if client_transcript and client_transcript.strip():
        clean_live, meta_model = await reconstruct_asr_with_meta_llm(
            client_transcript.strip(),
            locale_hint=locale_hint,
        )
        detected_lang = detect_language(clean_live)
        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
        return ASRResult(
            transcript=clean_live,
            detected_language=detected_lang,
            model_used=meta_model or "web-speech-en-NG",
            provider="browser_live_asr",
            label=f"Live Mic + Meta AI Correction" if meta_model else "Live Microphone ASR (en-NG)",
            latency_ms=latency_ms,
            fallback=False,
        )

    # 3. Offline / Demo Voice Fixtures (Honest Fallback)
    stem = filename.rsplit(".", 1)[0].lower()
    lookup_key = (fixture_id or stem).strip()
    if lookup_key in DEMO_VOICE_FIXTURES:
        text, lang = DEMO_VOICE_FIXTURES[lookup_key]
    else:
        try:
            decoded_stub = audio_bytes.decode("utf-8").strip()
            if decoded_stub.startswith("TRANSCRIPT:"):
                text = decoded_stub.split("TRANSCRIPT:", 1)[1].strip()
                lang = "pcm"
            else:
                digest_idx = int(hashlib.sha256(audio_bytes or b"default").hexdigest(), 16) % len(DEMO_VOICE_FIXTURES)
                default_key = list(DEMO_VOICE_FIXTURES.keys())[digest_idx]
                text, lang = DEMO_VOICE_FIXTURES[default_key]
        except Exception:
            digest_idx = int(hashlib.sha256(audio_bytes or b"default").hexdigest(), 16) % len(DEMO_VOICE_FIXTURES)
            default_key = list(DEMO_VOICE_FIXTURES.keys())[digest_idx]
            text, lang = DEMO_VOICE_FIXTURES[default_key]

    latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
    return ASRResult(
        transcript=text,
        detected_language=lang,
        model_used="none",
        provider="local_fallback",
        label="Sample transcript (no ASR run)",
        latency_ms=latency_ms,
        fallback=True,
    )
