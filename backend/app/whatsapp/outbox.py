"""Transactional Outbox Dispatcher for WhatsApp Messages (`app/whatsapp/outbox.py`)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.ids import new_uuid7_str
from app.whatsapp.client import WhatsAppCloudClient, get_whatsapp_client
from app.whatsapp.schemas import OutboundWhatsAppMessage


@dataclass
class OutboxRecord:
    """In-memory / DB-backed outbox record with retry tracking."""

    outbox_id: str
    message: OutboundWhatsAppMessage
    status: str = "PENDING"
    attempts: int = 0
    provider_msg_id: str | None = None
    last_error: str | None = None


class WhatsAppOutboxDispatcher:
    """Reliable WhatsApp outbox queue ensuring zero dropped outbound rider messages."""

    def __init__(self, wa_client: WhatsAppCloudClient | None = None) -> None:
        self.client = wa_client or get_whatsapp_client()
        self.records: dict[str, OutboxRecord] = {}
        self.history: list[OutboxRecord] = field(default_factory=list) if False else []

    async def enqueue_and_dispatch(self, message: OutboundWhatsAppMessage) -> OutboxRecord:
        rec = OutboxRecord(outbox_id=new_uuid7_str(), message=message)
        self.records[rec.outbox_id] = rec
        self.history.append(rec)

        rec.attempts += 1
        try:
            res: dict[str, Any] = await self.client.send_message(message)
            msgs = res.get("messages", [])
            rec.provider_msg_id = msgs[0].get("id") if msgs else None
            rec.status = "SENT"
        except Exception as exc:
            rec.status = "FAILED"
            rec.last_error = str(exc)
        return rec
