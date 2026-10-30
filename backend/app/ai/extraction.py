"""Multilingual Intent & Slot Extraction Engine (`app/ai/extraction.py`).

Model chain (see app/ai/llm.py), one merged extraction + safety + clarification prompt:
Level 1: primary model (LLM_* env vars), configured timeout and one retry.
Level 2: fallback model (LLM_FALLBACK_* env vars), configured timeout and one retry.
Level 3: High-precision deterministic Abuja Multilingual Grammar & Gazetteer Extractor
        (rule-based, fallback=True; guarantees schema validity across English,
        Nigerian Pidgin, and Hausa even in offline/CI test environments).
The level that answered is recorded as `llm_level` in the returned trace metadata.
"""

from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Literal

from app.ai.landmarks.builder import get_active_landmark_index
from app.ai.llm import MetaLLMClient, label_model
from app.ai.schemas import ExtractionOutput, LandmarkKindLiteral, RelationalRef
from app.core.logging import get_logger

logger = get_logger(__name__)

_PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "extract_v1.md"

_HAUSA_MARKERS = {
    "ina", "zan", "je", "zuwa", "daga", "kujera", "daya", "biyu", "uku", "hudu",
    "kasuwar", "gadar", "sauke", "mota", "taimakoo", "sannu", "barka", "nawa",
}
_PIDGIN_MARKERS = {
    "abeg", "dey", "make", "una", "wetin", "waka", "enter", "moto", "drop",
    "comot", "o", "na", "wey", "carry", "reach", "how", "far", "wahala",
}

_SEAT_PATTERNS: list[tuple[re.Pattern[str], int]] = [
    (re.compile(r"\b(?:4|four|hudu)\s*(?:seats?|persons?|people|passengers?|kujera)?\b", re.I), 4),
    (re.compile(r"\bkujera\s*(?:4|hudu)\b", re.I), 4),
    (re.compile(r"\b(?:full\s*car|charter)\b", re.I), 4),
    (re.compile(r"\b(?:3|three|uku)\s*(?:seats?|persons?|people|passengers?|kujera)\b", re.I), 3),
    (re.compile(r"\bkujera\s*(?:3|uku)\b", re.I), 3),
    (re.compile(r"\b(?:2|two|biyu)\s*(?:seats?|persons?|people|passengers?|kujera)\b", re.I), 2),
    (re.compile(r"\bkujera\s*(?:2|biyu)\b", re.I), 2),
    (re.compile(r"\bme\s+and\s+my\s+(?:friend|sister|brother|wife|husband|madam|oga|pikin)\b", re.I), 2),
    (re.compile(r"\b(?:1|one|daya|single)\s*(?:seat|person|passenger|kujera)\b", re.I), 1),
    (re.compile(r"\bkujera\s*(?:1|daya)\b", re.I), 1),
    (re.compile(r"\bjust\s+me\b", re.I), 1),
]

_ORDINAL_MAP = {
    "first": 1, "1st": 1,
    "second": 2, "2nd": 2,
    "third": 3, "3rd": 3,
}

_RELATIONAL_RE = re.compile(
    r"\b(?:that\s+|the\s+)?(?:(?P<ordinal>first|1st|second|2nd|third|3rd)\s+)?"
    r"(?P<object>oando(?:\s+filling\s+station)?|conoil|nnpc|total|mobil|bovas|nipco|matrix|"
    r"shafa|rainoil|ap\s+station|filling\s+station|transformer|pedestrian\s+bridge|bridge|junction|gate|roundabout|market|bus\s+stop)\s+"
    r"(?P<relation>after|before|opposite|beside|past|near|by|under)\s+"
    r"(?P<anchor>[a-z0-9\s\-]{3,35}?)(?=$|[,.]|\s+(?:going|go|to|for|abeg|two|three|four|1|2|3|4|seat|kujera))",
    re.I,
)


def _load_system_prompt() -> str:
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text(encoding="utf-8")
    return "Extract Along Abuja transit intent and slots into JSON."


