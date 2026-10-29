"""Vehicle Check via Vision Model (app/ai/vision_sam.py).

Vehicle check sends driver car photo to configured vision model (e.g. Llama Vision)
to extract visible plate text and car colour as JSON, comparing against the registered plate.
Labeled: "Llama vision check".
If the confidence is low or the plate is not legible, it reports that instead of passing.
Fallback paths return provider="local_fallback", model_used="none", fallback=True.
"""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class VehicleCheckResult:
    """Structured output of the driver vehicle photo check."""

    verified: bool
    model_used: str
    provider: str
    label: str
    fallback: bool
    plate_extracted: str
    color_extracted: str
    plate_matched: bool
    latency_ms: float
    verification_note: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "verified": self.verified,
            "model_used": self.model_used,
            "provider": self.provider,
            "label": self.label,
            "fallback": self.fallback,
            "plate_extracted": self.plate_extracted,
            "color_extracted": self.color_extracted,
            "plate_matched": self.plate_matched,
            "latency_ms": self.latency_ms,
            "verification_note": self.verification_note,
        }


# Type alias for backward compatibility with existing tests
SAMVehicleVerificationResult = VehicleCheckResult


async def check_vehicle_photo_vision(
    image_bytes: bytes,
    *,
    expected_plate: str = "ABJ-412K",
    declared_seats: int = 4,
) -> VehicleCheckResult:
    """Extract plate text and vehicle color via configured vision model with honest fallback."""
    start = time.perf_counter()
    settings = get_settings()
    llm_key = settings.get_effective_llm_key()

    if not image_bytes or len(image_bytes) < 16:
        return VehicleCheckResult(
            verified=False,
            model_used="none",
            provider="local_fallback",
            label="Llama vision check",
            fallback=True,
            plate_extracted="",
            color_extracted="",
            plate_matched=False,
            latency_ms=round((time.perf_counter() - start) * 1000.0, 2),
            verification_note="Invalid or empty vehicle image payload.",
        )

    if llm_key:
        try:
            b64_img = base64.b64encode(image_bytes).decode("ascii")
            url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
            prompt = (
                "Look at this vehicle photo. Extract the license plate number, vehicle colour, "
                "confidence (HIGH, MEDIUM, LOW), and whether the plate is legible (true or false). "
                "Respond in JSON format only: {\"plate\": \"<plate_text>\", \"color\": \"<car_color>\", "
                "\"legible\": true, \"confidence\": \"HIGH\"}."
            )
            payload = {
                "model": settings.LLM_MODEL,
                "temperature": 0.0,
                "max_tokens": 128,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"},
                            },
                        ],
                    }
                ],
            }
            timeout_val = float(settings.LLM_TIMEOUT_SECONDS)
            async with httpx.AsyncClient(timeout=timeout_val) as client:
                resp = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {llm_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

            raw_txt = data["choices"][0]["message"]["content"]
            model_id = str(data.get("model") or settings.LLM_MODEL)
            # Parse JSON from content
            clean = raw_txt.strip()
            if "```json" in clean:
                clean = clean.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in clean:
                clean = clean.split("```", 1)[1].split("```", 1)[0].strip()
            parsed = json.loads(clean)

            is_legible = bool(parsed.get("legible", True))
            confidence = str(parsed.get("confidence", "HIGH")).upper()
            extracted_plate = str(parsed.get("plate", "")).upper().replace(" ", "").replace("-", "")
            expected_clean = expected_plate.upper().replace(" ", "").replace("-", "")
            color = str(parsed.get("color", "unknown"))
            latency_ms = round((time.perf_counter() - start) * 1000.0, 2)

            if not is_legible or confidence == "LOW" or not extracted_plate:
                return VehicleCheckResult(
                    verified=False,
                    model_used=model_id,
                    provider=settings.LLM_PROVIDER_LABEL,
                    label="Llama vision check",
                    fallback=False,
                    plate_extracted=extracted_plate,
                    color_extracted=color,
                    plate_matched=False,
                    latency_ms=latency_ms,
                    verification_note="Plate is not legible or confidence is low in vehicle photo.",
                )

            matched = bool(extracted_plate and (extracted_plate in expected_clean or expected_clean in extracted_plate))
            note = (
                f"Llama vision check: verified plate {extracted_plate} ({color}), matched {expected_plate}"
                if matched
                else f"Llama vision check: extracted plate {extracted_plate} ({color}) does not match {expected_plate}"
            )

            return VehicleCheckResult(
                verified=matched,
                model_used=model_id,
                provider=settings.LLM_PROVIDER_LABEL,
                label="Llama vision check",
                fallback=False,
                plate_extracted=extracted_plate,
                color_extracted=color,
                plate_matched=matched,
                latency_ms=latency_ms,
                verification_note=note,
            )
        except Exception as exc:
            logger.warning("llama_vision_check_failed_fallback", error=str(exc))

    latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
    return VehicleCheckResult(
        verified=False,
        model_used="none",
        provider="local_fallback",
        label="Llama vision check",
        fallback=True,
        plate_extracted="",
        color_extracted="",
        plate_matched=False,
        latency_ms=latency_ms,
        verification_note="Vision model not configured or call failed; fallback used.",
    )


# Backward-compatible wrapper
async def verify_vehicle_photo_sam(
    image_bytes: bytes,
    *,
    expected_plate: str = "ABJ-412K",
    declared_seats: int = 4,
) -> VehicleCheckResult:
    """Backward-compatible entry point delegating to check_vehicle_photo_vision."""
    return await check_vehicle_photo_vision(
        image_bytes,
        expected_plate=expected_plate,
        declared_seats=declared_seats,
    )
