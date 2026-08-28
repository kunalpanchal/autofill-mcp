---
name: formsync
description: >-
  Install FormSync Fill with AI on a website. Use when the user wants to add AI
  form filling, FormSync, WebMCP/MCP form fill, an autofill button, or to wire
  @kunalpanchal/formsync-react or @kunalpanchal/formsync-web into existing forms.
  Do not use for general MCP server setup unrelated to web forms.
---

# Add FormSync to a website

FormSync lets a site add **Fill with AI**. The page publishes a JSON Schema (not DOM). The user's local assistant (Claude Desktop, Cursor, Codex) returns JSON. The user approves a diff. Then FormSync writes native input values and `input`/`change` events.

The assistant must never receive raw DOM, mouse control, cookies, or a live browser session.

Packages publish to GitHub Packages (`https://npm.pkg.github.com`), scope `@kunalpanchal`.

## Do this in order

1. Detect the app stack (React/Next vs vanilla HTML).
2. Configure GitHub Packages for the `@kunalpanchal` scope. Never commit a token.
3. Install the matching FormSync package.
4. Attach Fill with AI to real user-facing forms (not admin-only debug forms unless asked).
5. Prefer an explicit JSON Schema from field names. Infer only as a fallback.
6. Keep approval on. Do not set `requireApproval={false}` unless the user explicitly asks.
7. Verify the control renders and does not break submit.

## 1. GitHub Packages

If `.npmrc` (project or user) does not already map `@kunalpanchal` to GitHub Packages, add **only** the registry line to the **project** `.npmrc`:

```ini
@kunalpanchal:registry=https://npm.pkg.github.com
```

Auth belongs in the **user** npmrc or an env var, not in git:

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The token needs `read:packages`. If install fails with 401/404, tell the user to create a GitHub token with `read:packages` and export `GITHUB_TOKEN` (or `NODE_AUTH_TOKEN`). Do not invent or paste secrets into the repo.

Then install:

- React / Next / Remix: `pnpm add @kunalpanchal/formsync-react` (or `npm` / `yarn` equivalent)
- Vanilla / no React: `pnpm add @kunalpanchal/formsync-web`

Both pull `@kunalpanchal/formsync-core` transitively.

## 2. React

Put the button **inside or next to** the `<form>`, `type` is already `button`. Give the form a stable `id`.

```tsx
import { FormSyncButton } from "@kunalpanchal/formsync-react";

<form id="product-hunt-form">
  {/* existing fields with name= matching schema property keys */}
  <FormSyncButton
    schema={formSchema}
    targetForm="#product-hunt-form"
    context={{ hint: "Short description of this form and the product.", siteName: "Example" }}
    onSuccess={(data) => console.log("Filled", data)}
    onError={(err) => console.error(err)}
  />
</form>
```

Match `name` / `id` on inputs to schema property keys (`projectName`, not `project-name`, unless the DOM already uses kebab-case; then use those exact names in the schema).

Omit `schema` only when names, labels, placeholders, and `aria-label` are already good enough to infer.

Custom widgets (Select2, Slate, tag inputs) need `fieldMappers`:

```tsx
<FormSyncButton
  targetForm="#form"
  fieldMappers={{
    body: (value) => editor.commands.setContent(String(value)),
  }}
/>
```

Do **not** pass `transports={["mock"]}` on a real site. Mock is for docs and tests only.

`className` appends to the default Fill with AI button. Keep the default UI unless the user asks for custom styling.

## 3. Vanilla

```html
<form id="contact-form" data-formsync>
  <input name="email" type="email" />
  <form-sync-button></form-sync-button>
</form>
<script type="module">
  import { autoInit } from "@kunalpanchal/formsync-web";
  autoInit();
</script>
```

If the bundler does not rewrite bare specifiers, import from the installed package path the project already uses (Vite/Webpack handle this).

## 4. JSON Schema

Draft 2020-12 object schema. Add `$schema`, `title`, `properties`, and `required`. Use `description` on every field so the assistant knows what to write. Honor `maxLength`, `format` (`email`, `uri`), `enum`, `minimum` / `maximum`.

Arrays: if the DOM is a comma-separated `<input>`, still declare `type: "array"` with `items: { type: "string" }` when that is the product intent. FormSync will join for text inputs.

Do not put secrets, internal IDs, or CSRF tokens in the schema.

## 5. Context

Pass `context.hint` and `context.siteName` so the assistant knows which product it is filling. One or two sentences. No PII.

## 6. What you must not do

- Do not add Playwright, Puppeteer, CDP, or "let the model click the page" helpers.
- Do not disable the approval diff.
- Do not send the DOM, cookies, or `innerHTML` to the assistant.
- Do not commit `.env` tokens or `//npm.pkg.github.com/:_authToken=...` with a literal token.

## 7. Check your work

- The Fill with AI control is visible on the form.
- Clicking it does not submit the form.
- With no local MCP host, the **No AI host detected** modal appears (it must not fail silently).
- Existing validation and submit handlers still work.
- If this is a web UI change, verify in the browser (or the project's e2e tests).

End-user host install (the modal already shows this) uses GitHub Packages:

```bash
npx -y --registry=https://npm.pkg.github.com @kunalpanchal/formsync-mcp-server
```

Docs: https://kunalpanchal.github.io/autofill-mcp/
Repo: https://github.com/kunalpanchal/autofill-mcp
