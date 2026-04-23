# Python Client — Developer Guide

Development reference for the `client/python` package.

## Prerequisites

- **Python** ≥ 3.9
- **venv** (ships with Python)

## Setup

```bash
cd client/python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Project Structure

```
client/python/
├── maestro_runner/
│   ├── __init__.py       # Public API exports
│   ├── client.py         # MaestroClient — main HTTP client class
│   ├── commands.py       # Step builders (tap_on, input_text, swipe, …)
│   ├── models.py         # Data models (ElementSelector, ExecutionResult, DeviceInfo)
│   └── exceptions.py     # Error classes (MaestroError, SessionError, StepError)
├── tests/
│   ├── conftest.py       # Shared pytest fixtures — auto-starts maestro-runner server
│   ├── pages/            # Page Object Model base + page classes
│   │   ├── contact_list_page.py
│   │   └── edit_contact_page.py
│   ├── test_client.py    # Unit tests (requests-mock)
│   ├── test_models.py    # Model serialization tests
│   ├── test_add_contact.py
│   ├── test_contact_persists.py
│   └── test_e2e_android.py
├── pyproject.toml        # Build, dependencies, tool config (ruff, mypy, pytest)
└── README.md
```

## Lint

Linting uses **ruff** (style + import order + security) and **mypy** (strict type checking).

```bash
# Check for issues
source .venv/bin/activate
ruff check maestro_runner tests
mypy maestro_runner

# Auto-fix what's possible
ruff check --fix maestro_runner tests
ruff format maestro_runner tests
```

Or via the root Makefile:

```bash
make lint-py        # ruff check + mypy
make lint-py-fix    # ruff check --fix + ruff format
```

### Key Ruff Rule Sets

| Set | Description |
|-----|-------------|
| `E` / `W` | pycodestyle errors and warnings |
| `F` | pyflakes (undefined names, unused imports) |
| `I` | isort (import ordering) |
| `B` | flake8-bugbear (common bugs and design issues) |
| `UP` | pyupgrade (modern Python syntax) |
| `N` | pep8-naming conventions |
| `S` | flake8-bandit (security); `S101` (assert) ignored in tests |
| `RUF` | ruff-specific rules |

### mypy

Runs in `strict` mode on `maestro_runner/`. All public functions must be fully typed.

## Test

Tests use **pytest** (`pytest-xdist` for parallelism, `pytest-html` for reports) and run against a live maestro-runner server.

```bash
# Run all tests (unit + e2e — requires emulator + server)
source .venv/bin/activate
pytest

# Run unit tests only (no device needed)
pytest tests/test_client.py tests/test_models.py

# Run e2e tests in parallel across connected devices
pytest tests/test_add_contact.py tests/test_contact_persists.py -n auto -v

# Run a specific test
pytest tests/test_add_contact.py::TestAddContact::test_add_and_verify_contact -v
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAESTRO_SERVER_URL` | `http://localhost:9999` | Server URL |
| `MAESTRO_PLATFORM` | `android` | Target platform (`android` / `ios`) |
| `MAESTRO_RUNNER_BIN` | `../../maestro-runner` | Path to maestro-runner binary |

The `conftest.py` session fixture auto-starts the maestro-runner server if it isn't already running. In `pytest-xdist` parallel mode, each worker spawns its own server instance on a unique port targeting a specific device discovered via `adb devices`.

### Test Reports

HTML and JUnit XML reports are written automatically:

```
reports/report.html
reports/junit-report.xml
```

Additional analysis logs are written during test runs:

```
reports/pytest-run-<YYYYMMDD-HHMMSS>-<worker>-<pid>.log
reports/server-run-<YYYYMMDD-HHMMSS>-<worker>.log
reports/server-latest.json
reports/artifact-summary-<runId>.json
```

- `pytest-run-...log` contains persisted Python log records with worker id.
- `server-run-...log` is the canonical server stdout/stderr log for that worker run.
- `server-latest.json` maps each worker id to its latest run metadata and log path.
- `artifact-summary-...json` captures artifact paths/sizes and includes failure-tail snippets when a run fails.
- Appium-style server traces appear as `[TRACE]` lines with per-command request/response, status, and duration.

## Code Conventions

### Architecture

The client follows a thin layered design:

1. **`commands.py`** — Pure functions that build step JSON payloads (`dict[str, Any]`)
2. **`client.py`** — `MaestroClient` wraps HTTP calls to the REST API; each convenience method delegates to a command builder then calls `_exec()`
3. **`models.py`** — Typed dataclasses (`ElementSelector`, `ExecutionResult`, `DeviceInfo`) with `from_dict()` / `to_dict()` for JSON serialization
4. **`exceptions.py`** — Error hierarchy (`MaestroError` → `SessionError` / `StepError`)

### Adding a New Command

1. Add a builder function in `maestro_runner/commands.py`:

```python
def my_command(arg: str, *, label: str | None = None) -> dict[str, Any]:
    step: dict[str, Any] = {"type": "myCommand", "arg": arg}
    if label is not None:
        step["label"] = label
    return step
```

2. Add a convenience method in `maestro_runner/client.py`:

```python
def my_command(self, arg: str, *, label: str | None = None) -> ExecutionResult:
    return self._exec(commands.my_command(arg, label=label))
```

3. Export any new public names from `maestro_runner/__init__.py`.

### Page Object Model (Tests)

Tests use the Page Object pattern to keep test logic decoupled from selectors:

- Concrete pages expose domain actions (e.g., `contact_list.open_create_contact()`)
- Tests compose page methods; they never call `client.tap()` directly

### Type Annotations

All production code in `maestro_runner/` must be fully annotated. mypy runs in strict mode so partial annotations will fail CI. Use `from __future__ import annotations` at the top of each file to enable PEP 604 (`X | Y`) union syntax on Python 3.9.
