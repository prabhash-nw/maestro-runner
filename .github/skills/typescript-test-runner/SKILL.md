---
name: typescript-test-runner
description: >
  Runs tests, lint, and build for the maestro-runner TypeScript client at
  client/typescript/. Use this skill whenever the user mentions TypeScript
  tests, Jest, npm test, e2e tests, linting, or building the TS client — even
  if they don't say "TypeScript" explicitly, apply this skill whenever the
  context is clearly client/typescript/. Make sure to use this skill for any
  jest, npm run, or npx jest command, and any time the user asks why a
  TypeScript test is failing. Handles server startup automatically via
  setup.ts. DO NOT use for Python tests, Go tests, or server-side code — use
  the python-test-runner skill or run Go tests directly.
allowed-tools: "Bash(npm:*) Bash(npx:*) Bash(node:*) Bash(adb:*) Bash(curl:*) Bash(make:*)"
metadata:
  author: maestro-runner
  version: 1.0.0
  category: testing
  tags: [typescript, jest, e2e, android, lint, build]
---

# TypeScript Test Runner

Runs tests, lint, and build for the TypeScript client at `client/typescript/`.

## Do NOT use this skill for

- Python tests → use the `python-test-runner` skill
- Go / server tests → run `go test ./...` directly
- General TypeScript questions unrelated to running tests

## Prerequisites

- **Node.js** ≥ 18 (`node --version`)
- Dependencies installed: `npm install` inside `client/typescript/`
- For e2e tests: Android emulator running + `maestro-runner` binary built

## Step 0: Setup (first time only)

```sh
cd client/typescript && npm install
```

## Step 1: Unit / Integration Tests

The test setup (`tests/setup.ts`) auto-starts the maestro-runner server if it isn't already running — no manual server startup needed.

```sh
# All tests
cd client/typescript && npm test

# E2E tests only
npm run test:e2e

# Specific test file
npx jest tests/test_add_contact.test.ts

# Specific test by name pattern
npx jest -t "should add a contact"

# Watch mode (re-runs on file change)
npx jest --watch
```

## Step 2: E2E Android Tests

### 1. Check emulator is attached
```sh
adb devices
```

### 2. Run (server is auto-started by setup.ts)
```sh
cd client/typescript && npm run test:e2e
```

To target a different server or platform:
```sh
MAESTRO_SERVER_URL=http://localhost:8888 MAESTRO_PLATFORM=android npm run test:e2e
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAESTRO_SERVER_URL` | `http://localhost:9999` | Server URL |
| `MAESTRO_PLATFORM` | `android` | Target platform (`android` / `ios`) |
| `MAESTRO_RUNNER_BIN` | `../../maestro-runner` | Path to maestro-runner binary |

## Step 3 (optional): Manual Server Startup

If `setup.ts` can't locate the binary or you want to manage the server yourself:

```sh
# From repo root
./maestro-runner --platform android server --port 9999 &>/tmp/maestro-server.log &

# Verify
curl -s http://localhost:9999/status
```

## Step 4: Build

```sh
cd client/typescript && npm run build
# Output: dist/ (JS + .d.ts + source maps)
```

## Step 5: Lint

```sh
cd client/typescript && npm run lint        # Check for issues
cd client/typescript && npm run lint:fix    # Auto-fix what's possible
```

Key ESLint rules: `consistent-type-imports`, `no-explicit-any` (warn in `src/`), `no-unused-vars`, `eqeqeq`, `no-console` (warn in `src/`).

## Reports

HTML and JUnit XML reports are written to `client/typescript/reports/` after every Jest run:
- `reports/report.html`
- `reports/junit-report.xml`

## Common Issues

| Problem | Fix |
|---------|-----|
| `Connection refused` | Server failed to auto-start; check `MAESTRO_RUNNER_BIN` path or start manually |
| `Cannot find module` | Dependencies not installed: `npm install` |
| `adb: command not found` | Android SDK not on PATH; set `ANDROID_HOME` |
| TypeScript compile errors | Run `npm run build` to see full tsc diagnostics |
| Lint `no-explicit-any` error | Avoid `any` in `src/`; use proper types or `unknown` |
