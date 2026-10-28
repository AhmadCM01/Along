"""LangGraph Conversational Nodes (`app/ai/graph/nodes.py` - §8.1)."""

from __future__ import annotations

import time
from typing import Any

from app.ai.asr import transcribe_voice_note
from app.ai.extraction import extract_intent_and_slots
from app.ai.graph.state import ConversationSessionState, DisambiguationOption
from app.ai.guard import check_input_safety
from app.ai.landmarks.resolver import resolve_landmark_mention, resolve_route_and_quote
from app.ai.templates import render_template
from app.core.ids import generate_boarding_otp, generate_short_code, generate_share_token, new_uuid7_str
from app.core.money import format_naira


def _format_disambiguation_list(options: list[DisambiguationOption]) -> str:
    lines = []
    for opt in options:
        lines.append(f"*{opt.index}.* {opt.canonical_name} ({opt.area})")
    return "\n".join(lines)


async def execute_conversation_turn(
    state: ConversationSessionState,
    *,
    message_text: str | None = None,
    audio_bytes: bytes | None = None,
    audio_filename: str = "voice_note.ogg",
    audio_fixture_id: str | None = None,
    is_peak: bool = False,
) -> ConversationSessionState:
    """Execute one full turn of the Along WhatsApp conversational state machine."""
    turn_start = time.perf_counter()
    state.turn_count += 1
    state.last_buttons = []

    xray: dict[str, Any] = {
        "turn": state.turn_count,
        "prev_stage": state.stage,
        "asr": None,
        "guard": None,
        "extraction": None,
        "resolution": None,
    }

    # 1. ASR Node (if voice note payload provided)
    effective_text = (message_text or "").strip()
    if audio_bytes is not None:
        asr_res = await transcribe_voice_note(
            audio_bytes,
            filename=audio_filename,
            fixture_id=audio_fixture_id,
        )
        effective_text = asr_res.transcript
        state.locale = asr_res.detected_language if asr_res.detected_language in ("en", "pcm", "ha") else state.locale  # type: ignore[assignment]
        xray["asr"] = {
            "transcript": asr_res.transcript,
            "detected_language": asr_res.detected_language,
            "model_used": asr_res.model_used,
            "provider": asr_res.provider,
            "latency_ms": asr_res.latency_ms,
        }

    # 2. Safety Guard Node (< 2ms SOS & prompt-injection check)
    guard_res = check_input_safety(effective_text)
    xray["guard"] = {
        "verdict": guard_res.verdict,
        "reason": guard_res.reason,
        "latency_ms": guard_res.latency_ms,
    }

    if guard_res.verdict == "SOS_TRIGGER":
        state.stage = "SOS_ACTIVE"
        state.last_reply_text = render_template("sos_triggered", state.locale)
        xray["next_stage"] = state.stage
        xray["total_turn_ms"] = round((time.perf_counter() - turn_start) * 1000.0, 2)
        state.xray_trace = xray
        return state

    if guard_res.verdict == "BLOCKED":
        state.last_reply_text = render_template("blocked_message", state.locale)
        xray["next_stage"] = state.stage
        xray["total_turn_ms"] = round((time.perf_counter() - turn_start) * 1000.0, 2)
        state.xray_trace = xray
        return state

    # 3. Check if user is replying to a numeric disambiguation prompt (1, 2, or 3)
    if state.stage in ("DISAMBIGUATING_ORIGIN", "DISAMBIGUATING_DEST") and effective_text.strip() in ("1", "2", "3"):
        chosen_idx = int(effective_text.strip())
        chosen_opt = next((o for o in state.disambiguation_options if o.index == chosen_idx), None)
        if chosen_opt is not None:
            if state.stage == "DISAMBIGUATING_ORIGIN":
                state.origin_mention = chosen_opt.canonical_name
                state.origin_landmark_id = chosen_opt.landmark_id
                state.origin_name = chosen_opt.canonical_name
                state.origin_zone_id = chosen_opt.zone_id
                state.origin_lat = chosen_opt.lat
                state.origin_lng = chosen_opt.lng
                state.origin_km_marker = chosen_opt.km_marker
                state.disambiguation_options = []
                if not state.destination_mention:
                    state.stage = "AWAITING_DESTINATION"
                    state.last_reply_text = render_template(
                        "ask_destination",
                        state.locale,
                        origin_name=state.origin_name,
                    )
                    xray["next_stage"] = state.stage
                    state.xray_trace = xray
                    return state
            else:
                state.destination_mention = chosen_opt.canonical_name
                state.destination_landmark_id = chosen_opt.landmark_id
                state.destination_name = chosen_opt.canonical_name
                state.destination_zone_id = chosen_opt.zone_id
                state.destination_lat = chosen_opt.lat
                state.destination_lng = chosen_opt.lng
                state.destination_km_marker = chosen_opt.km_marker
                state.disambiguation_options = []

    # 4. Determine missing slot context for single-slot replies
    missing_context = None
    if state.stage in ("AWAITING_ORIGIN", "DISAMBIGUATING_ORIGIN"):
        missing_context = "origin"
    elif state.stage in ("AWAITING_DESTINATION", "DISAMBIGUATING_DEST"):
        missing_context = "destination"

    # 5. Multilingual Slot Extraction Node (Muse Spark -> Muse Wonder -> Deterministic Abuja NLU)
    extracted, ext_meta = await extract_intent_and_slots(
        effective_text,
        missing_slot_context=missing_context,  # type: ignore[arg-type]
    )
    if state.turn_count == 1 or extracted.detected_locale != "en":
        state.locale = extracted.detected_locale

    xray["extraction"] = {
        "intent": extracted.intent,
        "detected_locale": extracted.detected_locale,
        "origin_mention": extracted.origin_mention,
        "destination_mention": extracted.destination_mention,
        "origin_relational": extracted.origin_relational.model_dump() if extracted.origin_relational else None,
        "destination_relational": extracted.destination_relational.model_dump() if extracted.destination_relational else None,
        "seats": extracted.seat_count_requested,
        "confidence": extracted.confidence,
        **ext_meta,
    }

    # 6. Handle global intents: REPORT_SOS, CANCEL_RIDE, CHECK_STATUS, RATE_RIDE, CONFIRM_YES
    if extracted.intent == "REPORT_SOS":
        state.stage = "SOS_ACTIVE"
        state.last_reply_text = render_template("sos_triggered", state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if extracted.intent in ("CANCEL_RIDE", "CONFIRM_NO"):
        state.stage = "CANCELLED"
        state.origin_mention = None
        state.destination_mention = None
        state.last_reply_text = render_template("booking_cancelled", state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if extracted.intent == "CHECK_STATUS":
        state.last_reply_text = render_template(
            "status_update",
            state.locale,
            stage=state.stage,
            origin_name=state.origin_name or "Unset",
            dest_name=state.destination_name or "Unset",
            anchor_name=state.anchor_name or "Pending",
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if extracted.intent == "RATE_RIDE" and extracted.rating_stars is not None:
        state.stage = "COMPLETED"
        state.last_reply_text = render_template(
            "rating_recorded",
            state.locale,
            stars=extracted.rating_stars,
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if extracted.intent == "CONFIRM_YES" and state.stage == "AWAITING_CONFIRMATION":
        state.stage = "POOLING"
        state.request_id = state.request_id or new_uuid7_str()
        state.request_code = state.request_code or generate_short_code("REQ")
        state.boarding_otp = state.boarding_otp or generate_boarding_otp()
        state.share_token = state.share_token or generate_share_token()
        state.last_reply_text = render_template(
            "pooling_started",
            state.locale,
            request_code=state.request_code,
            anchor_name=state.anchor_name or state.origin_name or "Corridor Anchor",
            dest_name=state.destination_name or "Destination",
            total_fare_naira=format_naira(state.total_fare_kobo),
            seats=state.seats,
            current_seats=min(4, state.seats + 1),
        )
        xray["next_stage"] = state.stage
        xray["total_turn_ms"] = round((time.perf_counter() - turn_start) * 1000.0, 2)
        state.xray_trace = xray
        return state

    # 7. Merge newly extracted slots into session state
    if extracted.seat_count_requested and (extracted.seat_count_requested > 1 or state.seats == 1):
        state.seats = extracted.seat_count_requested

    if extracted.origin_mention:
        state.origin_mention = extracted.origin_mention
    if extracted.destination_mention:
        state.destination_mention = extracted.destination_mention

    # If user replied with a single landmark while in AWAITING_DESTINATION, assign it to destination
    if missing_context == "destination" and not state.destination_mention and extracted.origin_mention:
        state.destination_mention = extracted.origin_mention

    # 8. Check if both slots are empty
    if not state.origin_mention and not state.destination_mention and not extracted.origin_relational and not extracted.destination_relational:
        state.stage = "AWAITING_ORIGIN"
        key = "welcome_help" if extracted.intent == "FAQ_OR_HELP" else "ask_both_slots"
        state.last_reply_text = render_template(key, state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    # 9. If origin is present but destination is missing, resolve origin first and ask for destination
    if (state.origin_mention or extracted.origin_relational) and not state.destination_mention and not extracted.destination_relational:
        orig_res = resolve_landmark_mention(
            state.origin_mention,
            relational=extracted.origin_relational,
        )
        if orig_res.status == "DISAMBIGUATE" and orig_res.candidates:
            state.stage = "DISAMBIGUATING_ORIGIN"
            state.disambiguation_options = [
                DisambiguationOption(
                    index=idx + 1,
                    landmark_id=c.landmark_id,
                    canonical_name=c.canonical_name,
                    corridor_id=c.corridor_id,
                    zone_id=c.zone_id,
                    area=c.area,
                    lat=c.lat,
                    lng=c.lng,
                    km_marker=c.km_marker,
                )
                for idx, c in enumerate(orig_res.candidates[:3])
            ]
            state.last_reply_text = render_template(
                "disambiguate_origin",
                state.locale,
                options_text=_format_disambiguation_list(state.disambiguation_options),
            )
            xray["next_stage"] = state.stage
            state.xray_trace = xray
            return state

        if orig_res.best is not None:
            state.origin_landmark_id = orig_res.best.landmark_id
            state.origin_name = orig_res.best.canonical_name
            state.origin_zone_id = orig_res.best.zone_id
            state.origin_lat = orig_res.best.lat
            state.origin_lng = orig_res.best.lng
            state.origin_km_marker = orig_res.best.km_marker
            state.corridor_id = orig_res.best.corridor_id
            state.stage = "AWAITING_DESTINATION"
            state.last_reply_text = render_template(
                "ask_destination",
                state.locale,
                origin_name=state.origin_name,
            )
            xray["next_stage"] = state.stage
            state.xray_trace = xray
            return state

        state.stage = "AWAITING_ORIGIN"
        state.last_reply_text = render_template("ask_origin", state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    # 10. If destination is present but origin is missing, ask for origin
    if (state.destination_mention or extracted.destination_relational) and not state.origin_mention and not extracted.origin_relational:
        state.stage = "AWAITING_ORIGIN"
        state.last_reply_text = render_template("ask_origin", state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    # 11. Both origin and destination are present -> Resolve full route, snap to Anchor, and compute Fare Quote
    quote = resolve_route_and_quote(
        origin_mention=state.origin_mention,
        destination_mention=state.destination_mention,
        origin_relational=extracted.origin_relational,
        destination_relational=extracted.destination_relational,
        is_peak=is_peak,
    )

    xray["resolution"] = {
        "status": quote.status,
        "corridor_id": quote.corridor_id,
        "direction": quote.direction,
        "origin_best": quote.origin.best.canonical_name if quote.origin.best else None,
        "origin_score": quote.origin.best.final_score if quote.origin.best else 0.0,
        "destination_best": quote.destination.best.canonical_name if quote.destination.best else None,
        "destination_score": quote.destination.best.final_score if quote.destination.best else 0.0,
        "anchor_id": quote.anchor_snap.anchor.id if (quote.anchor_snap and quote.anchor_snap.anchor) else None,
        "anchor_name": quote.anchor_snap.anchor.name if (quote.anchor_snap and quote.anchor_snap.anchor) else None,
        "active_fare_kobo": quote.active_fare_kobo,
    }

    if quote.status == "SHORT_TRIP":
        state.stage = "AWAITING_DESTINATION"
        state.destination_mention = None
        state.last_reply_text = render_template(
            "short_trip_rejected",
            state.locale,
            origin_name=quote.origin.best.canonical_name if quote.origin.best else "Origin",
            dest_name=quote.destination.best.canonical_name if quote.destination.best else "Destination",
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if quote.status == "DISAMBIGUATE_ORIGIN" and quote.origin.candidates:
        state.stage = "DISAMBIGUATING_ORIGIN"
        state.disambiguation_options = [
            DisambiguationOption(
                index=idx + 1,
                landmark_id=c.landmark_id,
                canonical_name=c.canonical_name,
                corridor_id=c.corridor_id,
                zone_id=c.zone_id,
                area=c.area,
                lat=c.lat,
                lng=c.lng,
                km_marker=c.km_marker,
            )
            for idx, c in enumerate(quote.origin.candidates[:3])
        ]
        state.last_reply_text = render_template(
            "disambiguate_origin",
            state.locale,
            options_text=_format_disambiguation_list(state.disambiguation_options),
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if quote.status == "DISAMBIGUATE_DEST" and quote.destination.candidates:
        state.stage = "DISAMBIGUATING_DEST"
        state.disambiguation_options = [
            DisambiguationOption(
                index=idx + 1,
                landmark_id=c.landmark_id,
                canonical_name=c.canonical_name,
                corridor_id=c.corridor_id,
                zone_id=c.zone_id,
                area=c.area,
                lat=c.lat,
                lng=c.lng,
                km_marker=c.km_marker,
            )
            for idx, c in enumerate(quote.destination.candidates[:3])
        ]
        state.last_reply_text = render_template(
            "disambiguate_destination",
            state.locale,
            options_text=_format_disambiguation_list(state.disambiguation_options),
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if quote.origin.best is None:
        state.stage = "AWAITING_ORIGIN"
        state.last_reply_text = render_template("ask_origin", state.locale)
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    if quote.destination.best is None:
        state.stage = "AWAITING_DESTINATION"
        state.origin_name = quote.origin.best.canonical_name
        state.last_reply_text = render_template(
            "ask_destination",
            state.locale,
            origin_name=state.origin_name,
        )
        xray["next_stage"] = state.stage
        state.xray_trace = xray
        return state

    # 12. Route & Anchor Quote is complete! Populate session state and present quote
    orig_lmk = quote.origin.best
    dest_lmk = quote.destination.best
    state.corridor_id = quote.corridor_id
    state.direction = quote.direction
    state.origin_landmark_id = orig_lmk.landmark_id
    state.origin_name = orig_lmk.canonical_name
    state.origin_zone_id = orig_lmk.zone_id
    state.origin_lat = orig_lmk.lat
    state.origin_lng = orig_lmk.lng
    state.origin_km_marker = orig_lmk.km_marker

    state.destination_landmark_id = dest_lmk.landmark_id
    state.destination_name = dest_lmk.canonical_name
    state.destination_zone_id = dest_lmk.zone_id
    state.destination_lat = dest_lmk.lat
    state.destination_lng = dest_lmk.lng
    state.destination_km_marker = dest_lmk.km_marker

    if quote.anchor_snap and quote.anchor_snap.anchor:
        state.anchor_id = quote.anchor_snap.anchor.id
        state.anchor_name = quote.anchor_snap.anchor.name
    else:
        state.anchor_id = f"ANC-{orig_lmk.landmark_id}"
        state.anchor_name = orig_lmk.canonical_name

    state.unit_fare_kobo = quote.active_fare_kobo
    state.total_fare_kobo = quote.active_fare_kobo * state.seats
    state.savings_pct = quote.savings_pct
    state.stage = "AWAITING_CONFIRMATION"

    state.last_reply_text = render_template(
        "quote_ready",
        state.locale,
        corridor_id=state.corridor_id,
        anchor_name=state.anchor_name,
        origin_name=state.origin_name,
        dest_name=state.destination_name,
        seats=state.seats,
        unit_fare_naira=format_naira(state.unit_fare_kobo),
        savings_pct=state.savings_pct,
        total_fare_naira=format_naira(state.total_fare_kobo),
    )
    state.last_buttons = [
        {"id": "CONFIRM_YES", "title": "YES, Lock Seat"},
        {"id": "CANCEL_RIDE", "title": "Cancel"},
    ]

    xray["next_stage"] = state.stage
    xray["total_turn_ms"] = round((time.perf_counter() - turn_start) * 1000.0, 2)
    state.xray_trace = xray
    return state
