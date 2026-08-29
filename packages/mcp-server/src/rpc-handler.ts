import {
  JSONRPC_ERRORS,
  METHODS,
  PROTOCOL_VERSION,
  isJsonRpcNotification,
  isJsonRpcRequest,
  makeFailure,
  makeNotification,
  makeSuccess,
  parseMessage,
  type FillContext,
  type FilePayload,
  type JsonSchema,
  type JsonValue,
  type PageInfo,
  type ValidationIssue,
} from "@kunalpanchal/formsync-core";
import type { SessionStore } from "./session-store.js";
import { encodeLocalFile, mockFillFromContext, readProjectContext } from "./context-reader.js";

export interface BridgeOptions {
  store: SessionStore;
  mockAgent: boolean;
  rootDir: string;
  onPending?: (requestId: string) => void;
}

export function createRpcHandler(options: BridgeOptions) {
  const { store, mockAgent, rootDir } = options;

  return async function handleRaw(raw: string, send: (payload: string) => void): Promise<void> {
    let msg;
    try {
      msg = parseMessage(raw);
    } catch (err) {
      send(JSON.stringify(makeFailure(null, JSONRPC_ERRORS.parse, err instanceof Error ? err.message : "Parse error")));
      return;
    }

    if (isJsonRpcNotification(msg)) {
      if (msg.method === METHODS.cancel) {
        const params = msg.params as { requestId?: string } | undefined;
        if (params?.requestId) store.cancel(params.requestId);
      }
      return;
    }

    if (!isJsonRpcRequest(msg)) return;

    try {
      const result = await dispatch(msg.method, msg.params, send);
      send(JSON.stringify(makeSuccess(msg.id, result)));
    } catch (err) {
      const code =
        err && typeof err === "object" && "rpcCode" in err
          ? (err as { rpcCode: number }).rpcCode
          : JSONRPC_ERRORS.internal;
      send(
        JSON.stringify(
          makeFailure(msg.id, code, err instanceof Error ? err.message : "Internal error"),
        ),
      );
    }
  };

  async function dispatch(method: string, params: unknown, send: (payload: string) => void): Promise<unknown> {
    switch (method) {
      case METHODS.hello:
        return { protocolVersion: PROTOCOL_VERSION, capabilities: ["fill", mockAgent ? "mock" : "mcp"] };
      case METHODS.ping:
        return { ok: true, pending: store.listActive().length };
      case METHODS.requestFill:
        return await queueFill(params, send);
      case METHODS.cancel: {
        const { requestId } = params as { requestId: string };
        store.cancel(requestId);
        return { cancelled: true };
      }
      case METHODS.validationError:
        return await retryFill(params, send);
      case METHODS.poll: {
        const { requestId } = params as { requestId: string };
        const session = store.get(requestId);
        if (!session) throw Object.assign(new Error("Unknown session"), { rpcCode: JSONRPC_ERRORS.sessionNotFound });
        return { status: session.status, values: session.values, files: session.files, error: session.error };
      }
      default:
        throw Object.assign(new Error(`Method not found: ${method}`), { rpcCode: JSONRPC_ERRORS.methodNotFound });
    }
  }

  async function queueFill(params: unknown, send: (payload: string) => void): Promise<unknown> {
    const p = params as {
      requestId: string;
      schema: JsonSchema;
      context?: FillContext;
      page?: PageInfo;
    };
    if (!p?.requestId || !p.schema) {
      throw Object.assign(new Error("requestId and schema are required"), { rpcCode: JSONRPC_ERRORS.invalidParams });
    }
    store.put({
      requestId: p.requestId,
      schema: p.schema,
      context: p.context,
      page: p.page,
      origin: p.page?.origin,
      createdAt: Date.now(),
      status: "queued",
      send,
    });
    send(JSON.stringify(makeNotification(METHODS.progress, { requestId: p.requestId, stage: "queued", message: "Waiting for local AI assistant" })));
    options.onPending?.(p.requestId);

    if (mockAgent) {
      const values = await runMock(p.schema);
      return complete(p.requestId, values);
    }
    return { status: "queued", requestId: p.requestId };
  }

  async function retryFill(params: unknown, send: (payload: string) => void): Promise<unknown> {
    const p = params as {
      requestId: string;
      schema: JsonSchema;
      errors: ValidationIssue[];
      previousValues?: Record<string, JsonValue>;
    };
    const session = store.require(p.requestId);
    session.status = "queued";
    session.send = send;
    options.onPending?.(p.requestId);
    if (mockAgent) {
      const values = await runMock(p.schema);
      // mock retry: trim strings that exceeded maxLength
      for (const err of p.errors ?? []) {
        if (err.keyword === "maxLength" && err.path && typeof values[err.path] === "string") {
          const max = session.schema.properties?.[err.path]?.maxLength;
          if (max) values[err.path] = (values[err.path] as string).slice(0, max);
        }
      }
      return complete(p.requestId, values);
    }
    return { status: "queued", requestId: p.requestId };
  }

  async function runMock(schema: JsonSchema): Promise<Record<string, JsonValue>> {
    const ctx = await readProjectContext(rootDir);
    return mockFillFromContext(schema, ctx) as Record<string, JsonValue>;
  }

  function complete(requestId: string, values: Record<string, JsonValue>, files?: FilePayload[]): unknown {
    const session = store.complete(requestId, values, files);
    session.send(
      JSON.stringify(
        makeNotification(METHODS.fillResult, { requestId, values, files, meta: { model: mockAgent ? "mock-agent" : "mcp" } }),
      ),
    );
    return { status: "completed", values, files };
  }
}

export async function submitSessionValues(
  store: SessionStore,
  requestId: string,
  values: Record<string, JsonValue>,
  files?: Array<{ field: string; filename?: string; mimeType?: string; dataUrl?: string; path?: string }>,
  rootDir?: string,
): Promise<void> {
  const encoded: FilePayload[] = [];
  for (const file of files ?? []) {
    if (file.path) {
      const packed = await encodeLocalFile(file.path, rootDir);
      encoded.push({ field: file.field, ...packed });
    } else if (file.dataUrl) {
      encoded.push({
        field: file.field,
        filename: file.filename || file.field,
        mimeType: file.mimeType || "application/octet-stream",
        dataUrl: file.dataUrl,
      });
    }
  }
  const session = store.complete(requestId, values, encoded);
  session.send(
    JSON.stringify(
      makeNotification(METHODS.fillResult, {
        requestId,
        values,
        files: encoded,
        meta: { model: "mcp-tool" },
      }),
    ),
  );
}
