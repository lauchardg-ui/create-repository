from pathlib import Path

import pytest

from email_analyzer.themes import (
    ThemeConfigError,
    count_corpus,
    count_in_document,
    load_themes,
    validate_themes,
)


def test_load_themes_returns_normalised_mapping(themes_yaml: Path) -> None:
    themes = load_themes(themes_yaml)
    assert set(themes.keys()) == {"Work", "Finance", "Travel"}
    assert "meeting" in themes["Work"]
    # All keywords should be lower-cased.
    assert all(k == k.lower() for keywords in themes.values() for k in keywords)


def test_load_themes_missing_file(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        load_themes(tmp_path / "missing.yaml")


def test_validate_themes_rejects_non_mapping() -> None:
    with pytest.raises(ThemeConfigError):
        validate_themes(["not", "a", "mapping"])


def test_validate_themes_rejects_missing_themes_key() -> None:
    with pytest.raises(ThemeConfigError):
        validate_themes({"other": {}})


def test_validate_themes_rejects_empty_keyword_list() -> None:
    with pytest.raises(ThemeConfigError):
        validate_themes({"themes": {"Work": []}})


def test_validate_themes_rejects_blank_keyword() -> None:
    with pytest.raises(ThemeConfigError):
        validate_themes({"themes": {"Work": ["meeting", "  "]}})


def test_validate_themes_deduplicates_keywords() -> None:
    out = validate_themes({"themes": {"Work": ["meeting", "Meeting", "MEETING", "deadline"]}})
    assert out["Work"] == ["meeting", "deadline"]


def test_count_in_document_counts_word_boundaries() -> None:
    themes = {"Work": ["meeting", "project"]}
    text = "the project meeting was about the meeting agenda projects"
    out = count_in_document(text, themes)
    assert out["Work"]["meeting"] == 2
    # "projects" should NOT match "project" because of word boundaries.
    assert out["Work"]["project"] == 1


def test_count_in_document_case_insensitive() -> None:
    themes = {"Finance": ["invoice"]}
    out = count_in_document("Invoice INVOICE invoice", themes)
    assert out["Finance"]["invoice"] == 3


def test_count_in_document_empty_text() -> None:
    out = count_in_document("", {"Work": ["meeting"]})
    assert out["Work"] == {}


def test_count_corpus_aggregates_per_theme(themes_yaml: Path) -> None:
    themes = load_themes(themes_yaml)
    docs = [
        "the project meeting is tomorrow and the deadline is Friday",
        "invoice payment is overdue",
        "flight and hotel are booked",
        "another meeting about the project",
    ]
    result = count_corpus(docs, themes)
    assert result.theme_totals["Work"] == 5  # project*2, meeting*2, deadline*1
    assert result.theme_totals["Finance"] == 2
    assert result.theme_totals["Travel"] == 2
    # Per-document counts align with input order.
    assert len(result.per_document) == 4
    assert result.per_document[1]["Finance"] == 2


def test_count_corpus_as_records(themes_yaml: Path) -> None:
    themes = load_themes(themes_yaml)
    result = count_corpus(["project deadline", "invoice"], themes)
    records = result.as_records()
    keywords = {(r["theme"], r["keyword"]): r["count"] for r in records}
    assert keywords[("Work", "project")] == 1
    assert keywords[("Work", "deadline")] == 1
    assert keywords[("Finance", "invoice")] == 1
