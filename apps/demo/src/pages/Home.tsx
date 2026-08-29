import { Link } from "react-router-dom";

export function Home() {
  return (
    <main className="hero">
      <p className="eyebrow">Open source · MCP / WebMCP</p>
      <h1>Fill web forms with your local AI — not with a puppeted browser.</h1>
      <p className="lede">
        Site owners drop in one button. The assistant sees a JSON Schema, reads your local repo, and
        returns values you approve. No DOM access. No remote control.
      </p>
      <div className="cta-row">
        <Link className="cta" to="/product-hunt">
          Try the Product Hunt demo
        </Link>
        <a className="cta ghost" href="https://github.com/kunalpanchal/autofill-mcp">
          View the repo
        </a>
      </div>
      <ol className="steps">
        <li>
          <strong>Schema, not DOM.</strong> The page publishes the fields it needs.
        </li>
        <li>
          <strong>Local context.</strong> Claude Desktop or Cursor reads package.json, README, git.
        </li>
        <li>
          <strong>You approve.</strong> A diff modal lands values with framework-safe input events.
        </li>
      </ol>
    </main>
  );
}
