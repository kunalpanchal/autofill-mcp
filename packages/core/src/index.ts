export type { JsonSchema, JsonValue, FillContext, FieldMapper, FieldMappers, FieldDiff, FilePayload, HostDetection, TransportKind, PageInfo, ValidationIssue } from "./types.js";
export { FormSyncError } from "./types.js";

export { inferSchemaFromForm, schemaAcceptsFile } from "./schema/infer.js";
export { validateAgainstSchema, validateApprovedValues, formatValidationErrors } from "./schema/validate.js";
export { computeDiff, readCurrentValues, readFieldValue, resolveElement, summarizeDiff } from "./schema/diff.js";

export { applyFormValues, resolveForm } from "./dom/fill.js";
export { setNativeInputValue, setNativeChecked, dispatchInputEvents } from "./dom/events.js";
export { dataUrlToFile, attachFiles, isDataUrl, isLikelyLocalPath } from "./dom/files.js";

export {
  DEFAULT_WS_PORT,
  DEFAULT_WS_HOST,
  DEFAULT_WS_URL,
  DEFAULT_HTTP_URL,
  PROTOCOL_VERSION,
  METHODS,
  POSTMESSAGE_CHANNEL,
  JSONRPC_VERSION,
  JSONRPC_ERRORS,
} from "./protocol/constants.js";
export { JsonRpcPeer, parseMessage, makeRequest, makeNotification, makeSuccess, makeFailure, isJsonRpcRequest, isJsonRpcNotification, isJsonRpcSuccess, isJsonRpcFailure } from "./protocol/rpc.js";
export { FormSyncClient } from "./protocol/client.js";
export type { FormSyncClientOptions, FillSessionOptions, FillOutcome, TransportPreference } from "./protocol/client.js";
export { MockTransport, WebMcpTransport, WebSocketTransport, HttpTransport, PostMessageTransport } from "./protocol/client.js";
export { detectAndConnect } from "./protocol/handshake.js";
export { getModelContext, isTransportAvailable } from "./protocol/transport.js";

export { FORMSYNC_CSS, injectFormSyncStyles, SPARKLE_SVG } from "./ui/styles.js";
export {
  FORMSYNC_PACKAGES,
  MCP_NPX_COMMAND,
  MCP_JSON_CONFIG,
  MCP_CODEX_CONFIG,
  NO_HOST_MESSAGE,
  CONNECT_INSTALL_STEPS,
} from "./install.js";
