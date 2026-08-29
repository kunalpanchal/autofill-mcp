# Site owner integration

**First step:** copy [`.agents/skills/formsync/SKILL.md`](../.agents/skills/formsync/SKILL.md) into your website repo and ask a coding agent to add Fill with AI. Manual steps are below.

## React

```tsx
import { FormSyncButton } from "@kunalpanchal/formsync-react";

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Product Hunt Listing",
  type: "object",
  properties: {
    projectName: { type: "string", description: "Name of the product or project" },
    tagline: { type: "string", maxLength: 60, description: "Short catchy headline" },
    description: { type: "string", description: "Detailed summary of key features" },
  },
  required: ["projectName", "tagline", "description"],
};

export function LaunchForm() {
  return (
    <form id="product-hunt-form">
      <input name="projectName" />
      <input name="tagline" maxLength={60} />
      <textarea name="description" />
      <FormSyncButton
        schema={schema}
        targetForm="#product-hunt-form"
        context={{ hint: "The user is filling a Product Hunt listing." }}
        onSuccess={(data) => console.log("Filled", data)}
        onError={(err) => console.error(err)}
      />
    </form>
  );
}
```

Omit `schema` to let `@kunalpanchal/formsync-core` infer one from `name`, `id`, labels, placeholders, and `aria-label`.

## Headless UI

The fill flow is headless. `@kunalpanchal/formsync-core` (`FormSyncClient`) and `useFormSync` own schema, transport, validation, and DOM writes. Built-in button and modals are a fallback when you do not pass your own components.

### Your components

```tsx
import { useFormSync } from "@kunalpanchal/formsync-react";

function Fill({ schema }: { schema: JsonSchema }) {
  const { triggerProps, busy, status, connect, diff } = useFormSync({
    schema,
    targetForm: "#product-hunt-form",
  });
  return (
    <>
      <button {...triggerProps}>{busy ? status : "Fill with AI"}</button>
      {connect.open ? (
        <YourDialog onClose={connect.close} onRetry={connect.retry}>
          {connect.detail}
        </YourDialog>
      ) : null}
      {diff.open ? (
        <YourDiff diffs={diff.diffs} onCancel={diff.cancel} onConfirm={diff.confirm} />
      ) : null}
    </>
  );
}
```

Same idea as a render function on the default wrapper:

```tsx
<FormSyncButton targetForm="#product-hunt-form" schema={schema}>
  {(s) => (
    <button type="button" className="your-btn" onClick={s.fill} disabled={s.busy}>
      {s.busy ? s.status : "Fill with AI"}
    </button>
  )}
</FormSyncButton>
```

`renderTrigger`, `renderConnect`, and `renderDiff` replace one surface at a time. Returning `null` from a render prop skips that surface.

### Theme the default UI

If you keep `FormSyncButton` / `ConnectModal` / `DiffModal`, override CSS variables on a wrapper or `:root`. Class names (`fsync-btn`, `fsync-overlay`, `fsync-card`, …) stay stable.

```css
:root {
  --fsync-btn-bg: #14221c;
  --fsync-btn-fg: #f4f1ea;
  --fsync-btn-radius: 999px;
  --fsync-primary: #0f7a62;
}
```

`unstyled` skips injecting the default stylesheet so you can style those class names yourself.

## Custom widgets

Custom widgets (Select2, Slate, tag inputs):

```tsx
<FormSyncButton
  targetForm="#form"
  fieldMappers={{
    body: (value, el) => editor.commands.setContent(String(value)),
  }}
/>
```

## Vanilla / custom element

Default element:

```html
<script type="module">
  import { autoInit } from "@kunalpanchal/formsync-web";
  autoInit();
</script>

<form data-formsync>
  <input name="email" type="email" />
  <form-sync-button></form-sync-button>
</form>
```

Style with `::part(button)`, `::part(label)`, `::part(status)`, or CSS variables. Slot your own label:

```html
<form-sync-button>Ask my assistant</form-sync-button>
```

`unstyled` skips default CSS. `headless` hides the built-in button so you call `element.fill()` from your own control. Cancel `formsync-connect` or `formsync-diff` and then call `approve(values)` / `reject()` to supply your own dialogs.

Fully custom vanilla UIs can skip the element and use `FormSyncClient` from `@kunalpanchal/formsync-core`.

## Pairing for end users

If **Fill with AI** cannot find a host, the page shows an install modal (Claude Desktop, Cursor, and Codex). It does not fail silently.

1. Install the MCP host (one time), or let Claude/Cursor/Codex spawn it from config below.
2. Optional: load `packages/extension` as an unpacked Chrome extension so the page can reach the host via `postMessage` when WebSocket is blocked.
3. Click **Fill with AI**, review the diff, approve.

Packages live on GitHub Packages, so `npx` must use that registry:

```bash
npx -y --registry=https://npm.pkg.github.com @kunalpanchal/formsync-mcp-server
```

Claude Desktop (`claude_desktop_config.json`) / Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "formsync": {
      "command": "npx",
      "args": ["-y", "--registry=https://npm.pkg.github.com", "@kunalpanchal/formsync-mcp-server"]
    }
  }
}
```

Codex CLI (`~/.codex/config.toml`):

```toml
[mcp_servers.formsync]
command = "npx"
args = ["-y", "--registry=https://npm.pkg.github.com", "@kunalpanchal/formsync-mcp-server"]
```

