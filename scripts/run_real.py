"""Run the analyser against the inlined corpus from `scripts.real_corpus`."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import plotly.io as pio
from dateutil import parser as date_parser

from email_analyzer.analysis import analyse
from email_analyzer.gmail_client import EmailMessage
from email_analyzer.visualizations import (
    theme_bar_chart,
    theme_keyword_treemap,
    theme_timeseries,
    topic_bar,
    topic_term_heatmap,
    wordcloud_png,
)

sys.path.insert(0, str(Path(__file__).parent))
from real_corpus import CORPUS


def _parse_dt(s: str) -> datetime | None:
    try:
        dt = date_parser.parse(s)
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def main() -> int:
    messages = [
        EmailMessage(
            id=str(i),
            thread_id=str(i),
            sender=sender,
            subject=subject,
            snippet=snippet,
            body=f"{subject} {snippet}",
            mime_type="text/plain",
            received_at=_parse_dt(date),
            labels=(),
        )
        for i, (date, sender, subject, snippet) in enumerate(CORPUS)
    ]

    analysis = analyse(messages, themes_path="config/themes.yaml", n_topics=8)

    out_dir = Path("data/out")
    out_dir.mkdir(parents=True, exist_ok=True)

    charts = {
        "theme_bar.png": theme_bar_chart(analysis.theme_result),
        "theme_treemap.png": theme_keyword_treemap(analysis.theme_result),
        "topic_bar.png": topic_bar(analysis.topic_prevalence),
        "topic_heatmap.png": topic_term_heatmap(analysis.topic_result),
    }
    valid_ts = [t for t in analysis.timestamps if t is not None]
    valid_counters = [
        c
        for t, c in zip(analysis.timestamps, analysis.per_document_theme_counts, strict=False)
        if t is not None
    ]
    if valid_ts:
        charts["theme_timeseries.png"] = theme_timeseries(valid_ts, valid_counters, freq="W")

    try:
        for name, fig in charts.items():
            pio.write_image(fig, out_dir / name, width=1100, height=600, scale=2)
        png_ok = True
    except Exception as exc:
        print(f"PNG export skipped (kaleido unavailable): {exc}", file=sys.stderr)
        png_ok = False

    (out_dir / "wordcloud.png").write_bytes(
        wordcloud_png(analysis.theme_result, width=1100, height=600)
    )

    summary = {
        "n_messages": analysis.n_messages,
        "date_range": _date_range(analysis.timestamps),
        "theme_totals": dict(analysis.theme_result.theme_totals),
        "top_keywords_per_theme": {
            theme: list(counter.most_common(5))
            for theme, counter in analysis.theme_result.keyword_totals.items()
            if counter
        },
        "topic_prevalence": {k: round(v, 4) for k, v in analysis.topic_prevalence.items()},
        "topic_top_terms": {
            topic.label: [t for t, _ in topic.top_terms[:8]]
            for topic in analysis.topic_result.topics
        },
        "png_export_ok": png_ok,
        "outputs": str(out_dir),
    }
    print(json.dumps(summary, indent=2, sort_keys=False, default=str))
    return 0


def _date_range(timestamps: list) -> dict[str, str]:
    valid = [t for t in timestamps if t is not None]
    if not valid:
        return {}
    return {"earliest": str(min(valid).date()), "latest": str(max(valid).date())}


if __name__ == "__main__":
    sys.exit(main())
