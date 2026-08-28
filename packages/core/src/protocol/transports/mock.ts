import type { FillResultParams, JsonSchema, JsonValue } from "../../types.js";
import { METHODS, PROTOCOL_VERSION } from "../constants.js";
import { NotificationBus } from "../notifications.js";
import type { ClientTransport } from "../transport.js";

export type MockFiller = (schema: JsonSchema, context?: unknown) => Promise<Record<string, JsonValue>> | Record<string, JsonValue>;

const defaultFiller: MockFiller = (schema) => {
  const values: Record<string, JsonValue> = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
    if (type === "array") values[key] = ["TypeScript", "React"];
    else if (type === "boolean") values[key] = true;
    else if (type === "number" || type === "integer") values[key] = 1;
    else if (prop.format === "email") values[key] = "dev@example.com";
    else if (prop.format === "uri") values[key] = "https://github.com/example/formsync";
    else if (prop.enum?.length) values[key] = prop.enum[0] as JsonValue;
    else values[key] = `Sample ${prop.title || key}`;
    if (typeof values[key] === "string" && prop.maxLength) {
      values[key] = (values[key] as string).slice(0, prop.maxLength);
    }
  }
  return values;
};

/**
 * In-page simulator used by the demo app and unit tests. It speaks the same
 * JSON-RPC methods as the local MCP bridge so UI code stays transport-agnostic.
 */
export class MockTransport implements ClientTransport {
  readonly kind = "mock" as const;
  readonly description = "In-page mock AI (demo / tests)";
  private readonly filler: MockFiller;
  private readonly delayMs: number;
  private readonly bus = new NotificationBus();

  constructor(options: { filler?: MockFiller; delayMs?: number } = {}) {
    this.filler = options.filler ?? defaultFiller;
    this.delayMs = options.delayMs ?? 400;
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }

  close(): void {
    /* no-op */
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    if (method === METHODS.hello) {
      return { protocolVersion: PROTOCOL_VERSION, capabilities: ["mock"] };
    }
    if (method === METHODS.ping) return { ok: true };
    if (method === METHODS.requestFill) {
      const p = params as { requestId: string; schema: JsonSchema; context?: unknown };
      await new Promise((r) => setTimeout(r, this.delayMs));
      const values = await this.filler(p.schema, p.context);
      const result: FillResultParams = { requestId: p.requestId, values, meta: { model: "mock" } };
      this.bus.emit(METHODS.fillResult, result);
      return { status: "completed", values };
    }
    if (method === METHODS.validationError) {
      const p = params as { requestId: string; schema: JsonSchema; previousValues?: Record<string, JsonValue> };
      const values = await this.filler(p.schema, { retry: true, previous: p.previousValues });
      const result: FillResultParams = { requestId: p.requestId, values, meta: { model: "mock-retry" } };
      this.bus.emit(METHODS.fillResult, result);
      return { status: "completed", values };
    }
    if (method === METHODS.cancel) return { cancelled: true };
    return null;
  }

  notify(): void {
    /* no-op */
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    return this.bus.subscribe(handler);
  }
}
