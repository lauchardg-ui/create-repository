"""One-shot real-mailbox analyser.

Reads thread JSON saved by the Gmail MCP `search_threads` calls into
`data/threads_*.json`, converts them into `EmailMessage` objects, and runs the
full analyser. Outputs:

* CSV with theme totals
* CSV with keyword counts per theme
* PNG word cloud
* PNG bar / treemap / time-series charts (via plotly.io.to_image)
* JSON summary on stdout
"""

from __future__ import annotations

import argparse
import html
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
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


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        dt = date_parser.parse(s)
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _load_threads(paths: list[Path]) -> list[EmailMessage]:
    messages: list[EmailMessage] = []
    for p in paths:
        payload = json.loads(p.read_text(encoding="utf-8"))
        for thread in payload.get("threads", []):
            for msg in thread.get("messages", []):
                snippet = html.unescape(msg.get("snippet", "") or "")
                subject = html.unescape(msg.get("subject", "") or "")
                messages.append(
                    EmailMessage(
                        id=msg.get("id", ""),
                        thread_id=thread.get("id", ""),
                        sender=msg.get("sender", "") or "",
                        subject=subject,
                        snippet=snippet,
                        body=snippet,  # search_threads only returns snippet
                        mime_type="text/plain",
                        received_at=_parse_dt(msg.get("date")),
                        labels=(),
                    )
                )
    return messages


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data", help="Directory of thread_*.json files")
    parser.add_argument("--themes", default="config/themes.yaml")
    parser.add_argument("--topics", type=int, default=8)
    parser.add_argument("--out-dir", default="data/out")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    paths = sorted(data_dir.glob("threads_*.json"))
    if not paths:
        print(f"No thread files found in {data_dir}/", file=sys.stderr)
        return 1

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    messages = _load_threads(paths)
    if not messages:
        print("No messages parsed.", file=sys.stderr)
        return 1

    analysis = analyse(messages, themes_path=args.themes, n_topics=args.topics)

    # CSV outputs
    pd.DataFrame(
        sorted(
            analysis.theme_result.theme_totals.items(),
            key=lambda kv: kv[1],
            reverse=True,
        ),
        columns=["theme", "mentions"],
    ).to_csv(out_dir / "theme_totals.csv", index=False)

    pd.DataFrame(analysis.theme_result.as_records()).sort_values(
        ["theme", "count"], ascending=[True, False]
    ).to_csv(out_dir / "keyword_counts.csv", index=False)

    # PNG visualisations (Plotly's to_image needs kaleido; fall back gracefully)
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
    except Exception as exc:
        print(f"Skipping PNG export (kaleido unavailable): {exc}", file=sys.stderr)

    # Word cloud
    (out_dir / "wordcloud.png").write_bytes(
        wordcloud_png(analysis.theme_result, width=1100, height=600)
    )

    # JSON summary on stdout
    summary = {
        "n_messages": analysis.n_messages,
        "date_range": _date_range(analysis.timestamps),
        "theme_totals": dict(analysis.theme_result.theme_totals),
        "top_keywords_per_theme": {
            theme: counter.most_common(5)
            for theme, counter in analysis.theme_result.keyword_totals.items()
        },
        "topic_prevalence": analysis.topic_prevalence,
        "topic_top_terms": {
            topic.label: [t for t, _ in topic.top_terms[:6]]
            for topic in analysis.topic_result.topics
        },
        "outputs_dir": str(out_dir),
    }
    print(json.dumps(summary, indent=2, sort_keys=True, default=str))
    return 0


def _date_range(timestamps: list) -> dict[str, str]:
    valid = [t for t in timestamps if t is not None]
    if not valid:
        return {}
    return {"earliest": str(min(valid).date()), "latest": str(max(valid).date())}


if __name__ == "__main__":
    sys.exit(main())
