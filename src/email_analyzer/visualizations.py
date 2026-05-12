"""Plotly figure builders.

Each function returns a ``plotly.graph_objects.Figure`` and is pure (given the same
input it produces the same figure). This makes the figures easy to test for
structural properties without rendering them.
"""

from __future__ import annotations

from collections import Counter
from io import BytesIO
from typing import TYPE_CHECKING

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from wordcloud import WordCloud

if TYPE_CHECKING:
    from email_analyzer.themes import ThemeCountResult
    from email_analyzer.topics import TopicModelResult

# Use a single qualitative palette across all charts for a consistent look.
PALETTE = px.colors.qualitative.Bold


def theme_bar_chart(result: ThemeCountResult) -> go.Figure:
    """Horizontal bar of total mentions per theme, sorted descending."""
    items = sorted(result.theme_totals.items(), key=lambda kv: kv[1], reverse=True)
    themes = [k for k, _ in items]
    counts = [v for _, v in items]
    fig = go.Figure(
        data=go.Bar(
            x=counts,
            y=themes,
            orientation="h",
            marker={"color": counts, "colorscale": "Plasma", "showscale": False},
            text=counts,
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Total mentions per theme",
        xaxis_title="Mentions",
        yaxis_title=None,
        yaxis={"autorange": "reversed"},
        template="plotly_white",
        margin={"l": 100, "r": 40, "t": 60, "b": 40},
        height=max(320, 40 * len(themes) + 120),
    )
    return fig


def theme_keyword_treemap(result: ThemeCountResult) -> go.Figure:
    """Treemap of theme → keyword → count. Visual hierarchy of importance."""
    records = result.as_records()
    if not records:
        return _empty("No keyword matches yet")
    df = pd.DataFrame(records)
    fig = px.treemap(
        df,
        path=["theme", "keyword"],
        values="count",
        color="count",
        color_continuous_scale="Plasma",
    )
    fig.update_layout(
        title="Keyword breakdown by theme",
        template="plotly_white",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=560,
    )
    return fig


def theme_sunburst(result: ThemeCountResult) -> go.Figure:
    """Sunburst: an alternative hierarchical view that's easier on the eyes."""
    records = result.as_records()
    if not records:
        return _empty("No keyword matches yet")
    df = pd.DataFrame(records)
    fig = px.sunburst(
        df,
        path=["theme", "keyword"],
        values="count",
        color="count",
        color_continuous_scale="Viridis",
    )
    fig.update_layout(
        title="Theme composition",
        template="plotly_white",
        margin={"l": 10, "r": 10, "t": 60, "b": 10},
        height=560,
    )
    return fig


def theme_timeseries(
    timestamps: list[pd.Timestamp],
    per_doc_counters: list[Counter[str]],
    *,
    freq: str = "W",
) -> go.Figure:
    """Stacked area chart of theme mentions over time."""
    if not timestamps or not per_doc_counters:
        return _empty("No timestamped messages to chart")
    rows: list[dict[str, object]] = []
    for ts, counter in zip(timestamps, per_doc_counters, strict=False):
        if ts is None:
            continue
        for theme, count in counter.items():
            rows.append({"timestamp": ts, "theme": theme, "count": count})
    if not rows:
        return _empty("No timestamped messages to chart")
    df = pd.DataFrame(rows)
    df["bucket"] = df["timestamp"].dt.to_period(freq).dt.to_timestamp()
    pivot = (
        df.groupby(["bucket", "theme"], as_index=False)["count"]
        .sum()
        .pivot(index="bucket", columns="theme", values="count")
        .fillna(0)
        .sort_index()
    )
    fig = go.Figure()
    for i, theme in enumerate(pivot.columns):
        fig.add_trace(
            go.Scatter(
                x=pivot.index,
                y=pivot[theme],
                name=theme,
                mode="lines",
                stackgroup="one",
                line={"width": 0.5, "color": PALETTE[i % len(PALETTE)]},
            )
        )
    fig.update_layout(
        title=f"Theme mentions over time ({freq})",
        xaxis_title=None,
        yaxis_title="Mentions",
        template="plotly_white",
        hovermode="x unified",
        height=420,
        margin={"l": 40, "r": 40, "t": 60, "b": 40},
    )
    return fig


def topic_bar(prevalence: dict[str, float]) -> go.Figure:
    """Horizontal bar of auto-discovered topic prevalence."""
    if not prevalence:
        return _empty("Not enough emails to discover topics")
    items = sorted(prevalence.items(), key=lambda kv: kv[1], reverse=True)
    labels = [k for k, _ in items]
    weights = [round(v * 100, 2) for _, v in items]
    fig = go.Figure(
        data=go.Bar(
            x=weights,
            y=labels,
            orientation="h",
            marker={"color": weights, "colorscale": "Viridis", "showscale": False},
            text=[f"{w}%" for w in weights],
            textposition="outside",
        )
    )
    fig.update_layout(
        title="Auto-discovered topic prevalence",
        xaxis_title="Share of corpus (%)",
        yaxis={"autorange": "reversed"},
        template="plotly_white",
        height=max(320, 40 * len(labels) + 120),
        margin={"l": 160, "r": 60, "t": 60, "b": 40},
    )
    return fig


def topic_term_heatmap(topic_result: TopicModelResult, *, top_n: int = 8) -> go.Figure:
    """Heatmap of top terms per topic — a compact way to read out the model."""
    if not topic_result.topics:
        return _empty("Not enough emails to discover topics")
    terms_per_topic: list[list[str]] = []
    weights_per_topic: list[list[float]] = []
    for topic in topic_result.topics:
        top = topic.top_terms[:top_n]
        terms_per_topic.append([t for t, _ in top])
        weights_per_topic.append([w for _, w in top])
    # Build a union vocabulary, then a (topic, term) weight matrix.
    vocab: list[str] = []
    seen: set[str] = set()
    for terms in terms_per_topic:
        for t in terms:
            if t not in seen:
                vocab.append(t)
                seen.add(t)
    matrix = [[0.0] * len(vocab) for _ in topic_result.topics]
    for i, (terms, weights) in enumerate(zip(terms_per_topic, weights_per_topic, strict=False)):
        for term, weight in zip(terms, weights, strict=False):
            matrix[i][vocab.index(term)] = weight
    labels = [topic.label for topic in topic_result.topics]
    fig = go.Figure(
        data=go.Heatmap(
            z=matrix,
            x=vocab,
            y=labels,
            colorscale="Plasma",
            colorbar={"title": "Weight"},
        )
    )
    fig.update_layout(
        title="Top terms per discovered topic",
        template="plotly_white",
        height=max(320, 60 * len(labels) + 120),
        margin={"l": 200, "r": 40, "t": 60, "b": 80},
        xaxis={"tickangle": -45},
    )
    return fig


def wordcloud_png(result: ThemeCountResult, *, width: int = 800, height: int = 400) -> bytes:
    """Generate a PNG word cloud from theme keyword counts. Returns image bytes."""
    frequencies: dict[str, int] = {}
    for kw_counter in result.keyword_totals.values():
        for kw, count in kw_counter.items():
            frequencies[kw] = frequencies.get(kw, 0) + count
    if not frequencies:
        # Return a 1x1 transparent PNG.
        return (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f"
            b"\x00\x00\x01\x01\x01\x00\x1b\xb6\xee\x56\x00\x00\x00\x00IEND\xaeB`\x82"
        )
    wc = WordCloud(
        width=width,
        height=height,
        background_color="white",
        colormap="plasma",
        prefer_horizontal=0.9,
    ).generate_from_frequencies(frequencies)
    buf = BytesIO()
    wc.to_image().save(buf, format="PNG")
    return buf.getvalue()


def _empty(message: str) -> go.Figure:
    fig = go.Figure()
    fig.add_annotation(
        text=message,
        xref="paper",
        yref="paper",
        x=0.5,
        y=0.5,
        showarrow=False,
        font={"size": 16},
    )
    fig.update_layout(
        template="plotly_white",
        xaxis={"visible": False},
        yaxis={"visible": False},
        height=320,
        margin={"l": 10, "r": 10, "t": 40, "b": 10},
    )
    return fig
