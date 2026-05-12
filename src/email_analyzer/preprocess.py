"""Email text preprocessing utilities.

Functions here are pure and deterministic so they are easy to test.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from html import unescape

from bs4 import BeautifulSoup

# Compact English stopword list — kept inline to avoid an NLTK download at runtime.
_STOPWORDS_RAW = (
    "a about above after again against all am an and any are aren as at be because been "
    "before being below between both but by can cannot could couldn did didn do does "
    "doesn doing don down during each few for from further had hadn has hasn have haven "
    "having he her here hers herself him himself his how i if in into is isn it its "
    "itself just ll let m me might more most must mustn my myself no nor not now o of "
    "off on once only or other our ours ourselves out over own re s same shan she should "
    "shouldn so some such t than that the their theirs them themselves then there these "
    "they this those through to too under until up ve very was wasn we were weren what "
    "when where which while who whom why will with won would wouldn y you your yours "
    "yourself yourselves"
)
STOPWORDS: frozenset[str] = frozenset(_STOPWORDS_RAW.split())

# Boilerplate frequently appearing in marketing and transactional emails. These add
# noise to topic models without contributing signal.
EMAIL_BOILERPLATE: frozenset[str] = frozenset(
    {
        "unsubscribe",
        "click",
        "here",
        "view",
        "browser",
        "email",
        "sent",
        "reply",
        "forward",
        "image",
        "images",
        "http",
        "https",
        "www",
        "com",
        "org",
        "net",
        "subject",
        "regards",
        "thanks",
        "sincerely",
        "best",
        "kind",
        "hi",
        "hello",
        "dear",
    }
)

_URL_RE = re.compile(r"https?://\S+|www\.\S+", flags=re.IGNORECASE)
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_NONALPHA_RE = re.compile(r"[^a-z\s]+")
_WHITESPACE_RE = re.compile(r"\s+")
_QUOTED_REPLY_RE = re.compile(
    r"(^On .+ wrote:.*|^-{2,}\s*Original Message\s*-{2,}.*|^From: .+$.*)",
    flags=re.MULTILINE | re.DOTALL,
)


def strip_html(content: str) -> str:
    """Remove HTML tags and decode entities, returning plain text."""
    if not content:
        return ""
    soup = BeautifulSoup(content, "lxml")
    for tag in soup(["script", "style", "head", "meta", "link"]):
        tag.decompose()
    text = soup.get_text(separator=" ")
    return unescape(text)


def strip_quoted_replies(text: str) -> str:
    """Remove quoted-reply blocks that frequently inflate counts on threads."""
    return _QUOTED_REPLY_RE.sub(" ", text or "")


def normalise(text: str) -> str:
    """Lowercase, strip URLs/emails/punctuation, collapse whitespace."""
    if not text:
        return ""
    text = text.lower()
    text = _URL_RE.sub(" ", text)
    text = _EMAIL_RE.sub(" ", text)
    text = _NONALPHA_RE.sub(" ", text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def tokenise(text: str, *, min_length: int = 3) -> list[str]:
    """Split normalised text into content tokens, dropping stopwords/boilerplate."""
    if not text:
        return []
    return [
        tok
        for tok in text.split()
        if len(tok) >= min_length and tok not in STOPWORDS and tok not in EMAIL_BOILERPLATE
    ]


def clean_email_body(content: str, *, content_type: str = "text/plain") -> str:
    """Full cleaning pipeline. Returns a normalised, token-friendly string."""
    if not content:
        return ""
    text = strip_html(content) if "html" in content_type.lower() else content
    text = strip_quoted_replies(text)
    return normalise(text)


def join_corpus(documents: Iterable[str]) -> str:
    """Join an iterable of cleaned documents into a single string."""
    return " ".join(d for d in documents if d)
