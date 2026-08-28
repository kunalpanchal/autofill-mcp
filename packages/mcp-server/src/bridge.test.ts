import { afterEach, describe, expect, it } from "vitest";
import { METHODS, makeRequest, parseMessage, isJsonRpcNotification, isJsonRpcSuccess } from "@formsync/core";
import { startBridge, type FormSyncBridge } from "./bridge.js";
import { SessionStore } from "./session-store.js";
import { mockFillFromContext } from "./context-reader.js";
import { submitSessionValues } from "./rpc-handler.js";
import { parseArgs } from "./index.js";

describe("parseArgs", () => {
  it("defaults to localhost:3737", () => {
    const opts = parseArgs([]);
    expect(opts.port).toBe(3737);
    expect(opts.host).toBe("127.0.0.1");
  });

  it("parses mock agent and port", () => {
    const opts = parseArgs(["--port", "4000", "--mock-agent", "--serve"]);
    expect(opts.port).toBe(4000);
    expect(opts.mockAgent).toBe(true);
    expect(opts.stdio).toBe(false);
  });
});

describe("mockFillFromContext", () => {
  it("derives listing fields from package.json", () => {
    const values = mockFillFromContext(
      {
        properties: {
          projectName: { type: "string" },
          tagline: { type: "string", maxLength: 40, description: "Short headline" },
          repoUrl: { type: "string", format: "uri", description: "GitHub repo" },
          techStack: { type: "array" },
        },
      },
      {
        "package.json": JSON.stringify({
          name: "formsync",
          description: "Fill web forms with a local AI assistant over MCP",
          repository: { url: "git+https://github.com/example/formsync.git" },
          keywords: ["mcp", "forms"],
        }),
      },
    );
    expect(values.projectName).toBe("formsync");
    expect(String(values.tagline).length).toBeLessThanOrEqual(40);
    expect(String(values.repoUrl)).toMatch(/^https:\/\//);
    expect(values.techStack).toEqual(["mcp", "forms"]);
  });
});

describe("bridge protocol", () => {
  let bridge: FormSyncBridge | undefined;

  afterEach(async () => {
    await bridge?.close();
    bridge = undefined;
  });

  it("completes a fill over WebSocket with --mock-agent", async () => {
    bridge = await startBridge({ port: 0, mockAgent: true, rootDir: process.cwd() });
    const url = `ws://127.0.0.1:${bridge.port}`;
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", () => reject(new Error("ws error")));
    });

    const hello = await rpc(ws, METHODS.hello, {});
    expect(hello).toMatchObject({ protocolVersion: "1.0.0" });

    const notifications: unknown[] = [];
    ws.addEventListener("message", (event) => {
      const msg = parseMessage(String(event.data));
      if (isJsonRpcNotification(msg) && msg.method === METHODS.fillResult) {
        notifications.push(msg.params);
      }
    });

    const result = (await rpc(ws, METHODS.requestFill, {
      requestId: "req-1",
      schema: {
        title: "Demo",
        type: "object",
        properties: {
          projectName: { type: "string" },
          tagline: { type: "string", maxLength: 80, description: "headline" },
        },
        required: ["projectName"],
      },
      context: { hint: "Product Hunt listing" },
    })) as { status: string; values: Record<string, string> };

    expect(result.status).toBe("completed");
    expect(result.values.projectName).toBeTruthy();
    ws.close();
  });

  it("queues a fill without mock agent and completes via submitSessionValues", async () => {
    const store = new SessionStore();
    bridge = await startBridge({ port: 0, mockAgent: false, store });
    const ws = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
    await new Promise<void>((resolve) => ws.addEventListener("open", () => resolve()));
    const queued = (await rpc(ws, METHODS.requestFill, {
      requestId: "req-2",
      schema: { type: "object", properties: { name: { type: "string" } } },
    })) as { status: string };
    expect(queued.status).toBe("queued");
    expect(store.listActive()).toHaveLength(1);

    await submitSessionValues(store, "req-2", { name: "Ada" });
    expect(store.get("req-2")?.status).toBe("completed");
    ws.close();
  });
});

function rpc(ws: WebSocket, method: string, params: unknown): Promise<unknown> {
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const msg = parseMessage(String(event.data));
      if (isJsonRpcSuccess(msg) && msg.id === id) {
        ws.removeEventListener("message", onMessage);
        resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify(makeRequest(id, method, params)));
    setTimeout(() => reject(new Error(`timeout ${method}`)), 5000);
  });
}
