"""High-level analysis orchestration."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd

from email_analyzer.gmail_client import EmailMessage
from email_analyzer.preprocess import clean_email_body
from email_analyzer.themes import (
    ThemeCountResult,
    ThemeMap,
    count_corpus,
    load_themes,
)
from email_analyzer.topics import TopicModelResult, discover_topics, topic_prevalence


@dataclass
class AnalysisResult:
    """Bundled output of running the full pipeline on a corpus."""

    theme_result: ThemeCountResult
    topic_result: TopicModelResult
    topic_prevalence: dict[str, float]
    timestamps: list[pd.Timestamp | None]
    cleaned_documents: list[str]
    n_messages: int

    @property
    def per_document_theme_counts(self) -> list[Counter[str]]:
        return self.theme_result.per_document


def prepare_documents(messages: list[EmailMessage]) -> tuple[list[str], list[pd.Timestamp | None]]:
    """Clean message bodies and align timestamps."""
    cleaned: list[str] = []
    timestamps: list[pd.Timestamp | None] = []
    for msg in messages:
        text = " ".join(filter(None, [msg.subject, msg.snippet, msg.body]))
        cleaned.append(clean_email_body(text, content_type=msg.mime_type))
        timestamps.append(_to_pd_timestamp(msg.received_at))
    return cleaned, timestamps


def _to_pd_timestamp(dt: datetime | None) -> pd.Timestamp | None:
    if dt is None:
        return None
    ts = pd.Timestamp(dt)
    if ts.tzinfo is not None:
        ts = ts.tz_convert("UTC").tz_localize(None)
    return ts


def analyse(
    messages: list[EmailMessage],
    *,
    themes: ThemeMap | None = None,
    themes_path: str | Path | None = None,
    n_topics: int = 6,
) -> AnalysisResult:
    """Run preprocessing, keyword counts, and topic discovery on a list of messages."""
    if themes is None:
        if themes_path is None:
            raise ValueError("Provide either themes or themes_path.")
        themes = load_themes(themes_path)

    cleaned, timestamps = prepare_documents(messages)
    theme_result = count_corpus(cleaned, themes)
    topic_result = discover_topics(cleaned, n_topics=n_topics)
    prevalence = topic_prevalence(topic_result)

    return AnalysisResult(
        theme_result=theme_result,
        topic_result=topic_result,
        topic_prevalence=prevalence,
        timestamps=timestamps,
        cleaned_documents=cleaned,
        n_messages=len(messages),
    )
