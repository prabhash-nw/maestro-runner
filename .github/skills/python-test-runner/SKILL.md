---
name: python-test-runner
description: >
  Runs tests, lint, and type checks for the maestro-runner Python client at
  client/python/. Use this skill whenever the user mentions pytest, ruff,
  mypy, the Python venv, or running/debugging tests for client/python/ — even
  if they just say "run the tests" and the context is clearly Python. Make
  sure to use this skill for any pytest or make lint-py command, and any time
  the user asks why a Python test is failing or the venv isn't working. DO NOT
  use for TypeScript tests, Go tests, or server-side code — use the
  typescript-test-runner skill or run Go tests directly.
allowed-tools: "Bash(python:*) Bash(python3:*) Bash(pip:*) Bash(pip3:*) Bash(pytest:*) Bash(ruff:*) Bash(mypy:*) Bash(make:*) Bash(adb:*) Bash(curl:*) Bash(source:*)"
metadata:
  author: maestro-runner
  version: 1.0.0
  category: testing
  tags: [python, pytest, e2e, android, lint, mypy, ruff]
---

# Python Test Runner

Runs tests, lint, and type checks for the Python client at `client/python/`.

## Do NOT use this skill for

- TypeScript tests → use the `typescript-test-runner` skill
- Go / server tests → run `go test ./...` directly
- General Python questions unrelated to running tests

## Prerequisites

- Python venv at `client/python/.venv/` — activate it before every command or
  pytest will use the system Python and not find the project's dependencies
- For e2e/Android tests: Android emulator running + `maestro-runner` binary built

```sh
# Activate the venv first — all commands below assume it is active
cd client/python && source .venv/bin/activate
```

## Step 1: Unit Tests (no device needed)

```sh
# All unit tests
cd client/python && source .venv/bin/activate && python -m pytest tests/test_client.py tests/test_models.py -v

# Single file
python -m pytest tests/test_client.py -v

# Specific test
python -m pytest tests/test_client.py::TestSessionManagement::test_create_session -v

# Parallel execution
python -m pytest tests/test_client.py tests/test_models.py -n auto -v
```

## Step 2: E2E Android Tests

Requires the server to be running first.

### 1. Check emulator is attached
```sh
adb devices
```

### 2. Start the server (if not already running)
```sh
# From repo root — runs in background
./maestro-runner --platform android server --port 9999 &>/tmp/maestro-server.log &

# Verify it's up
curl -s http://localhost:9999/status
```

### 3. Run the tests
```sh
cd client/python && source .venv/bin/activate && python -m pytest tests/test_e2e_android.py -v
```

To target a different server URL:
```sh
MAESTRO_SERVER_URL=http://localhost:8888 python -m pytest tests/test_e2e_android.py -v
```

## Step 3: Page-Object / Integration Tests (need device + server)

```sh
cd client/python && source .venv/bin/activate && \
  python -m pytest tests/test_add_contact.py tests/test_contact_persists.py -n auto -v
```

## Step 4: Lint

```sh
# From repo root via Makefile
make lint-py

# Or directly
cd client/python && source .venv/bin/activate
ruff check maestro_runner tests
mypy maestro_runner

# Auto-fix
make lint-py-fix
```

## Step 5: All Tests (unit only, no device)

```sh
cd client/python && source .venv/bin/activate && python -m pytest tests/test_client.py tests/test_models.py -v
```

## Reports

HTML and JUnit XML reports are written to `client/python/reports/` after every pytest run:
- `reports/report.html`
- `reports/junit-report.xml`

## Common Issues

| Problem | Fix |
|---------|-----|
| `Connection refused` on e2e tests | Server not running — start it with step 2 above |
| `ModuleNotFoundError` | venv not activated or deps not installed: `pip install -e ".[dev]"` |
| `adb: command not found` | Android SDK not on PATH; set `ANDROID_HOME` |
| Lint `E501` line-too-long | Line length limit is 100; wrap long lines |
