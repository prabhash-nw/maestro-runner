/**
 * Shared test setup — auto-start maestro-runner server when needed.
 *
 * Equivalent of Python conftest.py.
 *
 * Env vars:
 *   MAESTRO_SERVER_URL   (default: http://localhost:9999)
 *   MAESTRO_PLATFORM     (default: android)
 *   MAESTRO_RUNNER_BIN   (path to binary, auto-detected by default)
 */

import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { MaestroClient } from "../src";

const SERVER_URL = process.env.MAESTRO_SERVER_URL ?? "http://localhost:9999";
const PLATFORM = process.env.MAESTRO_PLATFORM ?? "android";
const SERVER_PORT = new URL(SERVER_URL).port || "9999";

const DEFAULT_BIN = path.resolve(__dirname, "..", "..", "..", "maestro-runner");
const MAESTRO_RUNNER_BIN = process.env.MAESTRO_RUNNER_BIN ?? DEFAULT_BIN;

async function serverIsReady(url: string): Promise<boolean> {
  try {
    const resp = await fetch(`${url}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** Sleeps for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let serverProcess: ChildProcess | undefined;
let sharedClient: MaestroClient | undefined;

/**
 * Ensure a maestro-runner server is available. Starts one if needed.
 * Returns the server URL.
 */
export async function ensureServer(): Promise<string> {
  if (await serverIsReady(SERVER_URL)) return SERVER_URL;

  const binary = MAESTRO_RUNNER_BIN;
  if (!fs.existsSync(binary)) {
    throw new Error(
      `maestro-runner binary not found at ${binary}. ` +
        "Set MAESTRO_RUNNER_BIN or add it to PATH.",
    );
  }

  serverProcess = spawn(binary, ["--platform", PLATFORM, "server", "--port", SERVER_PORT], {
    stdio: "pipe",
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode != null) {
      throw new Error(
        `maestro-runner exited early (code ${serverProcess.exitCode})`,
      );
    }
    if (await serverIsReady(SERVER_URL)) return SERVER_URL;
    await sleep(500);
  }

  serverProcess.kill();
  throw new Error("maestro-runner server did not become ready within 30 s");
}

/** Get a shared MaestroClient, creating session on first call. */
export async function getClient(): Promise<MaestroClient> {
  if (sharedClient) return sharedClient;

  const url = await ensureServer();
  const client = new MaestroClient(url);
  await client.createSession({ platformName: PLATFORM });
  sharedClient = client;
  return client;
}

/** Tear down the shared client and server process. */
export async function teardown(): Promise<void> {
  if (sharedClient) {
    await sharedClient.close();
    sharedClient = undefined;
  }
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = undefined;
  }
}
