"""WhatsApp Cloud API v21.0 Client & Emulator Transport (`app/whatsapp/client.py`)."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.ids import new_uuid7_str
from app.core.logging import get_logger
from app.whatsapp.schemas import OutboundWhatsAppMessage

logger = get_logger(__name__)


class WhatsAppCloudClient:
    """Dual-mode WhatsApp client supporting Meta Graph API v21.0 and Judge Cockpit Emulator."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.sent_messages: list[OutboundWhatsAppMessage] = []

    def is_cloud_configured(self) -> bool:
        token = (self.settings.WHATSAPP_ACCESS_TOKEN or "").strip()
        phone_id = (self.settings.WHATSAPP_PHONE_NUMBER_ID or "").strip()
        return bool(token and "replace_me" not in token and phone_id and "replace_me" not in phone_id)

    async def send_message(self, msg: OutboundWhatsAppMessage) -> dict[str, Any]:
        """Deliver an outbound WhatsApp message (interactive buttons if <= 3 buttons, else text)."""
        self.sent_messages.append(msg)

        if not self.is_cloud_configured():
            return {
                "messaging_product": "whatsapp",
                "transport": "emulator",
                "messages": [{"id": f"wamid.{new_uuid7_str()}"}],
            }

        url = (
            f"https://graph.facebook.com/{self.settings.WHATSAPP_API_VERSION}/"
            f"{self.settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        )
        headers = {
            "Authorization": f"Bearer {self.settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        if msg.buttons and len(msg.buttons) <= 3:
            payload: dict[str, Any] = {
                "messaging_product": "whatsapp",
                "to": msg.to_phone.lstrip("+"),
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": msg.text_body},
                    "action": {
                        "buttons": [
                            {
                                "type": "reply",
                                "reply": {"id": b["id"], "title": b["title"][:20]},
                            }
                            for b in msg.buttons[:3]
                        ]
                    },
                },
            }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "to": msg.to_phone.lstrip("+"),
                "type": "text",
                "text": {"body": msg.text_body},
            }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                resp.raise_for_status()
                return resp.json()
        except Exception as exc:
            logger.warning("whatsapp_cloud_send_fallback_to_emulator", error=str(exc))
            return {
                "messaging_product": "whatsapp",
                "transport": "emulator_fallback",
                "messages": [{"id": f"wamid.{new_uuid7_str()}"}],
            }


_default_wa_client: WhatsAppCloudClient | None = None


def get_whatsapp_client() -> WhatsAppCloudClient:
    global _default_wa_client
    if _default_wa_client is None:
        _default_wa_client = WhatsAppCloudClient()
    return _default_wa_client
