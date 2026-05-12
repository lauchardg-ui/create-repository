# Deployment Guide

The app's default OAuth flow (`InstalledAppFlow.run_local_server`) is designed
for a local desktop install. Hosting it on the web requires baking a long-lived
refresh token into hosted secrets so the app authenticates as exactly one
Gmail account (you). The easiest place to do that is **Streamlit Community
Cloud's free tier** — covered below.

For a real multi-user product you'd need a different auth model entirely
(web OAuth flow + session-keyed token store). That's a separate refactor,
not covered here.

---

## Streamlit Community Cloud (single-user)

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

## Security checklist

- [ ] `credentials.json` and `token.json` are **git-ignored** — they already
      are in this repo; verify with `git status` before pushing
- [ ] Use the **read-only Gmail scope** (`gmail.readonly`) — already enforced
      in `gmail_client.py`
- [ ] Rotate the OAuth client secret if it ever leaks (Google Cloud Console →
      Credentials → reset)
- [ ] Keep the `pip-audit` and `bandit` CI gates green — they already block
      merges on this repo
