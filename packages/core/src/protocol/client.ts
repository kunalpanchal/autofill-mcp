import type {
  FieldDiff,
  FieldMappers,
  FilePayload,
  FillContext,
  HostDetection,
  JsonSchema,
  JsonValue,
} from "../types.js";
import { FormSyncError } from "../types.js";
import { NO_HOST_MESSAGE } from "../install.js";
import { computeDiff, readCurrentValues } from "../schema/diff.js";
import { inferSchemaFromForm } from "../schema/infer.js";
import { formatValidationErrors, validateAgainstSchema, validateApprovedValues } from "../schema/validate.js";
import { applyFormValues, resolveForm } from "../dom/fill.js";
import { METHODS } from "./constants.js";
import { detectAndConnect, waitForFillResult } from "./handshake.js";
import { DEFAULT_HTTP_URL, DEFAULT_WS_URL } from "./constants.js";
import type { ClientTransport } from "./transport.js";
import { HttpTransport } from "./transports/http.js";
import { MockTransport, type MockFiller } from "./transports/mock.js";
import { PostMessageTransport } from "./transports/http.js";
import { WebMcpTransport } from "./transports/webmcp.js";
import { WebSocketTransport } from "./transports/websocket.js";
import { isTransportAvailable } from "./transport.js";

export type TransportPreference = "webmcp" | "websocket" | "postmessage" | "http" | "mock";

export interface FormSyncClientOptions {
  transports?: TransportPreference[];
  wsUrl?: string;
  httpUrl?: string;
  mockFiller?: MockFiller;
  mockDelayMs?: number;
}

export interface FillSessionOptions {
  targetForm: string | HTMLFormElement;
  schema?: JsonSchema;
  context?: FillContext;
  fieldMappers?: FieldMappers;
  maxRetries?: number;
  signal?: AbortSignal;
  /**
   * Called after values are validated and before they are written to the DOM.
   * Return false to abort, true to apply all fields, or a subset of values.
   */
  onApprove?: (
    diffs: FieldDiff[],
    values: Record<string, JsonValue>,
    files: FilePayload[],
  ) => Promise<boolean | Record<string, JsonValue>>;
  onProgress?: (stage: string, message: string) => void;
}

