# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`create-repository` is a small Node.js CLI that creates a new GitHub repository for the current working directory. It is published to npm as a global binary (`bin.create-repository` in `package.json` points at `index.js`).

## Commands

- Install dependencies: `npm install`
- Run locally against the current directory: `./index.js` (or `node index.js`)
- Run with explicit args: `./index.js --name my-repo --description "..."` (aliases: `-n`, `-d`)

There is no test suite, build step, or linter configured.

## Architecture

The entire tool is a single sequential flow in `index.js`:

1. Load `package.json` from the current working directory (best-effort) and use its `name`/`description` as defaults for the CLI args parsed via `minimist`.
2. Run `git status` via `child_process.exec` and bail out if the cwd is not a git repository (matched by the string `Not a git repository` in stderr — this is the guard added in commit `75cf5d7`).
3. Authenticate against GitHub with `ghauth` (configName `create-repository`, scope `repo`). `ghauth` caches the token on disk so the user is only prompted once.
4. Call `github.repos.create({ name, description })` using the `github` v0.2.3 client. On API error, the error message is JSON; the first `errors[0].message` is printed and the process exits 1.
5. Run `git remote`; if `origin` is not already present, add `git@github.com:<user>/<name>.git` as `origin`.

Key things to know when editing:

- The `github` npm package pinned here is the legacy `0.2.3` client (now superseded by `@octokit/rest`). API surface and error shapes are specific to that version — don't assume modern Octokit semantics.
- Errors from the GitHub client arrive as an `Error` whose `message` is a JSON string. The code distinguishes "JSON API error" from "other error" by checking whether `err.message[0] === '{'`.
- All git interaction is shelling out to the system `git` binary; there's no library wrapper.
- The success message still suggests `git push -u origin master` (hard-coded branch name).