def detect_language(text: str) -> Literal["en", "pcm", "ha"]:
    """Detect English (`en`), Nigerian Pidgin (`pcm`), or Hausa (`ha`)."""
    tokens = set(re.findall(r"[a-z0-9']+", text.lower()))
    ha_hits = len(tokens & _HAUSA_MARKERS)
    pcm_hits = len(tokens & _PIDGIN_MARKERS)
    if ha_hits >= 1 and ha_hits >= pcm_hits:
        return "ha"
    if pcm_hits >= 1:
        return "pcm"
    return "en"


def _extract_seats(text: str) -> int:
    for pattern, count in _SEAT_PATTERNS:
        if pattern.search(text):
            return count
    return 1


def _clean_location_phrase(raw: str) -> str:
    cleaned = raw.strip(" ,.!?:;-")
    cleaned = re.sub(
        r"\s*(?:,?\s*(?:1|2|3|4|one|two|three|four)\s*(?:seats?|persons?|people)|"
        r"kujera\s*(?:daya|biyu|uku|hudu|1|2|3|4)|"
        r"with\s+(?:load|luggage|bag|box)|"
        r"women\s*only|female\s*only|"
        r"please|abeg|now\s*now|sharp\s*sharp)\b.*$",
        "",
        cleaned,
        flags=re.I,
    )
    cleaned = re.sub(
        r"^(?:at|in|for|inside|around|by|near|from|daga|ina)\s+",
        "",
        cleaned,
        flags=re.I,
    )
    return cleaned.strip(" ,.!?:;-")


def _infer_target_kind(obj_str: str) -> LandmarkKindLiteral:
    lower = obj_str.lower()
    if any(k in lower for k in ("oando", "conoil", "nnpc", "total", "mobil", "bovas", "nipco", "matrix", "shafa", "rainoil", "ap", "station")):
        return "FILLING_STATION"
    if "transformer" in lower:
        return "TRANSFORMER"
    if "bridge" in lower:
        return "BRIDGE"
    if "market" in lower:
        return "MARKET"
    if "gate" in lower:
        return "ESTATE_GATE"
    if "stop" in lower:
        return "BUS_STOP"
    return "JUNCTION"


def _extract_relational_ref(
    text: str,
    origin_mention: str | None,
    destination_mention: str | None,
) -> tuple[RelationalRef | None, Literal["origin", "destination"]]:
    match = _RELATIONAL_RE.search(text)
    if not match:
        return None, "destination"

    ord_word = (match.group("ordinal") or "first").lower()
    ordinal = _ORDINAL_MAP.get(ord_word, 1)
    obj_type = match.group("object").strip()
    relation_raw = match.group("relation").lower()
    relation_map: dict[str, Literal["AFTER", "BEFORE", "OPPOSITE", "NEAR", "UNDER"]] = {
        "after": "AFTER",
        "past": "AFTER",
        "before": "BEFORE",
        "opposite": "OPPOSITE",
        "beside": "NEAR",
        "near": "NEAR",
        "by": "NEAR",
        "under": "UNDER",
    }
    relation = relation_map.get(relation_raw, "AFTER")
    anchor_raw = _clean_location_phrase(match.group("anchor"))

    target_slot: Literal["origin", "destination"] = "destination"
    span_text = match.group(0).lower()
    if origin_mention and (span_text in origin_mention.lower() or origin_mention.lower() in span_text):
        target_slot = "origin"
    elif destination_mention and (span_text in destination_mention.lower() or destination_mention.lower() in span_text):
        target_slot = "destination"
    elif re.search(
        r"\b(?:i\s+dey|i\s+am\s+at|waiting\s+at|pick\s+me\s+(?:at|for)|from)\s+" + re.escape(span_text[:12]),
        text.lower(),
    ):
        target_slot = "origin"

    return (
        RelationalRef(
            target_kind=_infer_target_kind(obj_type),
            ordinal=ordinal,
            relation=relation,
            base_landmark_mention=anchor_raw,
        ),
        target_slot,
    )


