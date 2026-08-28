import { Link } from "react-router-dom";

export function Examples() {
  return (
    <article>
      <p className="kicker">Examples</p>
      <h1>Try the approval flow in the browser</h1>
      <p className="lede">
        These forms use an in-page mock assistant so the docs site works on GitHub Pages without a
        local MCP host. Click Fill with AI, inspect the diff, then approve.
      </p>
      <p className="note">
        On a real site, FormSync talks to Claude Desktop, Cursor, or Codex through the local MCP
        bridge. The mock here only demonstrates schema, diff, and native field writes.
      </p>
      <div className="grid three">
        <Link className="tile" to="/examples/product-hunt">
          <h3>Product Hunt listing</h3>
          <p>Explicit JSON Schema, text fields, URL fields, and a tech-stack list.</p>
        </Link>
        <Link className="tile" to="/examples/github">
          <h3>GitHub repository</h3>
          <p>Radios, selects, and a checkbox. Native events keep React state in sync.</p>
        </Link>
        <Link className="tile" to="/examples/job">
          <h3>Job application</h3>
          <p>Inferred schema fallback, plus a toggle that shows the missing-host modal.</p>
        </Link>
      </div>
    </article>
  );
}
