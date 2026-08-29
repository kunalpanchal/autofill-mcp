import type { TransportKind } from "../types.js";

export interface ClientTransport {
  readonly kind: TransportKind;
  readonly description: string;
  connect(): Promise<void>;
  close(): void;
  request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  onNotification(handler: (method: string, params: unknown) => void): () => void;
}

export function isTransportAvailable(kind: TransportKind): boolean {
  if (typeof window === "undefined") return false;
  if (kind === "webmcp") return Boolean(getModelContext());
  if (kind === "websocket") return typeof WebSocket !== "undefined";
  if (kind === "postmessage") return typeof window.postMessage === "function";
  if (kind === "http") return typeof fetch === "function";
  if (kind === "mock") return true;
  return false;
}

export interface ModelContextSurface {
  registerTool?: (
    tool: {
      name: string;
      description?: string;
      inputSchema?: unknown;
      execute: (args: Record<string, unknown>, extra?: { signal?: AbortSignal }) => unknown;
    },
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ) => Promise<void> | void;
  requestFill?: (params: unknown) => Promise<unknown>;
  prompt?: (message: string) => Promise<unknown>;
}

export function getModelContext(): ModelContextSurface | undefined {
  if (typeof document !== "undefined") {
    const doc = document as Document & { modelContext?: ModelContextSurface };
    if (doc.modelContext) return doc.modelContext;
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator as Navigator & { modelContext?: ModelContextSurface };
    if (nav.modelContext) return nav.modelContext;
  }
  return undefined;
}
