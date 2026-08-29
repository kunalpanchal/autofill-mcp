import { JSONRPC_VERSION, JSONRPC_ERRORS } from "./constants.js";

export interface JsonRpcRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccess {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  result: unknown;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number | null;
  error: JsonRpcErrorObject;
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcFailure;

export function isJsonRpcFailure(msg: JsonRpcMessage): msg is JsonRpcFailure {
  return "error" in msg;
}

export function isJsonRpcSuccess(msg: JsonRpcMessage): msg is JsonRpcSuccess {
  return "result" in msg;
}

export function isJsonRpcRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return "method" in msg && "id" in msg && !("result" in msg) && !("error" in msg);
}

export function isJsonRpcNotification(msg: JsonRpcMessage): msg is JsonRpcNotification {
  return "method" in msg && !("id" in msg) && !("result" in msg) && !("error" in msg);
}

export function makeRequest(
  id: string | number,
  method: string,
  params?: unknown,
): JsonRpcRequest {
  const req: JsonRpcRequest = { jsonrpc: JSONRPC_VERSION, id, method };
  if (params !== undefined) req.params = params;
  return req;
}

export function makeNotification(method: string, params?: unknown): JsonRpcNotification {
  const n: JsonRpcNotification = { jsonrpc: JSONRPC_VERSION, method };
  if (params !== undefined) n.params = params;
  return n;
}

export function makeSuccess(id: string | number, result: unknown): JsonRpcSuccess {
  return { jsonrpc: JSONRPC_VERSION, id, result };
}

export function makeFailure(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcFailure {
  const error: JsonRpcErrorObject = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: JSONRPC_VERSION, id, error };
}

export function parseMessage(raw: string): JsonRpcMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Parse error"), { rpcCode: JSONRPC_ERRORS.parse });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw Object.assign(new Error("Invalid Request"), {
      rpcCode: JSONRPC_ERRORS.invalidRequest,
    });
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.jsonrpc !== JSONRPC_VERSION) {
    throw Object.assign(new Error("Invalid Request: jsonrpc must be \"2.0\""), {
      rpcCode: JSONRPC_ERRORS.invalidRequest,
    });
  }
  return parsed as JsonRpcMessage;
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

export type RpcHandler = (method: string, params: unknown, id?: string | number) => Promise<unknown> | unknown;

/**
 * Bidirectional JSON-RPC 2.0 peer used by both the browser client and the local bridge.
 */
export class JsonRpcPeer {
  private nextId = 1;
  private readonly pending = new Map<string | number, Pending>();
  private readonly sendRaw: (payload: string) => void;
  private onNotification: ((method: string, params: unknown) => void) | undefined;
  private requestHandler: RpcHandler | undefined;

  constructor(sendRaw: (payload: string) => void) {
    this.sendRaw = sendRaw;
  }

  setNotificationHandler(handler: (method: string, params: unknown) => void): void {
    this.onNotification = handler;
  }

  setRequestHandler(handler: RpcHandler): void {
    this.requestHandler = handler;
  }

  request(method: string, params?: unknown, timeoutMs = 120_000): Promise<unknown> {
    const id = this.nextId++;
    const req = makeRequest(id, method, params);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`JSON-RPC timeout waiting for ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timer);
          reject(reason);
        },
      });
      this.sendRaw(JSON.stringify(req));
    });
  }

  notify(method: string, params?: unknown): void {
    this.sendRaw(JSON.stringify(makeNotification(method, params)));
  }

  async receive(raw: string): Promise<void> {
    let msg: JsonRpcMessage;
    try {
      msg = parseMessage(raw);
    } catch (err) {
      const code =
        err && typeof err === "object" && "rpcCode" in err
          ? (err as { rpcCode: number }).rpcCode
          : JSONRPC_ERRORS.parse;
      this.sendRaw(
        JSON.stringify(makeFailure(null, code, err instanceof Error ? err.message : "Parse error")),
      );
      return;
    }

    if (isJsonRpcSuccess(msg)) {
      this.pending.get(msg.id)?.resolve(msg.result);
      this.pending.delete(msg.id);
      return;
    }
    if (isJsonRpcFailure(msg) && msg.id !== null) {
      const err = new Error(msg.error.message);
      (err as Error & { rpcCode: number; data?: unknown }).rpcCode = msg.error.code;
      (err as Error & { data?: unknown }).data = msg.error.data;
      this.pending.get(msg.id)?.reject(err);
      this.pending.delete(msg.id);
      return;
    }
    if (isJsonRpcNotification(msg)) {
      this.onNotification?.(msg.method, msg.params);
      return;
    }
    if (isJsonRpcRequest(msg)) {
      if (!this.requestHandler) {
        this.sendRaw(
          JSON.stringify(
            makeFailure(msg.id, JSONRPC_ERRORS.methodNotFound, `Method not found: ${msg.method}`),
          ),
        );
        return;
      }
      try {
        const result = await this.requestHandler(msg.method, msg.params, msg.id);
        this.sendRaw(JSON.stringify(makeSuccess(msg.id, result ?? null)));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal error";
        const code =
          err && typeof err === "object" && "rpcCode" in err
            ? (err as { rpcCode: number }).rpcCode
            : JSONRPC_ERRORS.internal;
        this.sendRaw(JSON.stringify(makeFailure(msg.id, code, message)));
      }
    }
  }

  rejectAll(reason: unknown): void {
    for (const [, p] of this.pending) p.reject(reason);
    this.pending.clear();
  }
}
