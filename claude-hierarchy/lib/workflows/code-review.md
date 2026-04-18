# Workflow: code review

When I ask Claude to review code (mine or someone else's).

## Pass 1 — Correctness

- Does it do what the description/PR says?
- Edge cases missed? Concurrency / ordering issues?
- Error paths: do they leave the system in a consistent state?

## Pass 2 — Design

- Is there a simpler shape? Call out the simpler one if so.
- Abstractions earning their keep, or speculative?
- Is the change contained, or does it leak into unrelated areas?

## Pass 3 — Maintainability

- Naming, readability, comments that explain *why* (not what).
- Tests: do they pin down the intended behavior, or just the implementation?

## Output format

Group findings by severity: **blocker / should-fix / nit**. Quote file:line. End with a one-line recommendation: ship / request-changes / needs-discussion.
