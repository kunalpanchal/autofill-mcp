import { Link } from "react-router-dom";

export function Home() {
  return (
    <article>
      <p className="kicker">Docs and examples</p>
      <h1>Fill web forms with your local AI, not a puppeted browser.</h1>
      <p className="lede">
        FormSync is an open-source library and localhost MCP bridge. A site adds one Fill with AI
        control. The page publishes a JSON Schema. Your assistant returns JSON. You approve a diff.
        Then fields fill with native value setters so React, Vue, and Svelte stay in sync.
      </p>
      <div className="actions">
        <Link className="btn" to="/examples/product-hunt">
          Try a live example
        </Link>
        <Link className="btn-ghost" to="/owners">
          Add it to a site
        </Link>
      </div>
      <ol className="steps">
        <li>
          <strong>Schema, not DOM.</strong> The assistant never receives raw HTML, cookies, or mouse
          control. It sees field names, types, and descriptions.
        </li>
        <li>
          <strong>Local context.</strong> Claude Desktop, Cursor, or Codex can read package.json,
          README, and git remotes on your machine.
        </li>
        <li>
          <strong>You approve.</strong> A diff modal lands values only after you confirm. Uncheck or
          edit any field first.
        </li>
      </ol>
      <h2>Packages</h2>
      <table className="props">
        <thead>
          <tr>
            <th>Package</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>@kunalpanchal/formsync-core</code>
            </td>
            <td>Schema inference, Ajv validation, DOM binder, JSON-RPC client</td>
          </tr>
          <tr>
            <td>
              <code>@kunalpanchal/formsync-react</code>
            </td>
            <td>Fill with AI button, approval diff, missing-host modal</td>
          </tr>
          <tr>
            <td>
              <code>@kunalpanchal/formsync-web</code>
            </td>
            <td>Custom element and data-formsync auto-init for vanilla pages</td>
          </tr>
          <tr>
            <td>
              <code>@kunalpanchal/formsync-mcp-server</code>
            </td>
            <td>Local host: stdio MCP plus ws://127.0.0.1:3737</td>
          </tr>
        </tbody>
      </table>
      <p>
        Packages publish to GitHub Packages on merge to main. A GitHub token with{" "}
        <code>read:packages</code> is required to install.
      </p>
    </article>
  );
}
