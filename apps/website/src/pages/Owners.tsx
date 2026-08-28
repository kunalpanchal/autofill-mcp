import { MCP_CODEX_CONFIG, MCP_JSON_CONFIG, MCP_NPX_COMMAND } from "@kunalpanchal/formsync-core";
import { CodeBlock } from "../components/CodeBlock.js";

const npmrc = `# ~/.npmrc
@kunalpanchal:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN`;

const reactSnippet = `import { FormSyncButton } from "@kunalpanchal/formsync-react";

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
}`;

const vanillaSnippet = `<script type="module">
  import { autoInit } from "@kunalpanchal/formsync-web";
  autoInit();
</script>

<form data-formsync>
  <input name="email" type="email" />
  <form-sync-button></form-sync-button>
</form>`;

const mapperSnippet = `<FormSyncButton
  targetForm="#form"
  fieldMappers={{
    body: (value, el) => editor.commands.setContent(String(value)),
  }}
/>`;

export function Owners() {
  return (
    <article>
      <p className="kicker">Site owners</p>
      <h1>Add Fill with AI to a form</h1>
      <p className="lede">
        Drop in one control. FormSync infers a schema from the form, or you ship an explicit JSON
        Schema. The assistant never sees your DOM.
      </p>

      <h2>Install from GitHub Packages</h2>
      <p>
        Point npm at the GitHub registry for this scope. Create a token with{" "}
        <code>read:packages</code>.
      </p>
      <CodeBlock code={npmrc} />
      <CodeBlock code="pnpm add @kunalpanchal/formsync-react" />

      <h2>React</h2>
      <CodeBlock code={reactSnippet} />
      <p>
        Omit <code>schema</code> to let <code>@kunalpanchal/formsync-core</code> infer one from{" "}
        <code>name</code>, <code>id</code>, labels, placeholders, and <code>aria-label</code>.
      </p>

      <h2>Vanilla / custom element</h2>
      <CodeBlock code={vanillaSnippet} />

      <h2>Custom widgets</h2>
      <p>Select2, Slate, tag inputs, and other non-native controls need a field mapper:</p>
      <CodeBlock code={mapperSnippet} />

      <h2>What happens when no host is installed</h2>
      <p>
        Fill with AI does not fail silently. The page opens a connect modal with copy-paste setup
        for a one-line npx install, Claude Desktop, Cursor, and Codex. After the user installs,
        they click I&apos;ve installed it. Retry.
      </p>
      <p>
        Quick install command the modal shows:
      </p>
      <CodeBlock code={MCP_NPX_COMMAND} />
      <p>Claude Desktop and Cursor:</p>
      <CodeBlock code={MCP_JSON_CONFIG} />
      <p>Codex CLI (~/.codex/config.toml):</p>
      <CodeBlock code={MCP_CODEX_CONFIG} />
    </article>
  );
}
