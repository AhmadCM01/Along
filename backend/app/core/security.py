"""Cryptographic helpers for webhook HMAC verification, JWT tokens, and NIN/OTP hashing."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.core.config import get_settings


def verify_whatsapp_signature(raw_body: bytes, signature_header: str | None, app_secret: str) -> bool:
    """Verify Meta WhatsApp Cloud API X-Hub-Signature-256 header using constant-time compare."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected_hex = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    expected = f"sha256={expected_hex}"
    return hmac.compare_digest(expected, signature_header)


def verify_paystack_signature(raw_body: bytes, signature_header: str | None, secret_key: str) -> bool:
    """Verify Paystack x-paystack-signature header using HMAC-SHA512 constant-time compare."""
    if not signature_header:
        return False
    expected_hex = hmac.new(
        secret_key.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected_hex, signature_header.strip())


def hash_otp_code(code: str, context_id: str = "", pepper: str | None = None) -> str:
    """Compute HMAC-SHA256 hash of a 4-digit or 6-digit OTP bound to a request or phone."""
    effective_pepper = pepper if pepper is not None else get_settings().OTP_PEPPER
    msg = f"{context_id}:{code.strip()}".encode("utf-8") if context_id else code.strip().encode("utf-8")
    return hmac.new(effective_pepper.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def verify_otp_code(
    code: str,
    context_id: str = "",
    expected_hash: str = "",
    pepper: str | None = None,
) -> bool:
    """Verify an OTP code against its stored HMAC-SHA256 hash in constant time."""
    if not expected_hash:
        return False
    actual = hash_otp_code(code, context_id=context_id, pepper=pepper)
    return hmac.compare_digest(actual, expected_hash)


def hash_nin(nin: str, pepper: str | None = None) -> tuple[str, str]:
    """Return (nin_last4, nin_hmac_sha256) for NDPA-compliant storage."""
    digits = "".join(ch for ch in nin if ch.isdigit())
    if len(digits) != 11:
        raise ValueError("Nigerian NIN must be exactly 11 digits")
    effective_pepper = pepper if pepper is not None else get_settings().NIN_PEPPER
    nin_hash = hmac.new(
        effective_pepper.encode("utf-8"),
        digits.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return digits[-4:], nin_hash


def create_jwt_token(
    subject_id: str,
    subject_type: str,
    role: str = "driver",
    expires_minutes: int = 60,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed HS256 JWT access token."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject_id,
        "sub_type": subject_type,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
        "jti": secrets.token_hex(8),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, get_settings().JWT_SECRET_KEY, algorithm="HS256")


def decode_jwt_token(token: str) -> dict[str, Any]:
    """Decode and validate an HS256 JWT access token."""
    decoded: dict[str, Any] = jwt.decode(
        token,
        get_settings().JWT_SECRET_KEY,
        algorithms=["HS256"],
    )
    return decoded
