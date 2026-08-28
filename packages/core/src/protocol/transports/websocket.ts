import { JsonRpcPeer } from "../rpc.js";
import { NotificationBus } from "../notifications.js";
import type { ClientTransport } from "../transport.js";
import { DEFAULT_WS_URL } from "../constants.js";

export class WebSocketTransport implements ClientTransport {
  readonly kind = "websocket" as const;
  readonly description: string;
  private ws: WebSocket | null = null;
  private peer: JsonRpcPeer | null = null;
  private readonly url: string;
  private readonly bus = new NotificationBus();

  constructor(url = DEFAULT_WS_URL) {
    this.url = url;
    this.description = `Local FormSync MCP bridge at ${url}`;
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;
      const peer = new JsonRpcPeer((payload) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
      });
      peer.setNotificationHandler((method, params) => this.bus.emit(method, params));
      this.peer = peer;
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error(`Timed out connecting to ${this.url}`));
      }, 2000);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("message", (event) => {
        const data = typeof event.data === "string" ? event.data : String(event.data);
        void peer.receive(data);
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error(`WebSocket error connecting to ${this.url}`));
      });
      ws.addEventListener("close", () => {
        peer.rejectAll(new Error("WebSocket closed"));
      });
    });
  }

  close(): void {
    this.peer?.rejectAll(new Error("Transport closed"));
    this.ws?.close();
    this.ws = null;
    this.peer = null;
  }

  request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown> {
    if (!this.peer) return Promise.reject(new Error("WebSocket not connected"));
    return this.peer.request(method, params, timeoutMs);
  }

  notify(method: string, params?: unknown): void {
    this.peer?.notify(method, params);
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    return this.bus.subscribe(handler);
  }
}
