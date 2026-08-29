import { DEFAULT_HTTP_URL, METHODS, POSTMESSAGE_CHANNEL, PROTOCOL_VERSION } from "../constants.js";
import { NotificationBus } from "../notifications.js";
import type { ClientTransport } from "../transport.js";
import { makeNotification, makeRequest, parseMessage, isJsonRpcFailure, isJsonRpcNotification, isJsonRpcSuccess } from "../rpc.js";

export class HttpTransport implements ClientTransport {
  readonly kind = "http" as const;
  readonly description: string;
  private readonly rpcUrl: string;
  private readonly eventsUrl: string;
  private source: EventSource | null = null;
  private nextId = 1;
  private readonly bus = new NotificationBus();

  constructor(baseUrl = DEFAULT_HTTP_URL) {
    this.rpcUrl = `${baseUrl.replace(/\/$/, "")}/rpc`;
    this.eventsUrl = `${baseUrl.replace(/\/$/, "")}/events`;
    this.description = `HTTP JSON-RPC fallback at ${this.rpcUrl}`;
  }

  async connect(): Promise<void> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        makeRequest(this.nextId++, METHODS.hello, { protocolVersion: PROTOCOL_VERSION }),
      ),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${this.rpcUrl}`);
    if (typeof EventSource !== "undefined") {
      this.source = new EventSource(this.eventsUrl);
      this.source.addEventListener("rpc", (event) => {
        try {
          const msg = parseMessage((event as MessageEvent).data);
          if (isJsonRpcNotification(msg)) this.bus.emit(msg.method, msg.params);
        } catch {
          /* ignore malformed SSE */
        }
      });
    }
  }

  close(): void {
    this.source?.close();
    this.source = null;
  }

  async request(method: string, params?: unknown, timeoutMs = 30_000): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(this.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(makeRequest(this.nextId++, method, params)),
        signal: controller.signal,
      });
      const raw = await res.text();
      const msg = parseMessage(raw);
      if (isJsonRpcFailure(msg)) throw new Error(msg.error.message);
      if (isJsonRpcSuccess(msg)) return msg.result;
      throw new Error("Unexpected HTTP RPC response");
    } finally {
      clearTimeout(timer);
    }
  }

  notify(method: string, params?: unknown): void {
    void fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(makeNotification(method, params)),
    });
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    return this.bus.subscribe(handler);
  }
}

export class PostMessageTransport implements ClientTransport {
  readonly kind = "postmessage" as const;
  readonly description = "Browser extension postMessage bridge";
  private nextId = 1;
  private readonly pending = new Map<
    string | number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();
  private readonly bus = new NotificationBus();
  private listening = false;

  private readonly onMessage = (event: MessageEvent) => {
    const data = event.data as { channel?: string; jsonrpc?: string } | undefined;
    if (!data || data.channel !== POSTMESSAGE_CHANNEL) return;
    try {
      const { channel: _channel, ...rest } = data as Record<string, unknown>;
      const msg = parseMessage(JSON.stringify(rest));
      if (isJsonRpcSuccess(msg)) {
        this.pending.get(msg.id)?.resolve(msg.result);
        this.pending.delete(msg.id);
      } else if (isJsonRpcFailure(msg) && msg.id !== null) {
        this.pending.get(msg.id)?.reject(new Error(msg.error.message));
        this.pending.delete(msg.id);
      } else if (isJsonRpcNotification(msg)) {
        this.bus.emit(msg.method, msg.params);
      }
    } catch {
      /* ignore */
    }
  };

  connect(): Promise<void> {
    if (typeof window === "undefined") return Promise.reject(new Error("No window"));
    if (!this.listening) {
      window.addEventListener("message", this.onMessage);
      this.listening = true;
    }
    return this.request(METHODS.ping, {}, 1500).then(() => undefined);
  }

  close(): void {
    if (this.listening) window.removeEventListener("message", this.onMessage);
    this.listening = false;
    for (const [, p] of this.pending) p.reject(new Error("Transport closed"));
    this.pending.clear();
  }

  request(method: string, params?: unknown, timeoutMs = 2000): Promise<unknown> {
    const id = this.nextId++;
    const payload = { channel: POSTMESSAGE_CHANNEL, ...makeRequest(id, method, params) };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("No FormSync browser extension responded"));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      window.postMessage(payload, "*");
    });
  }

  notify(method: string, params?: unknown): void {
    window.postMessage({ channel: POSTMESSAGE_CHANNEL, ...makeNotification(method, params) }, "*");
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    return this.bus.subscribe(handler);
  }
}