export interface FillOutcome {
  values: Record<string, JsonValue>;
  files: FilePayload[];
  diffs: FieldDiff[];
  transport: TransportPreference;
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `fs_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class FormSyncClient {
  private readonly options: FormSyncClientOptions;
  private transport: ClientTransport | null = null;
  lastDetection: HostDetection = { available: false, kind: "none" };

  constructor(options: FormSyncClientOptions = {}) {
    this.options = options;
  }

  private buildTransports(): ClientTransport[] {
    const order = this.options.transports ?? ["webmcp", "websocket", "postmessage", "http"];
    const built: ClientTransport[] = [];
    for (const kind of order) {
      if (kind !== "mock" && !isTransportAvailable(kind) && kind !== "http") continue;
      switch (kind) {
        case "webmcp":
          built.push(new WebMcpTransport());
          break;
        case "websocket":
          built.push(new WebSocketTransport(this.options.wsUrl ?? DEFAULT_WS_URL));
          break;
        case "postmessage":
          built.push(new PostMessageTransport());
          break;
        case "http":
          built.push(new HttpTransport(this.options.httpUrl ?? DEFAULT_HTTP_URL));
          break;
        case "mock":
          built.push(
            new MockTransport({ filler: this.options.mockFiller, delayMs: this.options.mockDelayMs }),
          );
          break;
      }
    }
    return built;
  }

  async detectHost(): Promise<HostDetection> {
    const transports = this.buildTransports();
    if (!transports.length) {
      this.lastDetection = { available: false, kind: "none", detail: "No transports configured" };
      return this.lastDetection;
    }
    const { transport, detection } = await detectAndConnect({ transports });
    if (detection.available) this.transport = transport;
    this.lastDetection = detection;
    return detection;
  }

  async fill(options: FillSessionOptions): Promise<FillOutcome> {
    const form = resolveForm(options.targetForm);
    const schema = options.schema ?? inferSchemaFromForm(form);
    options.onProgress?.("detect", "Looking for a local AI host…");

    if (!this.transport) {
      const detection = await this.detectHost();
      if (!detection.available) {
        throw new FormSyncError("NO_HOST", NO_HOST_MESSAGE);
      }
    }

    const transport = this.transport!;
    const requestId = newRequestId();
    const previous = readCurrentValues(form, schema);
    let files: FilePayload[] = [];
    let values: Record<string, JsonValue> = {};

    options.onProgress?.("request", "Sending schema to your AI assistant…");
    const result = await this.requestFill(transport, METHODS.requestFill, {
      requestId,
      schema,
      context: options.context,
      page: {
        url: typeof location !== "undefined" ? location.href : undefined,
        title: typeof document !== "undefined" ? document.title : undefined,
        origin: typeof location !== "undefined" ? location.origin : undefined,
      },
    }, requestId, options.signal);

    values = result.values;
    files = result.files ?? [];

    let attempt = 0;
    const maxRetries = options.maxRetries ?? 2;
    while (true) {
      const check = validateAgainstSchema(schema, values);
      if (check.ok) {
        values = check.value;
        break;
      }
      if (attempt >= maxRetries) {
        const message = `Validation still failing after retries:\n${formatValidationErrors(check.errors)}`;
        options.onProgress?.("invalid", message);
        if (!options.onApprove) {
          throw new FormSyncError("VALIDATION_FAILED", message);
        }
        break;
      }
      attempt += 1;
      options.onProgress?.(
        "retry",
        `AI output failed validation. Retrying (${attempt}/${maxRetries})…`,
      );
      const retryResult = await this.requestFill(
        transport,
        METHODS.validationError,
        {
          requestId,
          errors: check.errors,
          schema,
          previousValues: values,
        },
        requestId,
        options.signal,
      );
      values = retryResult.values;
      files = retryResult.files ?? files;
    }

    const diffs = computeDiff(schema, previous, values);
    let approved: Record<string, JsonValue> = values;
    if (options.onApprove) {
      const decision = await options.onApprove(diffs, values, files);
      if (decision === false) {
        transport.notify(METHODS.cancel, { requestId });
        throw new FormSyncError("REJECTED", "User rejected the suggested values.");
      }
      if (decision !== true) approved = decision;
    }

    const approvedCheck = validateApprovedValues(schema, approved);
    if (!approvedCheck.ok) {
      throw new FormSyncError("VALIDATION_FAILED", formatValidationErrors(approvedCheck.errors));
    }
    approved = approvedCheck.value;

    options.onProgress?.("apply", "Writing approved values into the form…");
    await applyFormValues(form, approved, { mappers: options.fieldMappers, files, schema });
    return { values: approved, files, diffs, transport: transport.kind };
  }

  private async requestFill(
    transport: ClientTransport,
    method: string,
    params: unknown,
    requestId: string,
    signal?: AbortSignal,
  ): Promise<{ requestId: string; values: Record<string, JsonValue>; files?: FilePayload[] }> {
    const waiter = waitForFillResult(transport, requestId, signal);
    try {
      const queued = (await transport.request(method, params)) as {
        status?: string;
        values?: Record<string, JsonValue>;
        files?: FilePayload[];
      };
      if (queued?.status === "completed" && queued.values) {
        waiter.cancel();
        return { requestId, values: queued.values, files: queued.files };
      }
      return await waiter.promise;
    } catch (err) {
      waiter.cancel();
      throw err;
    }
  }

  disconnect(): void {
    this.transport?.close();
    this.transport = null;
  }
}

export { MockTransport, WebMcpTransport, WebSocketTransport, HttpTransport, PostMessageTransport };
