/** Default local FormSync MCP bridge port. */
export const DEFAULT_WS_PORT = 3737;
export const DEFAULT_WS_HOST = "127.0.0.1";
export const DEFAULT_WS_URL = `ws://${DEFAULT_WS_HOST}:${DEFAULT_WS_PORT}`;
export const DEFAULT_HTTP_URL = `http://${DEFAULT_WS_HOST}:${DEFAULT_WS_PORT}`;

export const PROTOCOL_VERSION = "1.0.0";
export const JSONRPC_VERSION = "2.0" as const;
export const POSTMESSAGE_CHANNEL = "formsync";

export const METHODS = {
  hello: "formsync/hello",
  ping: "formsync/ping",
  requestFill: "formsync/requestFill",
  cancel: "formsync/cancel",
  validationError: "formsync/validationError",
  poll: "formsync/poll",
  fillResult: "formsync/fillResult",
  fillError: "formsync/fillError",
  progress: "formsync/progress",
} as const;

export const JSONRPC_ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  hostUnavailable: -32001,
  sessionNotFound: -32002,
  cancelled: -32003,
  validationFailed: -32004,
} as const;
