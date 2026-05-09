# claude-hierarchy

A layered CLAUDE.md setup for personal use with Claude Code, tuned for G (non-coder on macOS, building personal apps).

Copy into your real home once it feels right:

```
cp claude-hierarchy/CLAUDE.md ~/.claude/CLAUDE.md
cp -r claude-hierarchy/lib ~/.claude/lib
```

## Layers

1. **`CLAUDE.md`** — Layer 1, identity. Loaded in every session. Who G is, how Claude should behave, non-negotiables. ~40 lines.
2. **`lib/`** — Layer 2, reusable library. Not auto-loaded; pulled in on demand via `@` imports.
   - `principles/` — `keeping-it-simple`, `making-it-work`, `privacy-and-data`, `learning-as-we-go`.
   - `services/` — per-technology playbooks (starts with `_template.md`; fill per-project).
   - `workflows/` — guided processes: `new-feature`, `walk-me-through`, `fix-what-broke`.
3. **`project-template/CLAUDE.md`** — Layer 3. Drop at the root of a new project and `@`-import only the Layer-2 entries that apply.

## Import syntax

Inside any CLAUDE.md you can pull in another file:

```
@~/.claude/lib/principles/keeping-it-simple.md
@./docs/project-notes.md
```

Contents of the imported file get appended to the context at load time.

## Rules of thumb

- Layer 1 rides every session — every line costs. Keep it ruthless.
- Layer 2 files stay single-purpose and short. Long files defeat the "import only what's needed" model.
- Skills (`~/.claude/skills/<name>/SKILL.md`) are invoked on demand by Claude, not imported. Reference a skill by name from a workflow; don't inline it.
- Durable rules (e.g. "always interview before coding") live in Layer 1 or a `UserPromptSubmit` hook, not in session memory.

## What was deliberately left out

- `architecture.md`, `testing.md`, `security.md` — pro-dev tenets replaced by principle files written for G's context.
- `code-review.md` — replaced by `walk-me-through.md`, which teaches instead of critiques.
- A fixed stack or language — decided per project.
