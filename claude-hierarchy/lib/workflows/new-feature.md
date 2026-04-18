# Workflow: new feature

Guided process when I ask Claude to build something new.

## Phase 1 — Interview (always)

Ask me, then wait for answers:
1. What problem is this solving, and for whom?
2. What does "done" look like? (observable success criteria)
3. What's explicitly out of scope?
4. What existing code / services does this touch?
5. Any constraints I haven't mentioned (perf, compliance, deadline)?

Do not write code until I've answered. If I say "just go", confirm once, then proceed.

## Phase 2 — Sketch

Propose: files to touch, new files to create, public interfaces, test approach. 1 page max. Stop and wait for approval.

## Phase 3 — Build

Smallest viable slice first. Show diffs. Run tests after each slice. Commit on green.

## Phase 4 — Close

Summarize what changed, what's untested, what I should verify manually. Open questions stay open — do not silently close them.
