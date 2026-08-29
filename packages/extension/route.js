/**
 * Route MCP host frames back to the tab that opened the session.
 * Never broadcast fill payloads to every tab.
 */

export function requestIdFromFrame(parsed) {
  if (!parsed || typeof parsed !== "object") return undefined;
  const params = parsed.params;
  if (params && typeof params === "object" && typeof params.requestId === "string") {
    return params.requestId;
  }
  const result = parsed.result;
  if (result && typeof result === "object" && typeof result.requestId === "string") {
    return result.requestId;
  }
  return undefined;
}

export function rememberTab(rpc, tabId, tabs) {
  if (rpc && rpc.id !== undefined && rpc.id !== null) {
    tabs.byRpcId.set(rpc.id, tabId);
  }
  const requestId = requestIdFromFrame(rpc);
  if (requestId) tabs.byRequestId.set(requestId, tabId);
}

export function tabForHostFrame(parsed, tabs) {
  if (parsed && parsed.id !== undefined && parsed.id !== null && tabs.byRpcId.has(parsed.id)) {
    return tabs.byRpcId.get(parsed.id);
  }
  const requestId = requestIdFromFrame(parsed);
  if (requestId && tabs.byRequestId.has(requestId)) {
    return tabs.byRequestId.get(requestId);
  }
  return undefined;
}

export function forgetTab(tabId, tabs) {
  for (const [id, mapped] of tabs.byRpcId) {
    if (mapped === tabId) tabs.byRpcId.delete(id);
  }
  for (const [id, mapped] of tabs.byRequestId) {
    if (mapped === tabId) tabs.byRequestId.delete(id);
  }
}

export function createTabMaps() {
  return {
    byRpcId: new Map(),
    byRequestId: new Map(),
  };
}
