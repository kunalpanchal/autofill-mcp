import { describe, expect, it } from "vitest";
import { createTabMaps, forgetTab, rememberTab, tabForHostFrame } from "./route.js";

describe("extension tab routing", () => {
  it("delivers a JSON-RPC response only to the tab that sent the request", () => {
    const tabs = createTabMaps();
    rememberTab({ jsonrpc: "2.0", id: 7, method: "formsync/hello", params: {} }, 11, tabs);
    rememberTab({ jsonrpc: "2.0", id: 8, method: "formsync/hello", params: {} }, 22, tabs);
    expect(tabForHostFrame({ jsonrpc: "2.0", id: 7, result: { ok: true } }, tabs)).toBe(11);
    expect(tabForHostFrame({ jsonrpc: "2.0", id: 8, result: { ok: true } }, tabs)).toBe(22);
  });

  it("delivers fillResult notifications only to the requesting tab", () => {
    const tabs = createTabMaps();
    rememberTab(
      { jsonrpc: "2.0", id: 1, method: "formsync/requestFill", params: { requestId: "req-a" } },
      42,
      tabs,
    );
    expect(
      tabForHostFrame(
        { jsonrpc: "2.0", method: "formsync/fillResult", params: { requestId: "req-a", values: { email: "a@b.c" } } },
        tabs,
      ),
    ).toBe(42);
    expect(
      tabForHostFrame(
        { jsonrpc: "2.0", method: "formsync/fillResult", params: { requestId: "req-other", values: {} } },
        tabs,
      ),
    ).toBeUndefined();
  });

  it("does not fall back to broadcasting when the tab is unknown", () => {
    const tabs = createTabMaps();
    expect(tabForHostFrame({ jsonrpc: "2.0", method: "formsync/fillResult", params: { requestId: "x" } }, tabs)).toBeUndefined();
  });

  it("forgets routing entries when a tab closes", () => {
    const tabs = createTabMaps();
    rememberTab({ jsonrpc: "2.0", id: 1, method: "formsync/hello", params: { requestId: "req-a" } }, 42, tabs);
    forgetTab(42, tabs);
    expect(tabForHostFrame({ jsonrpc: "2.0", id: 1, result: { ok: true } }, tabs)).toBeUndefined();
    expect(
      tabForHostFrame(
        { jsonrpc: "2.0", method: "formsync/fillResult", params: { requestId: "req-a", values: {} } },
        tabs,
      ),
    ).toBeUndefined();
  });
});
