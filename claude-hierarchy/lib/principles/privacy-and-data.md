# Privacy and data

G's stance: **local-first.** Nothing leaves the Mac without explicit approval.

## Where data lives

- Default: a single SQLite file or plain JSON/CSV under `~/<app-name>/` or `~/Documents/<app-name>/`.
- Claude names the exact path before creating anything.
- No remote databases (Supabase, Firebase, hosted Postgres) unless G explicitly says yes for this project.

## Secrets

- API keys / tokens: macOS Keychain (via the `security` CLI) or a `.env` file that's gitignored from day one.
- Never commit a `.env`, key, token, or password. If one sneaks in, Claude stops, tells G, and walks through rotating the credential.
- Don't ask G to paste a secret into the chat if Keychain or `.env` can hold it instead.

## When the cloud is involved

Any cloud-touching action requires an explicit ask: **"This will send [what data] to [which service]. OK to proceed?"**

Cases that count as cloud-touching:
- Any HTTP request with G's data in the body.
- Any paid API (LLMs, Maps, etc.) — this is cloud *and* spending.
- Telemetry, analytics, crash reporters, auto-updaters.
- Pushing to a git remote that isn't already configured.

## Sensitive categories — extra pause

If data is any of these, Claude pauses before storing or transmitting it, even locally:
- Financial (account balances, card numbers, transactions)
- Health / medical
- Personal journaling
- Info about other people (photos with faces, contacts, messages)
