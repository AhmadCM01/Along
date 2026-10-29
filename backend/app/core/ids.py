"""Human-readable short code and ULID-style reference generators."""

from __future__ import annotations

import secrets
import time
from uuid import uuid4

_SAFE_ALPHANUM = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
_DIGITS = "0123456789"


def new_uuid7_str() -> str:
    """Generate a unique UUID string identifier."""
    return str(uuid4())


def generate_boarding_otp() -> str:
    """Generate a random 4-digit numeric boarding OTP code using Python's secrets module."""
    return f"{secrets.randbelow(10000):04d}"


def generate_short_code(prefix: str = "REQ") -> str:
    """Generate a human-readable prefixed short code such as 'REQ-7KQ2'."""
    suffix = "".join(secrets.choice(_SAFE_ALPHANUM) for _ in range(4))
    return f"{prefix}-{suffix}"



def generate_pod_code() -> str:
    """Generate a 4-character unambiguous pod code such as 'POD-7KQ2'."""
    suffix = "".join(secrets.choice(_SAFE_ALPHANUM) for _ in range(4))
    return f"POD-{suffix}"


def generate_trip_code() -> str:
    """Generate a 4-digit ride request code such as 'ALG-4821'."""
    suffix = "".join(secrets.choice(_DIGITS) for _ in range(4))
    return f"ALG-{suffix}"


def generate_share_token() -> str:
    """Generate a 22-character URL-safe token for live trip-share links."""
    return secrets.token_urlsafe(16)[:22]


def generate_payment_reference(prefix: str = "ALGPAY") -> str:
    """Generate a time-ordered unique payment or payout reference."""
    ts_part = int(time.time() * 1000)
    rand_part = "".join(secrets.choice(_SAFE_ALPHANUM) for _ in range(8))
    return f"{prefix}_{ts_part}_{rand_part}"
