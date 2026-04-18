# Project: Budget App (v1)

Local macOS personal-finance dashboard. Single user (G), single machine.

## What this is

Imports monthly CSV statements from **Amex** and **HSBC UK** (GBP), categorizes transactions with rule-based tagging + G's manual overrides, flags anomalies, and shows spending by category with month-over-month trends. Runs as a local Streamlit app in the browser.

## Commands

- **First-time setup** (run once, after Python 3.11+ is installed):
  - `python3 -m venv .venv`
  - `source .venv/bin/activate`
  - `pip install -r requirements.txt` — *Claude must ask before this runs (Layer 1 hard rule: install software).*
- **Launch**: `source .venv/bin/activate && streamlit run app.py`
- **Adding a month**: drop new CSVs into `statements/`, restart the app.

## Architecture (big picture)

```
statements/*.csv  ──► ingest.py  ──► uniform transaction schema
                                         │
                                         ▼
                                    categorize.py  (rules + overrides)
                                         │
                                         ▼
                                     storage.py (SQLite)
                                         │
                           ┌─────────────┼─────────────┐
                           ▼             ▼             ▼
                      anomalies.py   app.py          (future modules)
                                    Streamlit UI
```

**Stack:** Python 3.11+, Streamlit, pandas, SQLite (stdlib), PyYAML.
**Data at rest:** `~/Library/Mobile Documents/com~apple~CloudDocs/budget/budget.db`. iCloud **Advanced Data Protection is REQUIRED** — the app refuses to launch if it detects ADP is not enabled on the iCloud account.

## Project-specific conventions

- Banks are **Amex + HSBC UK only** in v1. Currency is GBP. Don't assume multi-bank or multi-currency.
- **Ingestion is idempotent** — re-importing a statement must be safe. Track by content hash.
- **Categorization is rule-based only.** No ML, no LLM calls anywhere in the categorization path. G's overrides (in `rules/overrides.yaml`) always win.
- **Anomaly detection is deterministic.** Three signals: single-transaction outlier (>2× 90th percentile of that category's trailing history), new merchant (never seen before in any month), category spike (monthly total >150% of trailing 3-month median). If fewer than 3 months of data exist, category-spike check returns no signals rather than guessing.
- **No network calls** from the app. Nothing leaves the machine.
- First run will produce many wrong categorizations — that's expected. G corrects them, and the overrides apply retroactively.

## Roadmap — DO NOT BUILD YET

Two modules are intentionally deferred:

1. **Retirement module.** Build after 2–3 months of real Budget data has accumulated. Needs real spending numbers, not guesses.
2. **Investment "thinking" module.** Deferred. When we get there, the framing decision to settle is:
   - ✅ Rule-based specific recommendations (target-allocation drift, fee thresholds, rebalancing triggers) — build these.
   - ❌ LLM-generated market calls ("buy X", "this sector will outperform") — don't build these. Plausible-sounding LLM reasoning is wrong often enough to lose real money, and Claude is not a licensed advisor.
   - Re-interview before starting this module.

## Imports

@~/.claude/lib/principles/keeping-it-simple.md
@~/.claude/lib/principles/making-it-work.md
@~/.claude/lib/principles/privacy-and-data.md
@~/.claude/lib/principles/learning-as-we-go.md
@~/.claude/lib/workflows/new-feature.md
@~/.claude/lib/workflows/fix-what-broke.md
@~/.claude/lib/workflows/walk-me-through.md
