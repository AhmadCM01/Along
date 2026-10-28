"""Nigerian E.164 phone number normalization and privacy-preserving WhatsApp ID hashing."""

from __future__ import annotations

import hashlib
import re

from app.core.config import get_settings

_DIGITS_ONLY = re.compile(r"\D+")


def normalize_e164(raw_phone: str, default_country_code: str = "234") -> str:
    """Normalize a Nigerian or international phone string to E.164 with leading '+'."""
    cleaned = raw_phone.strip()
    digits = _DIGITS_ONLY.sub("", cleaned)
    if not digits:
        raise ValueError(f"Invalid phone number: {raw_phone!r}")

    if digits.startswith("0") and len(digits) == 11:
        digits = f"{default_country_code}{digits[1:]}"
    elif len(digits) == 10 and digits[0] in {"7", "8", "9"}:
        digits = f"{default_country_code}{digits}"

    if len(digits) < 10 or len(digits) > 15:
        raise ValueError(f"Phone number out of E.164 length bounds: {raw_phone!r}")

    return f"+{digits}"


def to_wa_id(raw_phone: str) -> str:
    """Return digits-only WhatsApp ID (E.164 without leading '+')."""
    return normalize_e164(raw_phone).lstrip("+")


def hash_wa_id(wa_id: str, salt: str | None = None) -> str:
    """Return a 16-char salted SHA-256 hex digest for NDPA-compliant structured logging."""
    normalized = to_wa_id(wa_id)
    effective_salt = salt if salt is not None else get_settings().LOG_HASH_SALT
    digest = hashlib.sha256(f"{effective_salt}:{normalized}".encode("utf-8")).hexdigest()
    return digest[:16]


normalize_ng_phone = normalize_e164

