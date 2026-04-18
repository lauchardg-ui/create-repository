# claude-hierarchy

A layered CLAUDE.md setup for personal use with Claude Code. Copy into your real home with:

```
cp -r claude-hierarchy/CLAUDE.md ~/.claude/CLAUDE.md
cp -r claude-hierarchy/lib ~/.claude/lib
```

## Layers

1. **`CLAUDE.md`** — Layer 1, identity. Loaded in every session. Who I am, how I want Claude to behave, non-negotiables. Keep short (~50 lines).
2. **`lib/`** — Layer 2, reusable library. Not auto-loaded; pulled in on demand via `@` imports from Layer 1 or project files.
   - `principles/` — architecture, testing, security, code-style tenets (one file per tenet)
   - `services/` — per-technology playbooks (one file per service)
   - `workflows/` — guided processes (new-feature, code-review, bug-triage, refactor)
3. **`project-template/CLAUDE.md`** — Layer 3 template. Drop at the root of a new project and `@`-import only the Layer-2 entries that apply.

## Import syntax

Inside any CLAUDE.md you can pull another file in with:

```
@~/.claude/lib/principles/architecture.md
@./docs/architecture.md
```

The imported file's contents are appended to Claude's context at load time.

## Rules of thumb

- Layer 1 rides in every session — every line costs. Keep it ruthless.
- Each Layer 2 file stays single-purpose and short. Long files defeat the "import only what's needed" model.
- Skills (`~/.claude/skills/<name>/SKILL.md`) are invoked on demand by Claude, not imported. Reference a skill *by name* from a workflow file when relevant; don't inline its contents.
- A durable rule (e.g. "always interview before coding") belongs in Layer 1 or a `UserPromptSubmit` hook, not session memory.
