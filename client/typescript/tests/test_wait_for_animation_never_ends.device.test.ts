/**
 * Test that waitForAnimationToEnd times out when the animation never stops.
 *
 * The target URL hosts a page with a constantly spinning CSS/JS loading
 * spinner. Because the animation never ceases, the driver cannot reach a
 * "two consecutive identical screenshots" steady state, so
 * waitForAnimationToEnd must time out and return success=false.
 *
 * Configuration:
 *   sleepMs=500     — half a second between comparison screenshots; a CSS
 *                     spinner running at ~60 fps will have rotated noticeably.
 *   threshold=0.0003 — only 0.03% pixel diff allowed; below the observed iOS
 *                      diffs of 0.000413–0.000674 and Android diffs of
 *                      0.000741–0.000867, so any rotation is reliably detected.
 *
 * Prerequisites:
 *   1. Android emulator OR iOS simulator running
 *   2. Node deps installed (from client/typescript): npm install
 *   3. (Optional) Start maestro-runner server manually:
 *        ./maestro-runner --platform android server --port 9999
 *        ./maestro-runner --platform ios --device <UDID> server --port 9999
 *      If not running, the server is auto-started by the test setup.
 *
 * Override via env vars:
 *   MAESTRO_SERVER_URL   (default: http://localhost:9999)
 *   MAESTRO_PLATFORM     (default: android)
 *   MAESTRO_DEVICE_ID    (recommended for explicit iOS simulator targeting)
 *
 * Run (Android):
 *   cd client/typescript && npx jest tests/test_wait_for_animation_never_ends.device.test.ts --runInBand
 *
 * Run (iOS):
 *   cd client/typescript && MAESTRO_PLATFORM=ios MAESTRO_DEVICE_ID=<UDID> \
 *     npx jest tests/test_wait_for_animation_never_ends.device.test.ts --runInBand
 */

import { afterAll, describe, expect, it } from "@jest/globals";

import { getClient, teardown } from "./setup";

// Page with a perpetually spinning loading indicator — animation never settles
const SPINNER_URL = "https://discuss.wxpython.org/t/loading-spinner-animation/35657";

// Pause between the two consecutive screenshots (ms) — must be long enough for
// the spinner to advance at least one visible frame
const SLEEP_MS = 500;

// Maximum pixel-diff fraction still considered "static".
// The Discourse spinner produces ~0.000413–0.000674 diff on iOS and
// ~0.000741–0.000867 on Android after 500 ms; we set the bar at 0.0003
// (well below that) so any rotation is detected as animated.
const THRESHOLD = 0.0003;

afterAll(async () => {
  await teardown();
});

describe("WaitForAnimationToEnd", () => {
  it(
    "should time out on an infinite spinning animation",
    async () => {
      const client = await getClient();

      const openResult = await client.openLink(SPINNER_URL);
      expect(openResult.success).toBe(true);

      // Give the browser time to load the page and start rendering the spinner
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      // Swipe up a bit to ensure the spinner is in view
      const swipeResult = await client.swipe("up", 400);
      expect(swipeResult.success).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 1_000));

      await expect(
        client.waitForAnimationToEnd(SLEEP_MS, THRESHOLD, "wait_for_animation_on_infinite_spinner"),
      ).rejects.toThrow("Timed out");
    },
    // The server default timeout is 15 s; allow 30 s for page load + swipe + animation check
    60_000,
  );
});
