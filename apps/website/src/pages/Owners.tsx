import { MCP_CODEX_CONFIG, MCP_JSON_CONFIG, MCP_NPX_COMMAND } from "@kunalpanchal/formsync-core";
import { FormSyncButton } from "@kunalpanchal/formsync-react";
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

const headlessSnippet = `import { useFormSync } from "@kunalpanchal/formsync-react";

function Fill() {
  const { triggerProps, busy, status, connect, diff } = useFormSync({
    targetForm: "#product-hunt-form",
    schema,
  });
  return (
    <>
      <button {...triggerProps}>{busy ? status : "Fill with AI"}</button>
      {connect.open ? <YourConnect {...connect} /> : null}
      {diff.open ? <YourDiff {...diff} /> : null}
    </>
  );
}`;

const themeSnippet = `:root {
  --fsync-btn-bg: #14221c;
  --fsync-btn-fg: #f4f1ea;
  --fsync-btn-radius: 999px;
  --fsync-primary: #0f7a62;
}`;

function StyleDemos() {
  return (
    <div className="grid two">
      <form
        id="docs-theme-form"
        className="card theme-preview"
        onSubmit={(e) => e.preventDefault()}
      >
        <p>
          Default button, themed with <code>--fsync-*</code> variables.
        </p>
        <label>
          Note
          <input name="note" />
        </label>
        <FormSyncButton
          targetForm="#docs-theme-form"
          transports={["mock"]}
          mockFiller={() => ({ note: "Filled with a themed default button" })}
        />
      </form>
      <form id="docs-custom-form" className="card" onSubmit={(e) => e.preventDefault()}>
        <p>Your button. Same headless fill flow, no FormSync chrome.</p>
        <label>
          Note
          <input name="note" />
        </label>
        <FormSyncButton
          targetForm="#docs-custom-form"
          transports={["mock"]}
          mockFiller={() => ({ note: "Filled with a host button" })}
          renderTrigger={(s) => (
            <button
              type="button"
              className="custom-fill"
              onClick={s.fill}
              disabled={s.busy}
            >
              {s.busy ? s.status || "Filling..." : "Use my button"}
            </button>
          )}
        />
      </form>
    </div>
  );
}

export function Owners() {
  return (
    <article>
      <p className="kicker">Site owners</p>
      <h1>Add Fill with AI to a form</h1>
      <p className="lede">
        Drop in one control. FormSync infers a schema from the form, or you ship an explicit JSON
        Schema. The assistant never sees your DOM.
      </p>

      <h2>1. Install with a coding agent</h2>
      <p>
        Copy the FormSync Agent Skill into your website repo, then ask Cursor, Claude Code, Codex,
        or any skills-compatible agent to add Fill with AI.
      </p>
      <CodeBlock
        code={`mkdir -p .agents/skills/formsync
curl -fsSL https://raw.githubusercontent.com/kunalpanchal/autofill-mcp/main/.agents/skills/formsync/SKILL.md \\
  -o .agents/skills/formsync/SKILL.md`}
      />
      <p>Then prompt:</p>
      <CodeBlock code="Add FormSync Fill with AI to the forms on this site. Follow the formsync skill." />
      <p>
        In Cursor you can import the skill from{" "}
        <a href="https://github.com/kunalpanchal/autofill-mcp">github.com/kunalpanchal/autofill-mcp</a>
        {" "}(Customize, then Skills). The skill file is{" "}
        <code>.agents/skills/formsync/SKILL.md</code>.
      </p>

      <h2>2. Install from GitHub Packages</h2>
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

      <h2>Bring your own UI</h2>
      <p>
        The fill flow is headless. Built-in button and modals are a fallback when you do not pass
        your own components. Theme the default control, or render yours.
      </p>
      <StyleDemos />
      <p>
        <code>useFormSync</code> renders nothing. Pair it with your design system:
      </p>
      <CodeBlock code={headlessSnippet} />
      <p>Or keep the default button and restyle it:</p>
      <CodeBlock code={themeSnippet} />
      <p>
        <code>unstyled</code> skips injecting default CSS. Class names such as{" "}
        <code>fsync-btn</code> stay as hooks. Vanilla: <code>::part(button)</code>,{" "}
        <code>unstyled</code>, or <code>headless</code> plus <code>element.fill()</code>.
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
