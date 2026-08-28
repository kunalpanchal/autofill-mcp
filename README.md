# FormSync

**Fill web forms with your local AI assistant — schema in, JSON out, never browser control.**

FormSync is an open-source library and localhost bridge. Site owners add a single **Fill with AI** control. When a user clicks it, the page publishes the form's JSON Schema to the user's Claude Desktop, Cursor, Codex, or any MCP client. The assistant gathers context from *local* files (`package.json`, README, git remotes) and returns structured values. The user reviews a diff; only then does FormSync write inputs using native value setters and bubbling `input`/`change` events so React, Vue, and Svelte pick up the update.

The assistant never receives raw DOM access, mouse control, or a live browser session.

## Packages

| Package | Role |
| --- | --- |
| [`@formsync/core`](packages/core) | Schema inference, Ajv validation, DOM binder, JSON-RPC 2.0 client |
| [`@formsync/react`](packages/react) | `<FormSyncButton />`, approval diff, missing-host modal |
| [`@formsync/web`](packages/web) | `<form-sync-button>` custom element and `data-formsync` auto-init |
| [`@formsync/mcp-server`](packages/mcp-server) | Local host: stdio MCP + `ws://127.0.0.1:3737` |
| [`apps/demo`](apps/demo) | Product Hunt, GitHub repo, and job-application showcases |

## Quick start — site owners

```bash
pnpm add @formsync/react
```

```tsx
import { FormSyncButton } from "@formsync/react";

<form id="product-hunt-form">
  <input name="projectName" />
  <input name="tagline" maxLength={60} />
  <textarea name="description" />
  <FormSyncButton
    schema={formSchema}
    targetForm="#product-hunt-form"
    context={{ hint: "The user is filling a Product Hunt listing." }}
    onSuccess={(data) => console.log("Filled", data)}
    onError={(err) => console.error(err)}
  />
</form>
```

If you omit `schema`, `@formsync/core` infers one from `name`, `id`, placeholders, `aria-label`, and `<label>` text.

Vanilla:

```html
<form data-formsync>
  <input name="email" type="email" />
  <form-sync-button></form-sync-button>
</form>
<script type="module">
  import { autoInit } from "@formsync/web";
  autoInit();
</script>
```

See [docs/INTEGRATION.md](docs/INTEGRATION.md) for custom widgets (Select2, Slate, file inputs).

## Quick start — users (Claude Desktop / Cursor)

```json
{
  "mcpServers": {
    "formsync": {
      "command": "npx",
      "args": ["-y", "@formsync/mcp-server"]
    }
  }
}
```

Or run the host yourself:

```bash
npx @formsync/mcp-server
# optional demo mode without an LLM:
npx @formsync/mcp-server --serve --mock-agent
```

The process listens on **127.0.0.1:3737**. Click **Fill with AI**, then in Claude/Cursor ask it to fill the pending FormSync form (`list_pending_forms` → `read_project_context` → `fill_web_form`).

Handshake order: WebMCP (`document.modelContext`) → local WebSocket → extension `postMessage` → HTTP JSON-RPC.

Wire format: [docs/PROTOCOL.md](docs/PROTOCOL.md). Threat model: [docs/SECURITY.md](docs/SECURITY.md).

## Security principles

1. **Zero uncontrolled browser access.** JSON requests and responses only.
2. **User consent.** Click to start, schema is visible, values are approved before commit.
3. **Agent agnostic.** WebMCP, MCP stdio, WebSocket, HTTP, and a Chrome extension bridge.
4. **Privacy first.** Repo files stay in the local assistant session. The page gets field values (and optional data URLs for file inputs).

## Development

```bash
pnpm install
pnpm test
pnpm --filter @formsync/demo dev
```

Monorepo: pnpm workspaces + Turborepo. Unit tests are Vitest; the demo uses Playwright.

## License

MIT
