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

## API

See `maestro_runner/client.py` for the full API.
