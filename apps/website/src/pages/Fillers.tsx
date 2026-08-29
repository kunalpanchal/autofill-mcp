import { MCP_CODEX_CONFIG, MCP_JSON_CONFIG, MCP_NPX_COMMAND } from "@kunalpanchal/formsync-core";
import { CodeBlock } from "../components/CodeBlock.js";

export function Fillers() {
  return (
    <article>
      <p className="kicker">Form fillers</p>
      <h1>Use FormSync from Claude, Cursor, or Codex</h1>
      <p className="lede">
        You stay in control. Click Fill with AI on a participating site, review the proposed
        values, then approve. The assistant never drives the browser.
      </p>

      <h2>Install the local host</h2>
      <p>
        If no host is running, FormSync asks you to install the MCP server. It listens on{" "}
        <code>127.0.0.1:3737</code> and does not give the model browser control.
      </p>
      <CodeBlock code={MCP_NPX_COMMAND} />

      <h3>Claude Desktop or Cursor</h3>
      <p>
        Paste into <code>claude_desktop_config.json</code> or <code>~/.cursor/mcp.json</code>, then
        reload the app.
      </p>
      <CodeBlock code={MCP_JSON_CONFIG} />

      <h3>Codex CLI</h3>
      <p>
        Paste into <code>~/.codex/config.toml</code>, then restart Codex.
      </p>
      <CodeBlock code={MCP_CODEX_CONFIG} />

      <h2>Fill a form</h2>
      <ol>
        <li>Open a site that ships a FormSync button.</li>
        <li>Click Fill with AI. If the connect modal appears, install the host and retry.</li>
        <li>In your assistant, ask it to fill the pending FormSync form.</li>
        <li>Review the diff. Uncheck or edit fields, then approve.</li>
      </ol>
      <p>
        MCP tools the host exposes: <code>list_pending_forms</code>, <code>get_form_schema</code>,{" "}
        <code>read_project_context</code>, <code>fill_web_form</code>,{" "}
        <code>reject_web_form</code>.
      </p>

      <h2>How the page finds your host</h2>
      <ol>
        <li>
          WebMCP: <code>document.modelContext</code> or <code>navigator.modelContext</code>
        </li>
        <li>
          WebSocket: <code>ws://127.0.0.1:3737</code>
        </li>
        <li>Optional Chrome extension via postMessage when WebSocket is blocked</li>
        <li>
          HTTP JSON-RPC: <code>POST http://127.0.0.1:3737/rpc</code>
        </li>
      </ol>

      <h2>What the assistant can see</h2>
      <ul>
        <li>The JSON Schema (names, types, descriptions, constraints)</li>
        <li>Optional hints from the site, plus page URL and title</li>
        <li>
          Local files your MCP host reads, such as package.json and README. Upload paths must stay
          inside the project root; credential files are refused.
        </li>
      </ul>
      <p>
        The assistant cannot read arbitrary DOM, click, navigate, or hold your authenticated
        session. Values are written only after they pass schema validation and the in-page approval
        step (unless the embedder skips approval). Invalid JSON is never written.
      </p>
    </article>
  );
}
