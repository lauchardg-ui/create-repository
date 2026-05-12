# Email Theme Analyzer

Count how often key themes show up in your Gmail inbox, and let the corpus
itself reveal hidden topics. Interactive Plotly dashboards built on Streamlit.

- **Gmail OAuth (read-only scope)** — your inbox stays yours, the token is
  cached locally.
- **Hybrid theme detection** — deterministic keyword groups defined in YAML
  *and* auto-discovered topics via LDA (`scikit-learn`).
- **Polished visuals** — sortable bar charts, treemap, sunburst, stacked area
  time-series, word cloud, and a top-terms heatmap.
- **Built for quality** — `ruff` lint+format, `mypy` strict types, `pytest`
  with 85%+ coverage gate, `bandit` SAST, `pip-audit` for CVEs, CodeQL on
  schedule, multi-version matrix in CI.

## Quick start

```bash
make dev                     # install package + dev dependencies
make run                     # launch the Streamlit dashboard
```

First run will open a browser for Google sign-in. Place the OAuth desktop
client JSON at `./credentials.json` — see [Google's docs](https://developers.google.com/gmail/api/quickstart/python).
The refresh token is cached at `./token.json`.

## Project layout

```
src/email_analyzer/
  preprocess.py        # HTML stripping, normalisation, tokenisation
  themes.py            # YAML-driven keyword counts
  topics.py            # LDA auto-discovered topics
  gmail_client.py      # OAuth + Gmail v1 wrapper (read-only)
  analysis.py          # orchestrator
  visualizations.py    # Plotly figure builders + word cloud PNG
  app.py               # Streamlit UI
  cli.py               # `email-theme-analyzer run|summary`
config/themes.yaml     # default theme dictionary — edit freely
tests/                 # pytest suite, network calls mocked
```

## Configuring themes

Edit `config/themes.yaml`:

```yaml
themes:
  Work:
    - meeting
    - deadline
    - project
  Finance:
    - invoice
    - payment
```

Matches are case-insensitive and respect word boundaries (`project` matches
`Project` but not `projects`).

## Quality checks

| Check          | Tool         | Command          |
| -------------- | ------------ | ---------------- |
| Lint           | ruff         | `make lint`      |
| Format         | ruff format  | `make format`    |
| Type-check     | mypy strict  | `make typecheck` |
| Tests + cov ≥85% | pytest     | `make test`      |
| SAST           | bandit       | `make security`  |
| Dep CVEs       | pip-audit    | `make audit`     |
| Full sweep     | all          | `make ci`        |

CI (`.github/workflows/ci.yml`) runs all of the above across Python 3.10, 3.11,
3.12, plus a `build` job that produces wheel/sdist artifacts. CodeQL runs
weekly via `.github/workflows/codeql.yml`.

## Security notes

- Only `gmail.readonly` is requested.
- `credentials.json`, `token.json`, and `.env*` are git-ignored.
- All Gmail interaction lives in `gmail_client.py` and is mocked in tests
  — no test ever touches the network.
- `bandit` and `pip-audit` run on every push.

## Deployment

The default flow is local-only (per-user desktop OAuth). For a hosted
single-user demo on Streamlit Community Cloud, see
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## License

MIT — see [LICENSE](./LICENSE).
