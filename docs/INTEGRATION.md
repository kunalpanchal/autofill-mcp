# Site owner integration

## React

```tsx
import { FormSyncButton } from "@formsync/react";

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

Omit `schema` to let `@formsync/core` infer one from `name`, `id`, labels, placeholders, and `aria-label`.

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

```html
<script type="module">
  import { autoInit } from "@formsync/web";
  autoInit();
</script>

<form data-formsync>
  <input name="email" type="email" />
  <form-sync-button></form-sync-button>
</form>
```

## Pairing for end users

1. Run `npx @formsync/mcp-server` (or let Claude Desktop spawn it).
2. Optional: load `packages/extension` as an unpacked Chrome extension so the page can reach the host via `postMessage` when WebSocket is blocked.
3. Click **Fill with AI**, review the diff, approve.

Claude Desktop / Cursor config:

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
