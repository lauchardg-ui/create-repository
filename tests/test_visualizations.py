"""Smoke tests for the Plotly figure builders.

We don't render the figures — we just check that they are valid plotly objects
with the expected structure. This is enough to catch regressions in the data
binding without dragging in a headless browser.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go

from email_analyzer.analysis import analyse
from email_analyzer.gmail_client import EmailMessage
from email_analyzer.themes import ThemeCountResult
from email_analyzer.topics import TopicModelResult
from email_analyzer.visualizations import (
    theme_bar_chart,
    theme_keyword_treemap,
    theme_sunburst,
    theme_timeseries,
    topic_bar,
    topic_term_heatmap,
    wordcloud_png,
)


def _result_with_data() -> ThemeCountResult:
    r = ThemeCountResult()
    r.theme_totals.update({"Work": 5, "Finance": 3, "Travel": 2})
    r.keyword_totals = {
        "Work": Counter({"meeting": 3, "project": 2}),
        "Finance": Counter({"invoice": 3}),
        "Travel": Counter({"flight": 2}),
    }
    return r


def test_theme_bar_chart_returns_figure() -> None:
    fig = theme_bar_chart(_result_with_data())
    assert isinstance(fig, go.Figure)
    bar = fig.data[0]
    assert list(bar.y) == ["Work", "Finance", "Travel"]
    assert list(bar.x) == [5, 3, 2]


def test_theme_keyword_treemap_returns_figure() -> None:
    fig = theme_keyword_treemap(_result_with_data())
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "treemap"


def test_theme_keyword_treemap_empty() -> None:
    fig = theme_keyword_treemap(ThemeCountResult())
    assert isinstance(fig, go.Figure)


def test_theme_sunburst_returns_figure() -> None:
    fig = theme_sunburst(_result_with_data())
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "sunburst"


def test_theme_timeseries_with_data() -> None:
    timestamps = [pd.Timestamp("2026-01-01"), pd.Timestamp("2026-01-08")]
    counters = [Counter({"Work": 2}), Counter({"Work": 1, "Finance": 3})]
    fig = theme_timeseries(timestamps, counters, freq="W")
    assert isinstance(fig, go.Figure)
    assert len(fig.data) >= 1


def test_theme_timeseries_empty() -> None:
    fig = theme_timeseries([], [])
    assert isinstance(fig, go.Figure)


def test_theme_timeseries_skips_none_timestamps() -> None:
    fig = theme_timeseries([None, None], [Counter(), Counter()])  # type: ignore[list-item]
    assert isinstance(fig, go.Figure)


def test_topic_bar_handles_empty() -> None:
    fig = topic_bar({})
    assert isinstance(fig, go.Figure)


def test_topic_bar_with_data() -> None:
    fig = topic_bar({"foo, bar": 0.6, "baz, qux": 0.4})
    assert isinstance(fig, go.Figure)
    bar = fig.data[0]
    assert list(bar.y) == ["foo, bar", "baz, qux"]


def test_topic_term_heatmap_runs(sample_messages: list[EmailMessage], themes_yaml: Path) -> None:
    # Use a tiny real corpus so we have a populated TopicModelResult.
    bigger = sample_messages * 3
    analysis = analyse(bigger, themes_path=themes_yaml, n_topics=2)
    fig = topic_term_heatmap(analysis.topic_result)
    assert isinstance(fig, go.Figure)


def test_topic_term_heatmap_empty() -> None:
    empty = TopicModelResult(topics=[], document_topic_matrix=np.empty((0, 0)), vocabulary=[])
    fig = topic_term_heatmap(empty)
    assert isinstance(fig, go.Figure)


def test_wordcloud_png_returns_png_bytes() -> None:
    png = wordcloud_png(_result_with_data(), width=200, height=100)
    assert png.startswith(b"\x89PNG")


def test_wordcloud_png_empty_returns_minimal_png() -> None:
    png = wordcloud_png(ThemeCountResult())
    assert png.startswith(b"\x89PNG")
