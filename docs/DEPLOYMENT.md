# Deployment Guide

The app's default OAuth flow (`InstalledAppFlow.run_local_server`) is designed
for a local desktop install. Hosting it on the web requires one of two changes:

1. **Single-user demo** — bake a long-lived refresh token into hosted secrets so
   the app authenticates as exactly one Gmail account (you). Simplest path,
   works on Streamlit Community Cloud's free tier.
2. **Multi-user production** — replace the desktop flow with a web OAuth flow,
   register an authorised redirect URI, and persist per-user tokens server-side.
   Bigger lift, covered later in this doc.

Pick option 1 unless you actually need to serve other people.

---

## Option 1 — Streamlit Community Cloud (single-user)

### One-off setup

1. **Generate a refresh token locally** by running the app once:

   ```bash
   make dev
   make run   # signs you in, writes ./token.json
   ```

   `token.json` now contains a long-lived OAuth refresh token for your account.
   Treat it like a password.

2. **Push the repo to GitHub** (the PR for this project already exists).

3. **Create a Streamlit Community Cloud app** at
   <https://share.streamlit.io>, pointing at:
   - Repo: `lauchardg-ui/create-repository`
   - Branch: the deployment branch (e.g. `main` once merged)
   - Main file path: `src/email_analyzer/app.py`

4. **Add your secrets** in *App settings → Secrets*. Paste your local
   `credentials.json` and `token.json` content as TOML strings:

   ```toml
   # .streamlit/secrets.toml
   [gmail_credentials]
   # entire contents of credentials.json
   value = """
   {"installed":{"client_id":"...","client_secret":"...", ...}}
   """

   [gmail_token]
   # entire contents of token.json
   value = """
   {"token":"...","refresh_token":"...","scopes":["https://www.googleapis.com/auth/gmail.readonly"], ...}
   """
   ```

5. **Add the secrets bridge** to the app. Two-line change in
   `src/email_analyzer/app.py` before any Gmail call:

   ```python
   from pathlib import Path
   import streamlit as st

   if "gmail_token" in st.secrets:
       Path("credentials.json").write_text(st.secrets["gmail_credentials"]["value"])
       Path("token.json").write_text(st.secrets["gmail_token"]["value"])
   ```

   The rest of the app reads those files unchanged.

### Result

App is live at `https://<your-app>.streamlit.app`. Sign-in is invisible because
the refresh token is already valid. The app is single-user — anyone who can
load the URL sees *your* mailbox analysis. Don't share the URL.

### Rotating the token

The token auto-refreshes against Google for ~6 months of inactivity. If it
expires, regenerate locally with `make run` and replace the secret.

---

## Option 2 — Google Cloud Run (production / multi-user)

For a real multi-user product. You'll need:

- A **Google Cloud project** with the Gmail API enabled.
- A **Web** OAuth client (not Desktop) in *APIs & Services → Credentials*, with
  an authorised redirect URI like `https://<your-host>/oauth/callback`.
- A **session store** (Redis, Firestore) — Cloud Run instances are stateless
  and per-request, so OAuth tokens can't live in local files.
- Code changes in `gmail_client.load_credentials()` to use
  `google_auth_oauthlib.flow.Flow` (web flow) instead of `InstalledAppFlow`, and
  to read/write tokens through your session store.

This is a meaningful refactor — happy to do it as a follow-up if you want to
ship a public product. For now this section documents the deploy mechanics; the
auth refactor is out of scope of the initial app.

### Build and deploy the container

Once the OAuth refactor is in:

```bash
# Build locally (or use Cloud Build)
gcloud builds submit --tag gcr.io/$PROJECT/email-theme-analyzer

# Deploy to Cloud Run (private by default)
gcloud run deploy email-theme-analyzer \
  --image gcr.io/$PROJECT/email-theme-analyzer \
  --region europe-west1 \
  --no-allow-unauthenticated \
  --memory 1Gi \
  --set-env-vars STREAMLIT_SERVER_PORT=8080 \
  --set-secrets OAUTH_CLIENT_SECRET=oauth-client:latest
```

Mount your Gmail OAuth client JSON via Secret Manager — never bake it into the
image.

The repo ships a `Dockerfile` ready for this — it installs deps, runs as a
non-root user, and starts Streamlit on `$PORT` (Cloud Run's convention).

### Cost expectations

Cloud Run free tier covers ~2M requests/month with the default min-instance=0
(scale to zero). Realistically you'll pay for the LDA fit + Gmail roundtrips,
not the request count. Expect <$5/month for personal use.

---

## Where to host: quick comparison

| Aspect | Streamlit Cloud | Cloud Run |
|---|---|---|
| Cost | Free | ~$0–5/mo personal |
| Setup time | 15 min | 1–2 hours + OAuth refactor |
| Multi-user | No | Yes |
| Custom domain | No (free tier) | Yes |
| Auto-sleep | Yes (cold start ~10s) | Yes (scale-to-zero) |
| Best for | Personal use, demo | Public product |

---

## Security checklist (both options)

- [ ] `credentials.json` and `token.json` are **git-ignored** — they already
      are in this repo, verify with `git status` before pushing
- [ ] Use the **read-only Gmail scope** (`gmail.readonly`) — already enforced
      in `gmail_client.py`
- [ ] Rotate the OAuth client secret if it ever leaks (Google Cloud Console →
      Credentials → reset)
- [ ] For Cloud Run, set `--no-allow-unauthenticated` unless you've added your
      own auth layer in front of Streamlit
- [ ] Keep the `pip-audit` and `bandit` CI gates green — they already block
      merges on this repo
