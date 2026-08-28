import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { DEFAULT_WS_HOST, DEFAULT_WS_PORT, makeNotification, METHODS } from "@formsync/core";
import { SessionStore } from "./session-store.js";
import { createRpcHandler } from "./rpc-handler.js";

export interface ListenOptions {
  host?: string;
  port?: number;
  mockAgent?: boolean;
  rootDir?: string;
  onPending?: (requestId: string) => void;
  store?: SessionStore;
}

export interface FormSyncBridge {
  store: SessionStore;
  port: number;
  host: string;
  close(): Promise<void>;
}

export function startBridge(options: ListenOptions = {}): Promise<FormSyncBridge> {
  const host = options.host ?? DEFAULT_WS_HOST;
  const port = options.port ?? DEFAULT_WS_PORT;
  const store = options.store ?? new SessionStore();
  const handle = createRpcHandler({
    store,
    mockAgent: Boolean(options.mockAgent),
    rootDir: options.rootDir ?? process.cwd(),
    onPending: options.onPending,
  });

  const sseClients = new Set<ServerResponse>();

  const http = createServer(async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, pending: store.listActive().length });
      return;
    }
    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }
    if (req.method === "POST" && url.pathname === "/rpc") {
      const raw = await readBody(req);
      const chunks: string[] = [];
      await handle(raw, (payload) => {
        chunks.push(payload);
        for (const client of sseClients) {
          client.write(`event: rpc\ndata: ${payload}\n\n`);
        }
      });
      const reply = chunks.find((c) => {
        try {
          const parsed = JSON.parse(c) as { id?: unknown };
          return parsed.id !== undefined;
        } catch {
          return false;
        }
      }) ?? chunks[0] ?? JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "No response" } });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(reply);
      return;
    }
    json(res, 404, { error: "Not found" });
  });

  const wss = new WebSocketServer({ server: http });
  wss.on("connection", (socket: WebSocket) => {
    const send = (payload: string) => {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    };
    socket.on("message", (data) => {
      void handle(String(data), send);
    });
    socket.on("close", () => store.dropClient(send));
  });

  return new Promise((resolve, reject) => {
    http.listen(port, host, () => {
      const addr = http.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        store,
        port: actualPort,
        host,
        close: () =>
          new Promise((done, fail) => {
            wss.close();
            http.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
    http.on("error", reject);
  });
}

export function notifyProgress(store: SessionStore, requestId: string, message: string): void {
  const session = store.get(requestId);
  session?.send(JSON.stringify(makeNotification(METHODS.progress, { requestId, stage: "processing", message })));
}

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
