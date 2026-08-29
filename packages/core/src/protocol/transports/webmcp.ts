import type { FillResultParams, JsonSchema, JsonValue } from "../../types.js";
import { METHODS, PROTOCOL_VERSION } from "../constants.js";
import { NotificationBus } from "../notifications.js";
import { getModelContext, type ClientTransport } from "../transport.js";
import { makeSuccess } from "../rpc.js";

/**
 * WebMCP transport.
 *
 * Primary path: if the page-level `document.modelContext` (or the deprecated
 * `navigator.modelContext`) exposes a request/prompt API, we use it to send the
 * schema to the browser's built-in agent.
 *
 * Fallback: register `formsync_get_pending_form` and `formsync_submit_fill` tools
 * so a page agent can pull the schema and push values. The Fill with AI button
 * then waits until the agent calls `formsync_submit_fill`.
 */
export class WebMcpTransport implements ClientTransport {
  readonly kind = "webmcp" as const;
  readonly description = "Browser-native WebMCP (document.modelContext)";
  private pending: {
    requestId: string;
    schema: JsonSchema;
    context?: unknown;
    resolve: (value: FillResultParams) => void;
  } | null = null;
  private abort: AbortController | null = null;
  private readonly bus = new NotificationBus();

  async connect(): Promise<void> {
    const mc = getModelContext();
    if (!mc) throw new Error("WebMCP is not available in this browser");
    this.abort = new AbortController();
    if (typeof mc.registerTool === "function") {
      await mc.registerTool(
        {
          name: "formsync_get_pending_form",
          description:
            "Return the JSON Schema and context for the web form the user asked FormSync to fill. Call this before formsync_submit_fill.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          execute: async () => {
            if (!this.pending) {
              return {
                content: [{ type: "text", text: "No pending FormSync fill request." }],
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      requestId: this.pending.requestId,
                      schema: this.pending.schema,
                      context: this.pending.context,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          },
        },
        { signal: this.abort.signal },
      );
      await mc.registerTool(
        {
          name: "formsync_submit_fill",
          description:
            "Submit populated JSON values for the pending FormSync web form. Values are shown to the user for approval before they are written to the DOM.",
          inputSchema: {
            type: "object",
            properties: {
              requestId: { type: "string" },
              values: { type: "object", additionalProperties: true },
            },
            required: ["values"],
          },
          execute: async (args) => {
            if (!this.pending) return "No pending form.";
            const values = (args.values ?? {}) as Record<string, JsonValue>;
            const result: FillResultParams = {
              requestId: this.pending.requestId,
              values,
            };
            this.bus.emit(METHODS.fillResult, result);
            this.pending.resolve(result);
            this.pending = null;
            return "Values received. The user will review them before they are committed.";
          },
        },
        { signal: this.abort.signal },
      );
    }
  }

  close(): void {
    this.abort?.abort();
    this.abort = null;
    this.pending = null;
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const mc = getModelContext();
    if (!mc) throw new Error("WebMCP is not available");
    if (method === METHODS.hello) {
      return { protocolVersion: PROTOCOL_VERSION, capabilities: ["webmcp"] };
    }
    if (method === METHODS.requestFill) {
      const p = params as { requestId: string; schema: JsonSchema; context?: unknown };
      if (typeof mc.requestFill === "function") {
        const result = (await mc.requestFill(params)) as FillResultParams;
        this.bus.emit(METHODS.fillResult, result);
        return { status: "completed", values: result.values };
      }
      if (typeof mc.prompt === "function") {
        const raw = await mc.prompt(
          `Fill this web form. Return ONLY JSON matching the schema.\nSchema: ${JSON.stringify(p.schema)}\nContext: ${JSON.stringify(p.context ?? {})}`,
        );
        const values = typeof raw === "string" ? (JSON.parse(raw) as Record<string, JsonValue>) : (raw as Record<string, JsonValue>);
        const result: FillResultParams = { requestId: p.requestId, values };
        this.bus.emit(METHODS.fillResult, result);
        return { status: "completed", values };
      }
      return await new Promise((resolve) => {
        this.pending = {
          requestId: p.requestId,
          schema: p.schema,
          context: p.context,
          resolve: (result) => resolve({ status: "completed", values: result.values }),
        };
      });
    }
    if (method === METHODS.cancel) {
      this.pending = null;
      return { cancelled: true };
    }
    return makeSuccess(0, null).result;
  }

  notify(): void {
    /* no-op */
  }

  onNotification(handler: (method: string, params: unknown) => void): () => void {
    return this.bus.subscribe(handler);
  }
}