def _match_known_landmarks_in_order(text: str) -> list[str]:
    """Scan utterance against known Abuja landmark aliases to extract ordered location spans."""
    index = get_active_landmark_index()
    lower = text.lower()
    matches: list[tuple[int, int, str]] = []

    sorted_entries = sorted(index.entries, key=lambda e: len(e.alias), reverse=True)
    occupied: list[tuple[int, int]] = []

    for entry in sorted_entries:
        alias = entry.alias.lower()
        if len(alias) < 4:
            continue
        pattern = re.compile(r"\b" + re.escape(alias) + r"\b", re.I)
        m = pattern.search(lower)
        if m:
            start, end = m.span()
            if any(not (end <= s or start >= e) for s, e in occupied):
                continue
            occupied.append((start, end))
            matches.append((start, end, text[start:end]))

    matches.sort(key=lambda item: item[0])
    return [m[2] for m in matches]


def extract_deterministic(
    utterance: str,
    missing_slot_context: Literal["origin", "destination"] | None = None,
) -> ExtractionOutput:
    """Deterministic Abuja Multilingual NLU engine (Tier 3 / zero-latency local extraction)."""
    text = utterance.strip()
    lower = text.lower()
    lang = detect_language(text)
    seats = _extract_seats(text)

    # 1. Check SOS / Emergency intent
    if re.search(
        r"\b(?:sos|help\s+me|emergency|kidnap|one\s*chance|robbery|gun|danger|save\s+me|"
        r"driver\s+refused\s+to\s+stop|taimakoo|bari\s+ni)\b",
        lower,
    ):
        return ExtractionOutput(
            detected_locale=lang,
            intent="REPORT_SOS",
            seat_count_requested=seats,
            confidence=0.99,
            reasoning_brief="SOS / distress keyword detected.",
            model_used="none",
        )

    # 2. Check Cancel intent
    if re.search(
        r"\b(?:cancel|stop\s+booking|no\s+go\s+again|i\s+no\s+go\s+again|fasa|soke|abort|refund)\b",
        lower,
    ):
        return ExtractionOutput(
            detected_locale=lang,
            intent="CANCEL_RIDE",
            seat_count_requested=seats,
            confidence=0.96,
            reasoning_brief="Cancel booking intent detected.",
            model_used="none",
        )

    # 3. Check Confirm intent
    if re.fullmatch(
        r"(?:yes|yep|yeah|confirm|confirmed|pay|book\s+it|i\s+don\s+pay|oya\s+book|toh|eh|ok\s+book|proceed)",
        lower.strip(" .!"),
    ):
        return ExtractionOutput(
            detected_locale=lang,
            intent="CONFIRM_YES",
            seat_count_requested=seats,
            confidence=0.97,
            reasoning_brief="Explicit confirmation detected.",
            model_used="none",
        )

    # 4. Check Status intent
    if re.search(
        r"\b(?:where\s+is\s+my\s+(?:driver|pod|ride)|check\s+status|booking\s+status|"
        r"how\s+far\s+my\s+(?:ride|moto)|ina\s+mota\s+ta)\b",
        lower,
    ):
        return ExtractionOutput(
            detected_locale=lang,
            intent="CHECK_STATUS",
            seat_count_requested=seats,
            confidence=0.95,
            reasoning_brief="Status check intent detected.",
            model_used="none",
        )

    # 5. Check Rating intent
    rating_match = re.search(r"\b([1-5])\s*(?:stars?|/5|out\s+of\s+5)\b", lower)
    if rating_match or re.fullmatch(r"[1-5]", lower.strip()):
        stars = int(rating_match.group(1) if rating_match else lower.strip())
        return ExtractionOutput(
            detected_locale=lang,
            intent="RATE_RIDE",
            rating_stars=stars,
            seat_count_requested=1,
            confidence=0.98,
            reasoning_brief=f"Extracted {stars}-star trip rating.",
            model_used="none",
        )

    # 6. Extract Origin & Destination via bilingual/trilingual transit grammar patterns
    origin_raw: str | None = None
    destination_raw: str | None = None

    grammar_patterns = [
        re.compile(
            r"\bfrom\s+(?P<orig>[^,.]+?)(?:,?\s*(?:drop\s+me\s+(?:for|at)|going\s+to|heading\s+to|make\s+i\s+reach|carry\s+me\s+(?:go|reach)|go\s+|to\s+))(?P<dest>.+)$",
            re.I,
        ),
        re.compile(
            r"\b(?:i\s+dey|i\s+am\s+at|i'm\s+at|we\s+dey|waiting\s+(?:at|for))\s+(?P<orig>[^,.]+?)"
            r"(?:,?\s*(?:(?:1|2|3|4|one|two|three|four)\s*seats?\s*)?(?:going\s+to|heading\s+to|drop\s+me\s+(?:for|at)|carry\s+me\s+(?:go|reach)|make\s+i\s+(?:reach|enter\s+go)|go\s+|to\s+))(?P<dest>.+)$",
            re.I,
        ),
        re.compile(
            r"\b(?:ina|daga)\s+(?P<orig>.+?)\s+(?:zan\s+je|zuwa|sauke\s+ni\s+a)\s+(?P<dest>.+)$",
            re.I,
        ),
        re.compile(
            r"^(?:along\s+|abeg\s+|please\s+)?(?P<orig>[a-z0-9\s\-']{3,35}?)\s+(?:to|->|zuwa)\s+(?P<dest>[a-z0-9\s\-']{3,45})$",
            re.I,
        ),
    ]

    for pat in grammar_patterns:
        m = pat.search(text)
        if m:
            origin_raw = _clean_location_phrase(m.group("orig"))
            destination_raw = _clean_location_phrase(m.group("dest"))
            break

    if not origin_raw and not destination_raw:
        dest_only = re.search(
            r"\b(?:going\s+to|heading\s+to|drop\s+me\s+(?:for|at)|take\s+me\s+to|carry\s+me\s+(?:go|reach)|zan\s+je|zuwa)\s+(?P<dest>.+)$",
            text,
            re.I,
        )
        orig_only = re.search(
            r"\b(?:i\s+dey|i\s+am\s+at|i'm\s+at|pick\s+me\s+(?:at|from|for)|waiting\s+(?:at|for)|from|daga|ina)\s+(?P<orig>.+)$",
            text,
            re.I,
        )
        if dest_only and not orig_only:
            destination_raw = _clean_location_phrase(dest_only.group("dest"))
        elif orig_only and not dest_only:
            origin_raw = _clean_location_phrase(orig_only.group("orig"))

    if not origin_raw and not destination_raw:
        gazetteer_hits = _match_known_landmarks_in_order(text)
        if len(gazetteer_hits) >= 2:
            origin_raw = gazetteer_hits[0]
            destination_raw = gazetteer_hits[1]
        elif len(gazetteer_hits) == 1:
            if missing_slot_context == "destination":
                destination_raw = gazetteer_hits[0]
            else:
                origin_raw = gazetteer_hits[0]

    rel_ref, rel_slot = _extract_relational_ref(text, origin_raw, destination_raw)
    origin_rel = rel_ref if rel_slot == "origin" else None
    dest_rel = rel_ref if rel_slot == "destination" else None

    if origin_raw or destination_raw or rel_ref is not None:
        intent_val = "PROVIDE_SLOT" if missing_slot_context else "BOOK_RIDE"
        return ExtractionOutput(
            detected_locale=lang,
            intent=intent_val,
            origin_mention=origin_raw,
            origin_relational=origin_rel,
            destination_mention=destination_raw,
            destination_relational=dest_rel,
            seat_count_requested=seats,
            has_relational_modifier=rel_ref is not None,
            confidence=0.95,
            reasoning_brief="Extracted Abuja corridor route slots via rule-based patterns.",
            model_used="none",
        )

    if re.search(r"\b(?:hello|hi|hey|good\s+morning|how\s+far|sannu|ina\s+kwana|help|how\s+it\s+works)\b", lower):
        return ExtractionOutput(
            detected_locale=lang,
            intent="FAQ_OR_HELP",
            seat_count_requested=1,
            confidence=0.90,
            reasoning_brief="Greeting or general help inquiry.",
            model_used="none",
        )

    return ExtractionOutput(
        detected_locale=lang,
        intent="UNKNOWN",
        seat_count_requested=1,
        confidence=0.55,
        reasoning_brief="No recognizable transit intent or landmark found.",
        model_used="none",
    )


