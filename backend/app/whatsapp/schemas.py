"""WhatsApp Cloud API v21.0 Webhook & Outbound Schemas (`app/whatsapp/schemas.py`)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class InboundWhatsAppMessage(BaseModel):
    """Normalized inbound WhatsApp message (from Meta Cloud API or Judge Cockpit Emulator)."""

    message_id: str
    from_phone: str
    timestamp: str
    msg_type: Literal["text", "audio", "interactive", "button"] = "text"
    text_body: str | None = None
    audio_media_id: str | None = None
    audio_fixture_id: str | None = None
    button_reply_id: str | None = None


class OutboundWhatsAppMessage(BaseModel):
    """Normalized outbound WhatsApp message (text or interactive buttons)."""

    to_phone: str
    text_body: str
    buttons: list[dict[str, str]] = Field(default_factory=list)
    correlation_id: str | None = None


def parse_meta_webhook_payload(payload: dict[str, Any]) -> list[InboundWhatsAppMessage]:
    """Extract normalized `InboundWhatsAppMessage` objects from a Meta Graph API webhook payload."""
    messages: list[InboundWhatsAppMessage] = []

    # Support simplified Judge Cockpit / test payload format directly
    if "message_id" in payload and "from_phone" in payload:
        messages.append(InboundWhatsAppMessage.model_validate(payload))
        return messages

    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            raw_msgs = value.get("messages", [])
            for raw in raw_msgs:
                msg_id = str(raw.get("id", ""))
                from_phone = str(raw.get("from", ""))
                ts = str(raw.get("timestamp", "0"))
                mtype = str(raw.get("type", "text"))

                if mtype == "text":
                    body = raw.get("text", {}).get("body", "")
                    messages.append(
                        InboundWhatsAppMessage(
                            message_id=msg_id,
                            from_phone=from_phone,
                            timestamp=ts,
                            msg_type="text",
                            text_body=str(body),
                        )
                    )
                elif mtype == "audio":
                    audio_obj = raw.get("audio", {})
                    messages.append(
                        InboundWhatsAppMessage(
                            message_id=msg_id,
                            from_phone=from_phone,
                            timestamp=ts,
                            msg_type="audio",
                            audio_media_id=str(audio_obj.get("id", "")),
                            audio_fixture_id=audio_obj.get("fixture_id"),
                        )
                    )
                elif mtype == "interactive":
                    inter = raw.get("interactive", {})
                    btn_reply = inter.get("button_reply") or inter.get("list_reply") or {}
                    reply_id = str(btn_reply.get("id", ""))
                    reply_title = str(btn_reply.get("title", reply_id))
                    messages.append(
                        InboundWhatsAppMessage(
                            message_id=msg_id,
                            from_phone=from_phone,
                            timestamp=ts,
                            msg_type="interactive",
                            text_body=reply_title,
                            button_reply_id=reply_id,
                        )
                    )
    return messages
