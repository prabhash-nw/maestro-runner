/**
 * Android API smoke test sequence.
 *
 * Mirrors the Python e2e flow coverage:
 * status -> device-info -> launch -> assert/tap/input -> screenshot/source -> back.
 */

import { afterAll, describe, expect, it } from "@jest/globals";

import { StepError } from "../src/exceptions";
import { getClient, runWithFailureDiagnostics, teardown } from "./setup";

afterAll(async () => {
  await teardown();
});

describe("AndroidE2ESmoke", () => {
  it("runs end-to-end API smoke sequence", async () => {
    const client = await getClient();

    await runWithFailureDiagnostics("AndroidE2ESmoke_runs_end-to-end_API_smoke_sequence", async () => {
      const statusResp = await fetch(`${client.baseUrl}/status`);
      expect(statusResp.ok).toBe(true);
      await expect(statusResp.json()).resolves.toEqual(expect.objectContaining({ status: "ok" }));

      const info = await client.deviceInfo();
      expect(info.platform).toBe("android");
      expect(info.screenWidth).toBeGreaterThan(0);
      expect(info.screenHeight).toBeGreaterThan(0);

      await client.launchApp("com.android.settings", { clearState: false });
      await client.assertVisible({ text: "Settings", timeoutMs: 10_000 });

      try {
        await client.tap({ id: "com.android.settings:id/search_action_bar_title" });
      } catch (error) {
        if (!(error instanceof StepError)) {
          throw error;
        }
        await client.tap({ text: "Search settings" });
      }

      // Android Settings variants use different search input IDs; sometimes it is already focused.
      try {
        await client.tap({ id: "com.android.settings:id/search_src_text" });
      } catch (error) {
        if (!(error instanceof StepError)) {
          throw error;
        }
        try {
          await client.tap({ id: "com.google.android.settings.intelligence:id/open_search_view_edit_text" });
        } catch (fallbackError) {
          if (!(fallbackError instanceof StepError)) {
            throw fallbackError;
          }
          // Field is likely already focused after tapping "Search settings".
        }
      }
      await client.inputText("Display");
      await client.assertVisible({ text: "Display", timeoutMs: 10_000 });

      const screenshot = await client.screenshot();
      expect(screenshot.byteLength).toBeGreaterThan(0);

      const hierarchy = await client.viewHierarchy();
      expect(hierarchy.length).toBeGreaterThan(100);

      await client.back();
    }, client);
  });
});
