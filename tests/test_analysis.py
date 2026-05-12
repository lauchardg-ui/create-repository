from pathlib import Path

import pytest

from email_analyzer.analysis import analyse, prepare_documents
from email_analyzer.gmail_client import EmailMessage


def test_prepare_documents_strips_html_and_aligns_timestamps(
    sample_messages: list[EmailMessage],
) -> None:
    docs, timestamps = prepare_documents(sample_messages)
    assert len(docs) == len(sample_messages) == len(timestamps)
    # The HTML message body should be cleaned to plain text.
    html_doc = docs[2]
    assert "<" not in html_doc
    assert "flight" in html_doc
    # Timestamps are naive UTC.
    assert all(ts is None or ts.tzinfo is None for ts in timestamps)


def test_analyse_produces_theme_and_topic_results(
    sample_messages: list[EmailMessage], themes_yaml: Path
) -> None:
    result = analyse(sample_messages, themes_path=themes_yaml, n_topics=2)
    assert result.n_messages == 4
    assert result.theme_result.theme_totals["Work"] >= 3
    assert result.theme_result.theme_totals["Finance"] >= 1
    assert result.theme_result.theme_totals["Travel"] >= 1
    # Topic discovery may degrade with tiny corpora — just ensure it doesn't crash.
    assert isinstance(result.topic_prevalence, dict)


def test_analyse_requires_themes_source(sample_messages: list[EmailMessage]) -> None:
    with pytest.raises(ValueError, match="themes"):
        analyse(sample_messages)


def test_analyse_accepts_explicit_themes(sample_messages: list[EmailMessage]) -> None:
    themes = {"Work": ["meeting", "project"]}
    result = analyse(sample_messages, themes=themes, n_topics=2)
    assert result.theme_result.theme_totals["Work"] >= 3
