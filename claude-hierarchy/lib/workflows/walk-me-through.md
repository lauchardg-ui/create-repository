# Workflow: walk me through

When G wants Claude to walk through code — either something Claude just built, or something G is trying to understand.

Not a pro-style code review. This is a teaching tour.

## Structure

### 1. The map (30 seconds)

- What does this app / file do, in one sentence?
- What are the main pieces, and how does data flow between them?

### 2. The tour (the main event)

Walk top-to-bottom, or follow the data flow. At each interesting piece:
- What is this?
- Why is it here — what problem does it solve?
- What would happen if it wasn't?
- Spreadsheet analogy where one fits.

### 3. Things to notice

- Clever bits G should understand so they can modify safely.
- Places where a different choice was reasonable — name the tradeoff.
- Anything that *looks* weird but is intentional (and why).

### 4. Risks

- What could break this? Under what conditions?
- Blast radius if it breaks — annoying, data loss, or money?

## Output format

Conversational. Use G's real file and variable names. Quote `file:line` when pointing at something specific. **One section at a time is better than a wall of text** — pause between sections and let G react or ask.

## When G interrupts with a question

Answer it fully before resuming the tour. Learning-as-we-go is the point; don't rush past a confusion to finish the walkthrough.
