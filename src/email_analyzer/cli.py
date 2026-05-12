"""Command-line entry point.

The CLI is a thin convenience wrapper. It either launches the Streamlit UI or
prints a JSON summary, which is useful in CI and for quick checks.
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess  # nosec: B404 — used only to launch local streamlit
import sys
from pathlib import Path

from email_analyzer import __version__
from email_analyzer.analysis import analyse
from email_analyzer.gmail_client import (
    GmailAuthError,
    GmailClient,
    build_service,
    load_credentials,
)

logger = logging.getLogger(__name__)


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="email-theme-analyzer", description=__doc__)
    p.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Launch the Streamlit dashboard.")
    run.add_argument("--port", type=int, default=8501)

    summary = sub.add_parser("summary", help="Print a JSON summary to stdout.")
    summary.add_argument("--query", default="newer_than:30d")
    summary.add_argument("--max-results", type=int, default=100)
    summary.add_argument("--themes", default="config/themes.yaml")
    summary.add_argument("--topics", type=int, default=6)
    return p


def _run_streamlit(port: int) -> int:
    app_path = Path(__file__).with_name("app.py")
    cmd = [
        sys.executable,
        "-m",
        "streamlit",
        "run",
        str(app_path),
        "--server.port",
        str(port),
    ]
    # Static argv list, no shell, no untrusted input.
    return subprocess.run(cmd, check=False).returncode  # noqa: S603  # nosec B603


def _print_summary(query: str, max_results: int, themes_path: str, n_topics: int) -> int:
    try:
        creds = load_credentials()
    except GmailAuthError as exc:
        print(f"Auth failed: {exc}", file=sys.stderr)
        return 2
    client = GmailClient(service=build_service(creds))
    messages = client.fetch_messages(query=query, max_results=max_results)
    analysis = analyse(messages, themes_path=themes_path, n_topics=n_topics)
    payload = {
        "n_messages": analysis.n_messages,
        "theme_totals": dict(analysis.theme_result.theme_totals),
        "topic_prevalence": analysis.topic_prevalence,
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _build_parser().parse_args(argv)
    if args.command == "run":
        return _run_streamlit(args.port)
    if args.command == "summary":
        return _print_summary(args.query, args.max_results, args.themes, args.topics)
    return 1  # pragma: no cover - argparse already enforces this


if __name__ == "__main__":
    sys.exit(main())
