import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { MaestroClient } from "../src/client";
import { MaestroError, SessionError, StepError } from "../src/exceptions";
import { ElementSelector } from "../src/models";

const BASE = "http://localhost:9999";
const SID = "test-session-123";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(status: number, text: string): Response {
  return new Response(text, { status });
}

function stepBody(fetchMock: jest.MockedFunction<typeof fetch>, callIndex = 1): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[callIndex][1]?.body as string) as Record<string, unknown>;
}

describe("MaestroClient (unit)", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("creates a session", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    expect(client.getSessionId()).toBe(SID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${BASE}/session`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ platformName: "android" });
  });

  it("raises SessionError when createSession fails", async () => {
    fetchMock.mockResolvedValueOnce(textResponse(500, "Internal error"));

    const client = new MaestroClient(BASE);
    await expect(client.createSession({ platformName: "android" })).rejects.toBeInstanceOf(
      SessionError,
    );
  });

  it("close is no-op without session", async () => {
    const client = new MaestroClient(BASE);
    await client.close();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("close deletes active session", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(200, ""));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.close();

    expect(client.getSessionId()).toBeUndefined();
    expect(String(fetchMock.mock.calls[1][0])).toBe(`${BASE}/session/${SID}`);
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
  });

  it("requires an active session for executeStep", async () => {
    const client = new MaestroClient(BASE);
    await expect(client.executeStep({ type: "back" })).rejects.toBeInstanceOf(SessionError);
  });

  it("raises MaestroError on executeStep http error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(500, "server error"));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.executeStep({ type: "back" })).rejects.toBeInstanceOf(MaestroError);
  });

  it("tap by text uses compact selector", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.tap({ text: "Login" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("tapOn");
    expect(body.selector).toBe("Login");
  });

  it("tap with selector object serializes selector fields", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.tap({ selector: new ElementSelector({ text: "Item", childOf: { id: "list" } }) });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.selector).toEqual({ text: "Item", childOf: { id: "list" } });
  });

  it("tap by id serializes selector object", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.tap({ id: "btn_login" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("tapOn");
    expect(body.selector).toEqual({ id: "btn_login" });
  });

  it("longPress sets longPress flag", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.longPress({ text: "Hold" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("tapOn");
    expect(body.longPress).toBe(true);
    expect(body.selector).toBe("Hold");
  });

  it("tapOnPoint sends point payload", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.tapOnPoint("50%,50%");

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("tapOnPoint");
    expect(body.point).toBe("50%,50%");
  });

  it("tapOnPoint supports longPress", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.tapOnPoint("100,200", { longPress: true });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("tapOnPoint");
    expect(body.point).toBe("100,200");
    expect(body.longPress).toBe(true);
  });

  it("assertVisible supports textPattern as textRegex", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.assertVisible({ textPattern: ".*Alice.*Tester.*" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("assertVisible");
    expect(body.selector).toEqual({ textRegex: ".*Alice.*Tester.*" });
  });

  it("assertVisible forwards timeoutMs", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.assertVisible({ text: "Loading", timeoutMs: 5000 });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("assertVisible");
    expect(body.timeout).toBe(5000);
  });

  it("assertNotVisible by text uses compact selector", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.assertNotVisible({ text: "Error" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("assertNotVisible");
    expect(body.selector).toBe("Error");
  });

  it("assertNotVisible supports textPattern as textRegex", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.assertNotVisible({ textPattern: ".*Error.*" });

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("assertNotVisible");
    expect(body.selector).toEqual({ textRegex: ".*Error.*" });
  });

  it("raises StepError on non-optional step failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false, message: "not found" }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.tap({ text: "Missing" })).rejects.toBeInstanceOf(StepError);
  });

  it("does not raise StepError for optional failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false, message: "not found" }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    const result = await client.tap({ text: "Maybe", optional: true });

    expect(result.success).toBe(false);
  });

  it("elementExists returns true or false based on optional assert", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.elementExists({ text: "Visible" })).resolves.toBe(true);
    await expect(client.elementExists({ text: "Missing" })).resolves.toBe(false);
  });

  it("elementExists supports textPattern as textRegex", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.elementExists({ textPattern: ".*Alice.*" })).resolves.toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("assertVisible");
    expect(body.optional).toBe(true);
    expect(body.selector).toEqual({ textRegex: ".*Alice.*" });
  });

  it("tapFirstMatch returns on first successful selector", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, message: "ok" }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    const result = await client.tapFirstMatch([
      { selector: { text: "missing" } },
      { selector: { text: "present" } },
    ]);

    expect(result.success).toBe(true);
  });

  it("tapFirstMatch fails when selectors are empty", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.tapFirstMatch([])).rejects.toBeInstanceOf(StepError);
  });

  it("tapFirstMatch raises when none of selectors match", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false, message: "miss" }))
      .mockResolvedValueOnce(jsonResponse(200, { success: false, message: "miss" }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(
      client.tapFirstMatch([{ selector: "A" }, { selector: "B" }], "test"),
    ).rejects.toBeInstanceOf(StepError);
  });

  it.each([
    {
      name: "launchApp serializes app and options",
      invoke: (client: MaestroClient) => client.launchApp("com.example.app", { clearState: true }),
      expected: { type: "launchApp", appId: "com.example.app", clearState: true },
    },
    {
      name: "stopApp serializes app id",
      invoke: (client: MaestroClient) => client.stopApp("com.example.app"),
      expected: { type: "stopApp", appId: "com.example.app" },
    },
    {
      name: "clearState serializes app id",
      invoke: (client: MaestroClient) => client.clearState("com.example.app"),
      expected: { type: "clearState", appId: "com.example.app" },
    },
    {
      name: "openLink serializes link",
      invoke: (client: MaestroClient) => client.openLink("https://example.com"),
      expected: { type: "openLink", link: "https://example.com" },
    },
    {
      name: "inputText serializes text",
      invoke: (client: MaestroClient) => client.inputText("hello@example.com"),
      expected: { type: "inputText", text: "hello@example.com" },
    },
    {
      name: "eraseText serializes characters",
      invoke: (client: MaestroClient) => client.eraseText(10),
      expected: { type: "eraseText", charactersToErase: 10 },
    },
    {
      name: "eraseText without count uses default payload",
      invoke: (client: MaestroClient) => client.eraseText(),
      expected: { type: "eraseText" },
    },
    {
      name: "pressKey serializes key",
      invoke: (client: MaestroClient) => client.pressKey("ENTER"),
      expected: { type: "pressKey", key: "ENTER" },
    },
    {
      name: "back serializes back step",
      invoke: (client: MaestroClient) => client.back(),
      expected: { type: "back" },
    },
    {
      name: "scroll serializes scroll step",
      invoke: (client: MaestroClient) => client.scroll(),
      expected: { type: "scroll" },
    },
  ])("$name", async ({ invoke, expected }) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await invoke(client);

    expect(stepBody(fetchMock)).toEqual(expect.objectContaining(expected));
  });

  it.each([
    {
      name: "swipe uppercases direction and forwards duration",
      invoke: (client: MaestroClient) => client.swipe("left", 600),
      expected: { type: "swipe", direction: "LEFT", duration: 600 },
    },
    {
      name: "swipe uses default duration",
      invoke: (client: MaestroClient) => client.swipe("up"),
      expected: { type: "swipe", duration: 400 },
    },
    {
      name: "swipeOn with text serializes selector",
      invoke: (client: MaestroClient) => client.swipeOn({ text: "List", direction: "DOWN" }),
      expected: { type: "swipe", selector: { text: "List" }, direction: "DOWN" },
    },
    {
      name: "swipeOn with id serializes selector",
      invoke: (client: MaestroClient) => client.swipeOn({ id: "scroll_view", direction: "UP" }),
      expected: { type: "swipe", selector: { id: "scroll_view" }, direction: "UP" },
    },
  ])("$name", async ({ invoke, expected }) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await invoke(client);

    expect(stepBody(fetchMock)).toEqual(expect.objectContaining(expected));
  });

  it("fetches device info", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          platform: "android",
          osVersion: "14",
          deviceName: "Pixel 6",
        }),
      );

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    const info = await client.deviceInfo();

    expect(info.platform).toBe("android");
    expect(info.osVersion).toBe("14");
    expect(info.deviceName).toBe("Pixel 6");
  });

  it("raises MaestroError on deviceInfo error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(500, "fail"));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.deviceInfo()).rejects.toBeInstanceOf(MaestroError);
  });

  it("fetches screenshot bytes", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    const bytes = await client.screenshot();

    expect(bytes.byteLength).toBe(3);
  });

  it("raises MaestroError on screenshot error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(500, "fail"));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.screenshot()).rejects.toBeInstanceOf(MaestroError);
  });

  it("fetches view hierarchy", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(200, "<hierarchy />"));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    const source = await client.viewHierarchy();

    expect(source).toContain("hierarchy");
  });

  it("raises MaestroError on viewHierarchy error", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(textResponse(500, "fail"));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });

    await expect(client.viewHierarchy()).rejects.toBeInstanceOf(MaestroError);
  });

  it("waitForAnimationToEnd sends correct step type", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.waitForAnimationToEnd();

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("waitForAnimationToEnd");
    expect(body.sleepMs).toBeUndefined();
    expect(body.threshold).toBeUndefined();
  });

  it("waitForAnimationToEnd forwards sleepMs and threshold", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { sessionId: SID }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true }));

    const client = new MaestroClient(BASE);
    await client.createSession({ platformName: "android" });
    await client.waitForAnimationToEnd(500, 0.001);

    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.type).toBe("waitForAnimationToEnd");
    expect(body.sleepMs).toBe(500);
    expect(body.threshold).toBe(0.001);
  });
});
