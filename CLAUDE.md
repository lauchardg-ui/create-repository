# CLAUDE.md

## Project Overview

**create-repository** is a CLI tool that automates GitHub repository creation. It reads project metadata (name, description) from `package.json` if available, authenticates with GitHub via OAuth, creates the repository, and sets up the git remote origin.

- **Version:** 1.3.0
- **License:** MIT
- **Language:** Plain JavaScript (Node.js), no transpilation
- **Entry point:** `index.js` (single-file implementation, ~72 lines)

## Repository Structure

```
.
├── index.js          # Entire CLI implementation (executable via shebang)
├── package.json      # Project metadata, dependencies, bin config
├── .gitignore        # Ignores node_modules
├── README.md         # User-facing docs (install & usage)
└── LICENSE           # MIT license
```

This is a minimal, single-file project. There are no `src/`, `test/`, `lib/`, or `dist/` directories.

## Tech Stack & Dependencies

| Dependency | Purpose |
|---|---|
| `ghauth` (^2.0.0) | GitHub OAuth authentication |
| `github` (^0.2.3) | GitHub API client (v3.0.0) |
| `minimist` (^1.1.0) | CLI argument parsing |

No dev dependencies. No build tools, linters, formatters, or test frameworks.

## Development Commands

```bash
# Install dependencies
npm install

# Run the tool locally
node index.js
# or
./index.js

# Install globally for CLI usage
npm install -g .
```

There are no `npm scripts` defined in `package.json`. No test, lint, or build commands exist.

## Code Conventions

- **Indentation:** Tabs
- **Async pattern:** Callbacks (no Promises or async/await)
- **Variable declarations:** `var` (ES5 style)
- **Naming:** camelCase for variables and functions
- **Error handling:** `throw` for unexpected errors, `process.exit(1)` for known error conditions
- **Output:** `console.log()` for success messages, `console.error()` for errors
- **No semicolons at end of control structures** but semicolons used on statements

## Architecture Notes

The entire flow is in `index.js` with nested callbacks:

1. Check current directory is a git repo (`git status`)
2. Authenticate with GitHub (`ghauth`)
3. Create repository via GitHub API (`github.repos.create`)
4. Check for existing remotes (`git remote`)
5. Add origin remote if not already set (`git remote add origin`)

CLI arguments `--name`/`-n` and `--description`/`-d` override values read from `package.json`.

## CI/CD

No CI/CD pipelines are configured (no GitHub Actions, no `.github/workflows/`).

## Important Notes for AI Assistants

- This is a stable, legacy-style Node.js project. Maintain the existing callback-based, `var`-based style when making changes.
- Do not introduce TypeScript, ES modules, or modern async patterns unless explicitly requested.
- The `github` package used here is a very old version (0.2.3). Be aware that its API differs significantly from the modern `@octokit/rest` package.
- There are no tests. If adding functionality, consider whether tests should also be added.
- The binary entry point is configured in `package.json` under `"bin"`.