async def extract_intent_and_slots(
    utterance: str,
    *,
    missing_slot_context: Literal["origin", "destination"] | None = None,
    llm_client: MetaLLMClient | None = None,
) -> tuple[ExtractionOutput, dict[str, object]]:
    """Run entity extraction through primary -> fallback -> rule-based, recording the level."""
    start = time.perf_counter()
    client = llm_client or MetaLLMClient()
    system_prompt = _load_system_prompt()
    chain_error: str | None = None
    attempts: list[dict[str, object]] = []

    if client.is_live_api_configured():
        try:
            extraction_max_tokens = int(getattr(client.settings, "LLM_MAX_TOKENS", 1500))
            res = await client.complete_json(
                system_prompt=system_prompt,
                user_message=utterance,
                temperature=0.0,
                max_tokens=extraction_max_tokens,
                validate=ExtractionOutput.model_validate,
            )
            attempts = list(res.attempts)
            if res.parsed_json is not None and res.level != "rule_based":
                parsed = ExtractionOutput.model_validate({**res.parsed_json, "model_used": res.model_used})
                # Hybrid enrichment: if LLM missed a relational ref or known gazetteer landmark, merge deterministic hit
                det = extract_deterministic(utterance, missing_slot_context=missing_slot_context)
                if not parsed.origin_mention and det.origin_mention:
                    parsed.origin_mention = det.origin_mention
                if not parsed.destination_mention and det.destination_mention:
                    parsed.destination_mention = det.destination_mention
                if not parsed.origin_relational and det.origin_relational:
                    parsed.origin_relational = det.origin_relational
                if not parsed.destination_relational and det.destination_relational:
                    parsed.destination_relational = det.destination_relational
                    parsed.has_relational_modifier = True
                if parsed.seat_count_requested == 1 and det.seat_count_requested > 1:
                    parsed.seat_count_requested = det.seat_count_requested
                return parsed, {
                    "tier": "live_llm",
                    "llm_level": res.level,
                    "model": res.model_used,
                    "label": label_model(res.model_used),
                    "provider": res.provider,
                    "latency_ms": res.latency_ms,
                    "fallback": False,
                    "attempts": attempts,
                }
            chain_error = res.error
        except Exception as exc:
            chain_error = f"{type(exc).__name__}: {str(exc)[:200]}"
            logger.warning("llm_extraction_fallback_to_deterministic", error=chain_error)

    output = extract_deterministic(utterance, missing_slot_context=missing_slot_context)
    latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
    return output, {
        "tier": "rule_based_fallback",
        "llm_level": "rule_based",
        "model": "none",
        "label": "none",
        "provider": "local_fallback",
        "latency_ms": latency_ms,
        "fallback": True,
        "chain_error": chain_error,
        "attempts": attempts,
    }


