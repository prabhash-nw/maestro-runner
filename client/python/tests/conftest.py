"""Shared pytest fixtures — auto-start maestro-runner server when needed."""

from __future__ import annotations

import os
import shutil
import subprocess
import time
from typing import Generator

import pytest
import requests

from maestro_runner import MaestroClient

SERVER_URL = os.environ.get("MAESTRO_SERVER_URL", "http://localhost:9999")
PLATFORM = os.environ.get("MAESTRO_PLATFORM", "android")
SERVER_PORT = SERVER_URL.rsplit(":", 1)[-1].rstrip("/")

# Where to find the binary — override with MAESTRO_RUNNER_BIN env var
_DEFAULT_BIN = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "maestro-runner",
)
MAESTRO_RUNNER_BIN = os.environ.get("MAESTRO_RUNNER_BIN", _DEFAULT_BIN)


def _server_is_ready(url: str, timeout: float = 2.0) -> bool:
    """Return True if the server responds to /status."""
    try:
        resp = requests.get(f"{url}/status", timeout=timeout)
        return resp.status_code == 200
    except requests.ConnectionError:
        return False


@pytest.fixture(scope="session")
def maestro_server() -> Generator[str, None, None]:
    """Ensure a maestro-runner server is available.

    If one is already running at SERVER_URL, reuse it.
    Otherwise, start one as a subprocess and shut it down after the session.
    """
    if _server_is_ready(SERVER_URL):
        yield SERVER_URL
        return

    binary = shutil.which("maestro-runner") or MAESTRO_RUNNER_BIN
    if not os.path.isfile(binary):
        pytest.fail(
            f"maestro-runner binary not found at {binary}. "
            "Set MAESTRO_RUNNER_BIN or add it to PATH."
        )

    proc = subprocess.Popen(
        [binary, "--platform", PLATFORM, "server", "--port", SERVER_PORT],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    # Wait for the server to become ready
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            out = proc.stdout.read().decode() if proc.stdout else ""
            pytest.fail(f"maestro-runner exited early (code {proc.returncode}):\n{out}")
        if _server_is_ready(SERVER_URL):
            break
        time.sleep(0.5)
    else:
        proc.terminate()
        pytest.fail("maestro-runner server did not become ready within 30 s")

    yield SERVER_URL

    proc.terminate()
    proc.wait(timeout=10)


@pytest.fixture(scope="session")
def client(maestro_server: str) -> Generator[MaestroClient, None, None]:
    """Create a MaestroClient session for the entire test session."""
    with MaestroClient(maestro_server, capabilities={"platformName": PLATFORM}) as c:
        yield c
