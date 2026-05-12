"""Shared pytest fixtures."""

from __future__ import annotations

import base64
from datetime import datetime, timezone
from pathlib import Path

import pytest

from email_analyzer.gmail_client import EmailMessage

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def themes_yaml(tmp_path: Path) -> Path:
    """Minimal YAML theme config for tests."""
    path = tmp_path / "themes.yaml"
    path.write_text(
        """
themes:
  Work:
    - meeting
    - deadline
    - project
  Finance:
    - invoice
    - payment
  Travel:
    - flight
    - hotel
""".strip(),
        encoding="utf-8",
    )
    return path


@pytest.fixture
def sample_messages() -> list[EmailMessage]:
    """A small deterministic message corpus covering multiple themes."""
    return [
        EmailMessage(
            id="m1",
            thread_id="t1",
            sender="boss@example.com",
            subject="Project kickoff meeting",
            snippet="Meeting next week",
            body=(
                "Hi team, the project kickoff meeting is on Monday. "
                "Please review the deadline for the deliverables."
            ),
            mime_type="text/plain",
            received_at=datetime(2026, 1, 6, 9, 0, tzinfo=timezone.utc),
            labels=("INBOX",),
        ),
        EmailMessage(
            id="m2",
            thread_id="t2",
            sender="billing@vendor.com",
            subject="Invoice #4242",
            snippet="Your invoice is ready",
            body="Your invoice for last month's subscription is attached. Payment due in 14 days.",
            mime_type="text/plain",
            received_at=datetime(2026, 1, 9, 12, 0, tzinfo=timezone.utc),
            labels=("INBOX",),
        ),
        EmailMessage(
            id="m3",
            thread_id="t3",
            sender="airline@example.com",
            subject="Flight confirmation",
            snippet="Your flight is booked",
            body="<p>Your <b>flight</b> from JFK is confirmed. Hotel reservation also linked.</p>",
            mime_type="text/html",
            received_at=datetime(2026, 1, 12, 15, 0, tzinfo=timezone.utc),
            labels=("INBOX",),
        ),
        EmailMessage(
            id="m4",
            thread_id="t4",
            sender="boss@example.com",
            subject="Meeting follow-up",
            snippet="Follow up",
            body="Following up on the meeting — please send the project plan before the deadline.",
            mime_type="text/plain",
            received_at=datetime(2026, 1, 14, 11, 0, tzinfo=timezone.utc),
            labels=("INBOX",),
        ),
    ]


@pytest.fixture
def gmail_api_payload() -> dict:
    """A realistic Gmail users.messages.get response for parser tests."""
    body = "Hello team, the project meeting is on Monday."
    encoded = base64.urlsafe_b64encode(body.encode("utf-8")).decode("ascii")
    return {
        "id": "abc123",
        "threadId": "thr456",
        "snippet": "Hello team",
        "labelIds": ["INBOX", "IMPORTANT"],
        "payload": {
            "headers": [
                {"name": "From", "value": "boss@example.com"},
                {"name": "Subject", "value": "Weekly sync"},
                {"name": "Date", "value": "Mon, 06 Jan 2026 09:00:00 +0000"},
            ],
            "mimeType": "multipart/alternative",
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": encoded, "size": len(body)},
                },
                {
                    "mimeType": "text/html",
                    "body": {
                        "data": base64.urlsafe_b64encode(
                            b"<p>Hello team, the project meeting is on Monday.</p>"
                        ).decode("ascii")
                    },
                },
            ],
        },
    }
