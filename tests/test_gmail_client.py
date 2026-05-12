"""Gmail client tests. Network calls are mocked — no real Gmail access."""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from googleapiclient.errors import HttpError

from email_analyzer.gmail_client import (
    GmailClient,
    extract_body,
    parse_message,
)


def test_parse_message_prefers_text_plain(gmail_api_payload: dict) -> None:
    msg = parse_message(gmail_api_payload)
    assert msg.id == "abc123"
    assert msg.thread_id == "thr456"
    assert msg.sender == "boss@example.com"
    assert msg.subject == "Weekly sync"
    assert msg.mime_type == "text/plain"
    assert "Hello team" in msg.body
    assert "<p>" not in msg.body
    assert isinstance(msg.received_at, datetime)
    assert msg.labels == ("INBOX", "IMPORTANT")


def test_parse_message_falls_back_to_html() -> None:
    html = "<p>Hi <b>there</b></p>"
    payload = {
        "id": "x",
        "threadId": "y",
        "snippet": "Hi",
        "labelIds": [],
        "payload": {
            "headers": [{"name": "From", "value": "a@b.com"}],
            "mimeType": "text/html",
            "body": {"data": base64.urlsafe_b64encode(html.encode()).decode()},
        },
    }
    msg = parse_message(payload)
    assert msg.mime_type == "text/html"
    assert "<b>" in msg.body  # HTML is preserved here; preprocessor strips it later


def test_parse_message_handles_missing_headers() -> None:
    msg = parse_message({"id": "x", "threadId": "y", "payload": {"headers": []}})
    assert msg.sender == ""
    assert msg.subject == ""
    assert msg.received_at is None


def test_parse_message_handles_bad_date() -> None:
    payload = {
        "id": "x",
        "threadId": "y",
        "payload": {
            "headers": [{"name": "Date", "value": "not-a-real-date"}],
        },
    }
    msg = parse_message(payload)
    assert msg.received_at is None


def test_extract_body_returns_empty_when_no_data() -> None:
    body, mime = extract_body({"headers": []})
    assert body == ""
    assert mime == "text/plain"


def test_extract_body_walks_nested_parts() -> None:
    plain = base64.urlsafe_b64encode(b"plain text").decode()
    payload = {
        "mimeType": "multipart/mixed",
        "parts": [
            {
                "mimeType": "multipart/alternative",
                "parts": [
                    {"mimeType": "text/plain", "body": {"data": plain}},
                ],
            }
        ],
    }
    body, mime = extract_body(payload)
    assert body == "plain text"
    assert mime == "text/plain"


def _stub_service(list_pages: list[dict[str, Any]], get_payloads: dict[str, dict]) -> MagicMock:
    """Stub the chained Gmail resource API."""
    service = MagicMock(name="GmailService")
    users = service.users.return_value
    messages = users.messages.return_value

    list_call = MagicMock()
    list_call.execute.side_effect = list_pages
    messages.list.return_value = list_call

    def _get(userId: str, id: str, format: str) -> MagicMock:
        get_call = MagicMock()
        get_call.execute.return_value = get_payloads[id]
        return get_call

    messages.get.side_effect = _get
    return service


def test_list_message_ids_handles_pagination() -> None:
    service = _stub_service(
        list_pages=[
            {"messages": [{"id": "a"}, {"id": "b"}], "nextPageToken": "p2"},
            {"messages": [{"id": "c"}]},
        ],
        get_payloads={},
    )
    client = GmailClient(service=service)
    ids = client.list_message_ids(query="newer_than:7d", max_results=10)
    assert ids == ["a", "b", "c"]


def test_list_message_ids_respects_max_results() -> None:
    service = _stub_service(
        list_pages=[
            {"messages": [{"id": "a"}, {"id": "b"}, {"id": "c"}]},
        ],
        get_payloads={},
    )
    client = GmailClient(service=service)
    ids = client.list_message_ids(max_results=2)
    assert ids == ["a", "b"]


def test_list_message_ids_raises_on_http_error() -> None:
    service = MagicMock()
    list_call = MagicMock()
    list_call.execute.side_effect = HttpError(
        resp=MagicMock(status=500, reason="boom"), content=b"err"
    )
    service.users.return_value.messages.return_value.list.return_value = list_call
    client = GmailClient(service=service)
    with pytest.raises(HttpError):
        client.list_message_ids(max_results=5)


def test_fetch_messages_returns_parsed(gmail_api_payload: dict) -> None:
    service = _stub_service(
        list_pages=[{"messages": [{"id": "abc123"}]}],
        get_payloads={"abc123": gmail_api_payload},
    )
    client = GmailClient(service=service)
    messages = client.fetch_messages(max_results=5)
    assert len(messages) == 1
    assert messages[0].subject == "Weekly sync"


def test_fetch_messages_skips_individual_failures(gmail_api_payload: dict) -> None:
    service = MagicMock()
    list_call = MagicMock()
    list_call.execute.return_value = {"messages": [{"id": "good"}, {"id": "bad"}]}
    service.users.return_value.messages.return_value.list.return_value = list_call

    def _get(userId: str, id: str, format: str) -> MagicMock:
        call = MagicMock()
        if id == "bad":
            call.execute.side_effect = HttpError(
                resp=MagicMock(status=403, reason="forbidden"), content=b""
            )
        else:
            call.execute.return_value = gmail_api_payload
        return call

    service.users.return_value.messages.return_value.get.side_effect = _get
    client = GmailClient(service=service)
    messages = client.fetch_messages(max_results=5)
    assert len(messages) == 1  # bad one skipped, good one kept
