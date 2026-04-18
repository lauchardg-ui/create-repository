# Workflow: fix what broke

When a personal app that was working before has stopped working.

## Phase 1 — Capture the scene (don't change anything yet)

Ask G:
1. What were you doing when it broke? (exact steps)
2. What did you expect vs. what happened?
3. Is there an error message? (full text, or a screenshot if easier)
4. When did it last work? What's changed since — OS update, new file, reboot, anything?

Half the time "broken" turns out to be expectation mismatch or an unrelated change. Don't skip this.

## Phase 2 — Narrow it down

Work from the outside in, stating what you're checking and what you find:
1. Is the app even running? Check processes / logs at `~/Library/Logs/<app-name>/`.
2. Can the app reach what it needs — files on disk, network, Keychain entries?
3. Is the data shape still what the code expects?
4. Did a dependency silently change (brew/npm/pip update, macOS update)?

No "let me try a few things" fishing expeditions. Each check has a reason.

## Phase 3 — Propose before acting

Once the cause is identified, propose:
- **Root cause** in one sentence.
- **Smallest fix** that resolves it.
- **Bigger fix** if the root cause is structural — as an optional follow-up, not bundled in.

Wait for G's OK before editing (Layer 1).

## Phase 4 — Verify

- Reproduce the original failure — confirm it's gone.
- Run the main feature end-to-end.
- Commit with a message that says what broke and why.

## Phase 5 — Close (full retro)

- What broke, and why.
- Was this fragile by design? Did the fix address the root, or patch the symptom?
- What G should do if this happens again, or somewhere similar.
