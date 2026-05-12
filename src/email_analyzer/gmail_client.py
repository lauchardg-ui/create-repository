"""Gmail OAuth client.

The client is structured so that the network-touching surface is small and easy to
mock in tests: a ``GmailClient`` consumes any object that satisfies the
``GmailService`` protocol (the Google API client's resource object does).
"""

from __future__ import annotations

import base64
import logging
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

from dateutil import parser as date_parser
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Read-only scope only. We never want to mutate the user's mailbox.
GMAIL_SCOPES = ("https://www.googleapis.com/auth/gmail.readonly",)
DEFAULT_CREDENTIALS_PATH = Path("credentials.json")
DEFAULT_TOKEN_PATH = Path("token.json")


class GmailService(Protocol):
    """Subset of the Gmail API resource we depend on."""

    def users(self) -> Any: ...  # pragma: no cover - structural


@dataclass(frozen=True)
class EmailMessage:
    """Normalised representation of one Gmail message."""

    id: str
    thread_id: str
    sender: str
    subject: str
    snippet: str
    body: str
    mime_type: str
    received_at: datetime | None
    labels: tuple[str, ...] = field(default_factory=tuple)


class GmailAuthError(RuntimeError):
    """Raised when OAuth flow cannot complete."""


def load_credentials(
    *,
    credentials_path: Path = DEFAULT_CREDENTIALS_PATH,
    token_path: Path = DEFAULT_TOKEN_PATH,
) -> Credentials:
    """Run the installed-app OAuth flow, caching the token on disk."""
    creds: Credentials | None = None
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(  # type: ignore[no-untyped-call]
            str(token_path), list(GMAIL_SCOPES)
        )

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())  # type: ignore[no-untyped-call]
    else:
        if not credentials_path.exists():
            raise GmailAuthError(
                f"OAuth client secret not found at {credentials_path}. "
                "Download it from Google Cloud Console (OAuth 2.0 Client IDs → Desktop)."
            )
        flow = InstalledAppFlow.from_client_secrets_file(str(credentials_path), list(GMAIL_SCOPES))
        creds = flow.run_local_server(port=0)

    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def build_service(credentials: Credentials) -> GmailService:
    """Build the Gmail API resource object."""
    service: GmailService = build("gmail", "v1", credentials=credentials, cache_discovery=False)
    return service


def _decode_part(data: str | None) -> str:
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="replace")
    except (ValueError, UnicodeDecodeError) as exc:
        logger.debug("Failed to decode message part: %s", exc)
        return ""


def _walk_parts(payload: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield payload
    for part in payload.get("parts", []) or []:
        yield from _walk_parts(part)


def extract_body(payload: dict[str, Any]) -> tuple[str, str]:
    """Return ``(body, mime_type)`` preferring text/plain over text/html."""
    plain: str | None = None
    html: str | None = None
    for part in _walk_parts(payload):
        mime = part.get("mimeType", "")
        data = part.get("body", {}).get("data")
        if not data:
            continue
        decoded = _decode_part(data)
        if mime == "text/plain" and plain is None:
            plain = decoded
        elif mime == "text/html" and html is None:
            html = decoded
    if plain is not None:
        return plain, "text/plain"
    if html is not None:
        return html, "text/html"
    return "", "text/plain"


def _header(headers: list[dict[str, str]], name: str) -> str:
    target = name.lower()
    for h in headers:
        if h.get("name", "").lower() == target:
            return h.get("value", "")
    return ""


def parse_message(raw: dict[str, Any]) -> EmailMessage:
    """Convert a Gmail API ``users.messages.get`` payload into ``EmailMessage``."""
    payload = raw.get("payload", {}) or {}
    headers = payload.get("headers", []) or []
    body, mime = extract_body(payload)
    date_str = _header(headers, "Date")
    received_at: datetime | None
    try:
        received_at = date_parser.parse(date_str) if date_str else None
    except (ValueError, TypeError):
        received_at = None
    return EmailMessage(
        id=raw.get("id", ""),
        thread_id=raw.get("threadId", ""),
        sender=_header(headers, "From"),
        subject=_header(headers, "Subject"),
        snippet=raw.get("snippet", "") or "",
        body=body,
        mime_type=mime,
        received_at=received_at,
        labels=tuple(raw.get("labelIds", []) or []),
    )


@dataclass
class GmailClient:
    """High-level Gmail wrapper used by the app."""

    service: GmailService
    user_id: str = "me"

    def list_message_ids(
        self,
        *,
        query: str = "",
        max_results: int = 200,
        label_ids: list[str] | None = None,
    ) -> list[str]:
        """Page through the Gmail list endpoint and collect message IDs."""
        ids: list[str] = []
        page_token: str | None = None
        users = self.service.users()
        while len(ids) < max_results:
            request = users.messages().list(
                userId=self.user_id,
                q=query or None,
                labelIds=label_ids or None,
                pageToken=page_token,
                maxResults=min(100, max_results - len(ids)),
            )
            try:
                response = request.execute()
            except HttpError as exc:
                logger.error("Gmail list failed: %s", exc)
                raise
            messages = response.get("messages", []) or []
            ids.extend(m["id"] for m in messages)
            page_token = response.get("nextPageToken")
            if not page_token:
                break
        return ids[:max_results]

    def fetch_message(self, message_id: str) -> EmailMessage:
        """Fetch and parse a single message."""
        users = self.service.users()
        raw = users.messages().get(userId=self.user_id, id=message_id, format="full").execute()
        return parse_message(raw)

    def fetch_messages(
        self,
        *,
        query: str = "",
        max_results: int = 200,
        label_ids: list[str] | None = None,
    ) -> list[EmailMessage]:
        """List + fetch in one call, returning normalised messages."""
        ids = self.list_message_ids(query=query, max_results=max_results, label_ids=label_ids)
        messages: list[EmailMessage] = []
        for mid in ids:
            try:
                messages.append(self.fetch_message(mid))
            except HttpError as exc:
                logger.warning("Skipping message %s: %s", mid, exc)
        return messages
