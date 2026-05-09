# Making it work

G's bar: **works reliably every time I open it.**

## Launch contract

- One documented command (or one double-click) starts the app from cold.
- The same command works after a reboot, a week later, a laptop restart.
- No "now remember to run X first" dances. If setup is needed, it's automated or a self-healing file check.
- If the app has external dependencies (API keys, database files, folders), the launch step verifies they're present and prints a specific message if not.

## When something isn't right

- Errors are human-readable. "Couldn't open budget.db — file missing at ~/Documents/budget/budget.db" beats a 40-line stack trace.
- On launch failure, the app tells G what to do next in one sentence.
- Logs go somewhere consistent (`~/Library/Logs/<app-name>/` on macOS) so Claude can find them when debugging later.

## Verification before calling anything "done"

Before Claude reports a task complete:
1. Launch the app from a fresh terminal (not the one still loaded with env vars from dev).
2. Do the main user action end-to-end.
3. Close everything; reopen; do it again.
4. Only then say "done" — and list what was tested in the retro.

## Not the bar

- Zero bugs forever. Not the point.
- A full automated test suite. Useful when real, not a shipping blocker for a one-user app.
- Handling edge cases G will never hit. Stay on the happy path plus one or two realistic failure modes.
