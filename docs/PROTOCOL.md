# FormSync protocol

FormSync never gives an assistant raw DOM, cursor, or browser-control rights. The page publishes a JSON Schema; the assistant returns JSON. The user approves a diff before values are written.

Wire format is **JSON-RPC 2.0**. Default local endpoint: `ws://127.0.0.1:3737` (HTTP `POST /rpc` and SSE `GET /events` on the same port).

## Handshake order (browser)

1. **WebMCP** — `document.modelContext || navigator.modelContext`
2. **WebSocket** — `ws://127.0.0.1:3737`
3. **postMessage** — `{ channel: "formsync", ...rpc }` for the browser extension
4. **HTTP** — `POST http://127.0.0.1:3737/rpc`

## Frames

### `formsync/hello`

Request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "formsync/hello",
  "params": {
    "protocolVersion": "1.0.0",
    "origin": "https://example.com",
    "userAgent": "Mozilla/5.0"
  }
}
```

Result:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "protocolVersion": "1.0.0", "capabilities": ["fill", "mcp"] }
}
```

### `formsync/requestFill`

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "formsync/requestFill",
  "params": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": {} },
    "context": { "hint": "The user is filling a Product Hunt listing.", "siteName": "Product Hunt" },
    "page": { "url": "https://www.producthunt.com/posts/new", "title": "New post", "origin": "https://www.producthunt.com" }
  }
}
```

Immediate result is either `{ "status": "queued", "requestId": "..." }` or `{ "status": "completed", "values": { ... } }` (mock agent).

### `formsync/fillResult` (notification)

```json
{
  "jsonrpc": "2.0",
  "method": "formsync/fillResult",
  "params": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "values": { "projectName": "FormSync", "tagline": "Local AI that fills web forms" },
    "files": [
      {
        "field": "logo",
        "filename": "logo.png",
        "mimeType": "image/png",
        "dataUrl": "data:image/png;base64,..."
      }
    ],
    "meta": { "model": "mcp-tool" }
  }
}
```

### `formsync/validationError`

Sent when Ajv rejects the payload. The host should retry. Same `requestId`.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "formsync/validationError",
  "params": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "errors": [{ "path": "tagline", "message": "tagline must NOT have more than 60 characters", "keyword": "maxLength" }],
    "schema": { "type": "object" },
    "previousValues": { "tagline": "this line was far too long" }
  }
}
```

### Other methods

| Method | Direction | Purpose |
| --- | --- | --- |
| `formsync/ping` | → host | Liveness |
| `formsync/cancel` | → host | Abort a session |
| `formsync/poll` | → host | HTTP fallback: read session status |
| `formsync/progress` | ← host | `{ requestId, stage, message }` |
| `formsync/fillError` | ← host | `{ requestId, error: { code, message } }` |

Error codes: standard JSON-RPC plus `-32001` host unavailable, `-32002` unknown session, `-32003` cancelled, `-32004` validation failed.

## MCP tools (stdio)

When Claude Desktop, Cursor, or Codex launches `npx -y --registry=https://npm.pkg.github.com @kunalpanchal/formsync-mcp-server`, the same process binds `127.0.0.1:3737` and speaks MCP on stdio:

- `list_pending_forms`
- `get_form_schema`
- `read_project_context`
- `fill_web_form` — `{ requestId, values, files? }`
- `reject_web_form`

Prompt: `fill_pending_form`.

Local file contents are only sent to the MCP host (the user's assistant). The browser receives field values and optional data URLs for file inputs — never a live filesystem.
