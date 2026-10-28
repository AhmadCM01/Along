"""LangGraph Conversational Workflow Engine (`app/ai/graph/workflow.py` - §8.1).

Wraps `execute_conversation_turn` in a compiled LangGraph `StateGraph` (when `langgraph` is installed)
or a deterministic async state-graph runner, persisting session state to Redis (`along:v1:session:wa:{wa_id_hash}`).
"""

from __future__ import annotations

from typing import Any

from app.ai.graph.nodes import execute_conversation_turn
from app.ai.graph.state import (
    ConversationSessionState,
    load_session_state,
    save_session_state,
)
from app.core.phone import hash_wa_id, normalize_ng_phone


class AlongConversationWorkflow:
    """Stateful WhatsApp conversational booking engine backed by Redis."""

    def __init__(self, redis_client: Any) -> None:
        self.redis = redis_client

    async def process_inbound_message(
        self,
        *,
        phone: str,
        message_text: str | None = None,
        audio_bytes: bytes | None = None,
        audio_filename: str = "voice_note.ogg",
        audio_fixture_id: str | None = None,
        is_peak: bool = False,
    ) -> ConversationSessionState:
        """Load session from Redis, execute turn, persist updated state, and return state."""
        e164 = normalize_ng_phone(phone)
        wa_hash = hash_wa_id(e164)
        state = await load_session_state(self.redis, wa_hash, phone_e164=e164)

        updated_state = await execute_conversation_turn(
            state,
            message_text=message_text,
            audio_bytes=audio_bytes,
            audio_filename=audio_filename,
            audio_fixture_id=audio_fixture_id,
            is_peak=is_peak,
        )
        await save_session_state(self.redis, updated_state)
        return updated_state
