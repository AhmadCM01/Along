"""Unit tests for demo chat endpoint resilience against UnboundLocalError and standalone affirmations."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    return TestClient(app)


def test_standalone_yes_does_not_crash_with_unbound_local(client: TestClient) -> None:
    """Assert sending 'YES' on an idle session returns HTTP 200 rather than crashing with 500."""
    res = client.post(
        "/api/v1/demo/chat",
        json={"phone": "+2348031234567", "message_text": "YES"},
        headers={"X-Along-Session": "sess-test-yes-idle-01"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    pane1 = data["pane1_whatsapp"]
    assert pane1["stage"] == "AWAITING_ORIGIN"
    assert pane1["request_id"].startswith("req-")


def test_quote_then_yes_transitions_to_pooling(client: TestClient) -> None:
    """Assert a two-turn booking where rider receives a quote then confirms with 'YES' enters POOLING."""
    sess = "sess-test-quote-yes-02"

    # Turn 1: Request ride
    r1 = client.post(
        "/api/v1/demo/chat",
        json={"phone": "+2348031234567", "message_text": "From Dutse first gate to Berger, 1 seat"},
        headers={"X-Along-Session": sess},
    )
    assert r1.status_code == 200
    assert r1.json()["pane1_whatsapp"]["stage"] == "AWAITING_CONFIRMATION"

    # Turn 2: Confirm with text "YES"
    r2 = client.post(
        "/api/v1/demo/chat",
        json={"phone": "+2348031234567", "message_text": "YES"},
        headers={"X-Along-Session": sess},
    )
    assert r2.status_code == 200
    p2 = r2.json()["pane1_whatsapp"]
    assert p2["stage"] == "POOLING"
    assert bool(p2["request_id"])
    assert p2["boarding_otp"] is not None
    assert len(p2["boarding_otp"]) == 4


def test_greeting_text_returns_200_without_error(client: TestClient) -> None:
    """Assert arbitrary text returns 200 with request_id always bound."""
    res = client.post(
        "/api/v1/demo/chat",
        json={"phone": "+2348031234567", "message_text": "Hello, good morning!"},
        headers={"X-Along-Session": "sess-test-greeting-03"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["pane1_whatsapp"]["request_id"] is not None
