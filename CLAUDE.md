# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file Node.js CLI (`index.js`) published to npm as `create-repository`. It creates a new GitHub repo for the current git working directory, using `package.json` `name`/`description` as defaults, and adds `origin` if missing.

## Commands

- `npm install` — install dependencies
- `node index.js` — run the CLI from source (equivalent to the installed `create-repository` bin)
- `node index.js --name foo --description "bar"` — override the defaults read from `package.json`

There is no test suite, linter, or build step configured in `package.json`.

## Architecture

Everything lives in `index.js` (~70 lines). The flow is a nested callback chain — preserve this shape when editing:

1. Load `package.json` from `process.cwd()` (via `path.resolve`) to supply default `name`/`description`. A missing/invalid file is swallowed silently.
2. Parse argv with `minimist` (`--name`/`-n`, `--description`/`-d`).
3. Shell out to `git status` to confirm the cwd is a git repo; bail with a friendly message if not.
4. `ghauth` with `configName: 'create-repository'` and scope `['repo']` to obtain a token (cached under the user's ghauth config).
5. Authenticate the `github` client (the old `github` npm package, v0.2.x, API version `3.0.0`) and call `github.repos.create`.
6. On API error, the library returns a JSON string in `err.message` — it's parsed manually and the first `errors[0].message` is printed.
7. Shell out to `git remote`; if `origin` is absent, `git remote add origin git@github.com:<user>/<name>.git`. The user is taken from `auth.user` returned by ghauth.

Key constraints to respect:

- The `github` dependency is pinned to `^0.2.3` — a very old API surface (`github.authenticate`, `github.repos.create` with node-style callbacks). Do not assume modern `@octokit/*` APIs.
- Remote URL is hardcoded to SSH (`git@github.com:…`).
- Error handling is intentionally minimal: most failures `throw err` and crash the process; the JSON-parse branch is the only structured handling.
