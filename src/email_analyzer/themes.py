"""Keyword-based thematic counter.

A theme is a label mapped to a list of keywords or phrases. Counts are computed
on already-cleaned text (see preprocess.clean_email_body).
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

ThemeMap = dict[str, list[str]]


class ThemeConfigError(ValueError):
    """Raised when the YAML theme config is malformed."""


@dataclass(frozen=True)
class ThemeHit:
    """A keyword match within a single document."""

    theme: str
    keyword: str
    count: int


@dataclass
class ThemeCountResult:
    """Aggregated results of theme counting across a corpus."""

    theme_totals: Counter[str] = field(default_factory=Counter)
    keyword_totals: dict[str, Counter[str]] = field(default_factory=dict)
    per_document: list[Counter[str]] = field(default_factory=list)

    def as_records(self) -> list[dict[str, Any]]:
        """Long-format records suitable for a DataFrame."""
        rows: list[dict[str, Any]] = []
        for theme, kw_counter in self.keyword_totals.items():
            for keyword, count in kw_counter.items():
                rows.append({"theme": theme, "keyword": keyword, "count": count})
        return rows


def load_themes(path: str | Path) -> ThemeMap:
    """Load and validate a themes YAML file."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Theme file not found: {p}")
    with p.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return validate_themes(raw)


def validate_themes(raw: Any) -> ThemeMap:
    """Validate a parsed YAML payload and return a normalised ThemeMap."""
    if not isinstance(raw, Mapping) or "themes" not in raw:
        raise ThemeConfigError("Theme config must be a mapping with a 'themes' key.")
    themes = raw["themes"]
    if not isinstance(themes, Mapping) or not themes:
        raise ThemeConfigError("'themes' must be a non-empty mapping.")

    normalised: ThemeMap = {}
    for name, keywords in themes.items():
        if not isinstance(name, str) or not name.strip():
            raise ThemeConfigError(f"Invalid theme name: {name!r}")
        if not isinstance(keywords, list) or not keywords:
            raise ThemeConfigError(f"Theme {name!r} must have a non-empty keyword list.")
        cleaned: list[str] = []
        for kw in keywords:
            if not isinstance(kw, str) or not kw.strip():
                raise ThemeConfigError(f"Invalid keyword in theme {name!r}: {kw!r}")
            cleaned.append(kw.strip().lower())
        # Deduplicate but preserve order.
        seen: set[str] = set()
        deduped: list[str] = []
        for k in cleaned:
            if k not in seen:
                seen.add(k)
                deduped.append(k)
        normalised[name.strip()] = deduped
    return normalised


def _compile_patterns(themes: ThemeMap) -> dict[str, list[tuple[str, re.Pattern[str]]]]:
    """Compile word-boundary regex patterns for each keyword."""
    compiled: dict[str, list[tuple[str, re.Pattern[str]]]] = {}
    for theme, keywords in themes.items():
        compiled[theme] = [
            (kw, re.compile(rf"\b{re.escape(kw)}\b", flags=re.IGNORECASE)) for kw in keywords
        ]
    return compiled


def count_in_document(text: str, themes: ThemeMap) -> dict[str, Counter[str]]:
    """Count theme keyword occurrences in a single document.

    Returns a mapping ``{theme: Counter({keyword: count})}``.
    """
    patterns = _compile_patterns(themes)
    return _count_with_patterns(text, patterns)


def _count_with_patterns(
    text: str,
    patterns: dict[str, list[tuple[str, re.Pattern[str]]]],
) -> dict[str, Counter[str]]:
    out: dict[str, Counter[str]] = {theme: Counter() for theme in patterns}
    if not text:
        return out
    for theme, kw_patterns in patterns.items():
        for keyword, pat in kw_patterns:
            n = len(pat.findall(text))
            if n:
                out[theme][keyword] += n
    return out


def count_corpus(documents: list[str], themes: ThemeMap) -> ThemeCountResult:
    """Aggregate theme counts across a list of documents."""
    patterns = _compile_patterns(themes)
    result = ThemeCountResult(
        theme_totals=Counter(),
        keyword_totals={theme: Counter() for theme in themes},
        per_document=[],
    )
    for doc in documents:
        per_doc = _count_with_patterns(doc, patterns)
        flat: Counter[str] = Counter()
        for theme, kw_counter in per_doc.items():
            theme_total = sum(kw_counter.values())
            if theme_total:
                result.theme_totals[theme] += theme_total
                result.keyword_totals[theme].update(kw_counter)
                flat[theme] = theme_total
        result.per_document.append(flat)
    return result
