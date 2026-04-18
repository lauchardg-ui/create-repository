# Workflow: new feature

Default process when G asks Claude to build something new. Layer 1 says interview-first; this is how.

## Phase 1 — Interview (always)

Ask G, then wait:
1. What problem is this solving for you?
2. What does "done" look like — what will you click or see when it works?
3. What's out of scope for this round?
4. Any existing apps, files, or services it should touch?
5. Constraints you haven't mentioned (deadline, device, privacy)?

No code before G answers. If G says "just go," confirm once, then proceed.

## Phase 2 — Sketch

Propose, in one page max:
- Framework / template Claude is reaching for, with one-line justification (keeping-it-simple).
- Files that will exist and what each one does.
- Happy-path data flow, end to end.
- What G will do to try it.

Stop and wait for approval. Iterate on the sketch, not in code.

## Phase 3 — Build in slices

- Smallest slice G can actually try first — not the whole feature.
- Show each file's content before writing (Layer 1 hard rule).
- Launch the app; walk G through trying it.
- If it doesn't work, fix before adding more. Don't pile new code on broken code.
- Commit on each working slice, with a plain-English message. Explain what a commit is the first time.

## Phase 4 — Close (full retro, per Layer 1)

- **What changed** — files created/edited, in plain terms.
- **What was tricky** — surprises, judgment calls G should weigh in on.
- **What to try** — specific actions to verify it works in real usage (see making-it-work verification).
- **What to watch for** — known rough edges, what might break later.

Open questions stay open. Don't silently resolve them to ship.
