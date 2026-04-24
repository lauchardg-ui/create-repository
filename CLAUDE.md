# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`create-repository` is a single-file Node.js CLI that creates a new GitHub repository for the current working directory. It reads `name` / `description` defaults from a local `package.json` (overridable via `--name`/`-n` and `--description`/`-d`), authenticates with GitHub via OAuth (`ghauth`), creates the repo with the `github` SDK, and runs `git remote add origin` if no `origin` is set.

There are no tests, no build step, and no linter configured. `package.json` defines no `scripts`.

## Commands

- Install deps: `npm install`
- Run locally: `./index.js` or `node index.js` (optionally with `--name <n> --description <d>`)
- Install globally for `create-repository` on PATH: `npm install -g .`

The CLI must be run from inside a git working tree — it shells out to `git status` and exits early if it sees `Not a git repository`.

## Architecture notes

- Entry point is `index.js` (declared as `bin.create-repository` in `package.json`); the whole flow lives there as a chain of callbacks: `git status` → `ghauth` → `github.repos.create` → `git remote` → optional `git remote add origin`.
- OAuth tokens are cached by `ghauth` under the `configName: 'create-repository'` (typically `~/.config/create-repository`); the `repo` scope is requested.
- After repo creation, `origin` is set to the SSH URL `git@github.com:<user>/<name>.git`. The user is told to `git push -u origin master` themselves — push is intentionally not automated.
- Error handling is minimal and tightly coupled to the `github@0.2.3` SDK's quirk of stringifying JSON errors into `err.message`; the code parses that string back to JSON to surface `errors[0].message`. Preserve this behavior unless upgrading the SDK.

## Dependencies

`ghauth`, `github` (legacy SDK, pinned to `^0.2.3`), and `minimist`. The `github` package is old and unmaintained under that name; do not casually bump it — the API surface used (`github.authenticate`, `github.repos.create`) differs in the successor `@octokit/*` packages.
