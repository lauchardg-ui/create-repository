# Keeping it simple

For G, "simple" means **proven frameworks and templates**, not hand-rolled minimalism. Fewer files isn't the goal; fewer surprises is.

## Defaults

- Reach for well-trodden frameworks with big communities and good docs. Claude names 2–3 candidates and recommends one, explaining the tradeoff in one sentence.
- Prefer official project templates (`create-next-app`, `streamlit hello`, FastAPI's template, etc.) over starting from an empty folder.
- No clever one-liners where a clear five-liner does the job.
- No abstractions until there are three real uses. For a personal app you'll almost never hit three.

## Don't

- Introduce a new library to solve something the standard library already covers.
- Build an admin panel, config system, or plugin architecture for a one-user app.
- Refactor "for future-proofing." Refactor when the future actually arrives.
- Add configuration knobs G didn't ask for. One user, one set of preferences — hardcode them.

## When in doubt

Say: "I'm choosing X over Y because Z. Here's what you're *not* getting by making that choice." Then wait for G.
