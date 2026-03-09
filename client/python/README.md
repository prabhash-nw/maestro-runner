# maestro-runner Python Client

Python client for the `maestro-runner` REST API server.

## Installation

```bash
pip install -e .
```

## Quick Start

```python
from maestro_runner import MaestroClient

# Start maestro-runner server first:
#   maestro-runner server --port 9999

with MaestroClient(
    "http://localhost:9999",
    capabilities={"platformName": "android", "appId": "com.example.app"},
) as c:
    c.launch_app("com.example.app")
    c.tap(text="Login")
    c.input_text("user@example.com")
    c.assert_visible(text="Dashboard", timeout_ms=10000)

    info = c.device_info()
    print(f"Device: {info.device_name} ({info.platform} {info.os_version})")
```

## Running Tests

### Sequential (single device)

```bash
cd client/python
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

pytest tests/test_add_contact.py tests/test_contact_persists.py -v
```

### Parallel (multiple devices)

Run tests in parallel across multiple Android emulators using
[pytest-xdist](https://pypi.org/project/pytest-xdist/). Each worker
automatically starts its own `maestro-runner` server on a unique port and
targets a specific device.

**Prerequisites:**

1. Two or more Android emulators running (`adb devices` shows them).
2. `pytest-xdist` installed:

   ```bash
   pip install pytest-xdist
   ```

**Run with `-n <workers>`:**

```bash
# Run on 2 emulators in parallel
pytest tests/test_add_contact.py tests/test_contact_persists.py -n 2 -v
```

Worker `gw0` gets the first device (e.g. `emulator-5554`) on port 9999,
`gw1` gets the second device (e.g. `emulator-5556`) on port 10000, and so on.

**Environment variables:**

| Variable             | Default                  | Description                        |
|----------------------|--------------------------|------------------------------------|
| `MAESTRO_SERVER_URL` | `http://localhost:9999`  | Base URL (port used as starting port in parallel mode) |
| `MAESTRO_PLATFORM`   | `android`                | Target platform                    |
| `MAESTRO_RUNNER_BIN` | `../../maestro-runner`   | Path to the maestro-runner binary  |

## API

See `maestro_runner/client.py` for the full API.
