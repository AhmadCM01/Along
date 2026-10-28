"""Unit tests for core domain primitives: money, phone, IDs, security, and RFC 9457 errors."""

from __future__ import annotations

import hashlib
import hmac

import pytest

from app.core.errors import OfferExpiredError, ShortTripError
from app.core.ids import generate_pod_code, generate_share_token, generate_trip_code
from app.core.money import compute_pod_financials, format_naira, naira_to_kobo
from app.core.phone import hash_wa_id, normalize_e164, to_wa_id
from app.core.security import (
    create_jwt_token,
    decode_jwt_token,
    hash_nin,
    hash_otp_code,
    verify_otp_code,
    verify_paystack_signature,
    verify_whatsapp_signature,
)


def test_kobo_money_arithmetic_and_formatting() -> None:
    assert naira_to_kobo(700) == 70000
    assert naira_to_kobo(1200) == 120000
    assert format_naira(70000) == "₦700"
    assert format_naira(120000) == "₦1,200"
    assert format_naira(410000) == "₦4,100"

    with pytest.raises(TypeError):
        naira_to_kobo(700.0)  # type: ignore[arg-type]

    # Mixed pod scenario: 1 Oando (700) + 1 Berger (1,000) + 2 Wuse (2 x 1,200) = 4,100 NGN
    breakdown = compute_pod_financials([70000, 100000, 120000, 120000])
    assert breakdown.gross_kobo == 410000
    assert breakdown.commission_kobo == 41000
    assert breakdown.driver_net_kobo == 369000
    assert breakdown.commission_kobo + breakdown.driver_net_kobo == breakdown.gross_kobo


def test_phone_normalization_and_wa_id_hashing() -> None:
    assert normalize_e164("08031234567") == "+2348031234567"
    assert normalize_e164("2348031234567") == "+2348031234567"
    assert normalize_e164("+234 803 123 4567") == "+2348031234567"
    assert to_wa_id("08031234567") == "2348031234567"

    h1 = hash_wa_id("08031234567")
    h2 = hash_wa_id("+2348031234567")
    assert h1 == h2
    assert len(h1) == 16
    assert "8031234567" not in h1


def test_short_codes_and_security_helpers() -> None:
    pod_code = generate_pod_code()
    trip_code = generate_trip_code()
    share_token = generate_share_token()
    assert pod_code.startswith("POD-") and len(pod_code) == 8
    assert trip_code.startswith("ALG-") and len(trip_code) == 8
    assert len(share_token) == 22

    # OTP hash & verify
    otp_hash = hash_otp_code("4821", context_id="req-123")
    assert verify_otp_code("4821", context_id="req-123", expected_hash=otp_hash)
    assert not verify_otp_code("9999", context_id="req-123", expected_hash=otp_hash)

    # NIN hash
    last4, nin_digest = hash_nin("12345678901")
    assert last4 == "8901"
    assert len(nin_digest) == 64

    # JWT round-trip
    token = create_jwt_token(subject_id="drv-402", subject_type="DRIVER", role="driver")
    claims = decode_jwt_token(token)
    assert claims["sub"] == "drv-402"
    assert claims["sub_type"] == "DRIVER"


def test_webhook_hmac_signatures_and_problem_json() -> None:
    raw = b'{"event":"charge.success"}'
    wa_secret = "wa_test_secret"
    wa_sig = "sha256=" + hmac.new(wa_secret.encode(), raw, hashlib.sha256).hexdigest()
    assert verify_whatsapp_signature(raw, wa_sig, wa_secret)
    assert not verify_whatsapp_signature(raw, "sha256=bad", wa_secret)

    ps_secret = "sk_test_123"
    ps_sig = hmac.new(ps_secret.encode(), raw, hashlib.sha512).hexdigest()
    assert verify_paystack_signature(raw, ps_sig, ps_secret)
    assert not verify_paystack_signature(raw, "bad", ps_secret)

    err = OfferExpiredError()
    problem = err.to_problem_json(trace_id="01JAW9")
    assert problem["status"] == 409
    assert problem["code"] == "OFFER_EXPIRED"
    assert problem["trace_id"] == "01JAW9"

    short_err = ShortTripError(distance_m=450)
    assert short_err.to_problem_json()["distance_m"] == 450