async def generate_disambiguation_clarification(
    landmark_query: str,
    candidates: list[str],
    locale: str,
    llm_client: MetaLLMClient | None = None,
) -> tuple[str, bool]:
    """Generate a natural clarifying question using Glimmer or honest rule fallback."""
    client = llm_client or MetaLLMClient()
    if client.is_live_api_configured():
        sys_prompt = (
            f"You are Along AI, an Abuja corridor transit bot. The user said '{landmark_query}', "
            f"which matches multiple locations: {candidates}. "
            f"Ask a friendly, 1-sentence clarifying question in {locale} (English, Nigerian Pidgin, or Hausa). "
            "Return JSON: {\"clarification\": \"<question>\"}"
        )
        try:
            res = await client.complete_json(
                system_prompt=sys_prompt,
                user_message=landmark_query,
                max_tokens=128,
                validate=lambda d: d["clarification"],
            )
            if res.parsed_json and "clarification" in res.parsed_json:
                return str(res.parsed_json["clarification"]), False
        except Exception as exc:
            logger.warning("clarification_generation_fallback", error=str(exc))

    opts_str = " or ".join(candidates[:3])
    if locale == "ha":
        return f"Wane wurin kake nufi: {opts_str}?", True
    if locale == "pcm":
        return f"Which one you mean: {opts_str}?", True
    return f"Which location did you mean: {opts_str}?", True

