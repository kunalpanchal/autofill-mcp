import type { ClientTransport } from "./transport.js";
import type { FillErrorParams, FillResultParams, HostDetection } from "../types.js";
import { METHODS, PROTOCOL_VERSION } from "./constants.js";
import { FormSyncError } from "../types.js";

export interface HandshakeOptions {
  transports: ClientTransport[];
  timeoutMs?: number;
}

export async function detectAndConnect(
  options: HandshakeOptions,
): Promise<{ transport: ClientTransport; detection: HostDetection }> {
  const errors: string[] = [];
  for (const transport of options.transports) {
    try {
      await transport.connect();
      await transport.request(
        METHODS.hello,
        {
          protocolVersion: PROTOCOL_VERSION,
          origin: typeof location !== "undefined" ? location.origin : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        options.timeoutMs ?? 2500,
      );
      return {
        transport,
        detection: { available: true, kind: transport.kind, detail: transport.description },
      };
    } catch (err) {
      transport.close();
      errors.push(`${transport.kind}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return {
    transport: options.transports[0]!,
    detection: {
      available: false,
      kind: "none",
      detail: errors.join(" | ") || "No AI host detected",
    },
  };
}

export function waitForFillResult(
  transport: ClientTransport,
  requestId: string,
  signal?: AbortSignal,
): { promise: Promise<FillResultParams>; cancel: () => void } {
  let cancelFn: () => void = () => {};
  const promise = new Promise<FillResultParams>((resolve, reject) => {
    const stop = transport.onNotification((method, params) => {
      if (method === METHODS.fillResult) {
        const result = params as FillResultParams;
        if (result.requestId === requestId) {
          cleanup();
          resolve(result);
        }
      }
      if (method === METHODS.fillError) {
        const error = params as FillErrorParams;
        if (error.requestId === requestId) {
          cleanup();
          reject(new FormSyncError(error.error.code, error.error.message, error.error.details));
        }
      }
    });

    const onAbort = () => {
      cleanup();
      reject(new FormSyncError("cancelled", "Fill request cancelled"));
    };
    signal?.addEventListener("abort", onAbort);

    function cleanup() {
      stop();
      signal?.removeEventListener("abort", onAbort);
    }
    cancelFn = cleanup;
  });
  return { promise, cancel: () => cancelFn() };
}
