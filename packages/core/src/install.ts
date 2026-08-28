/** Published names on GitHub Packages (`https://npm.pkg.github.com`). */
export const FORMSYNC_PACKAGES = {
  core: "@kunalpanchal/formsync-core",
  react: "@kunalpanchal/formsync-react",
  web: "@kunalpanchal/formsync-web",
  mcpServer: "@kunalpanchal/formsync-mcp-server",
} as const;

export const MCP_NPX_COMMAND = `npx -y --registry=https://npm.pkg.github.com ${FORMSYNC_PACKAGES.mcpServer}`;

export const MCP_JSON_CONFIG = `{
  "mcpServers": {
    "formsync": {
      "command": "npx",
      "args": ["-y", "--registry=https://npm.pkg.github.com", "${FORMSYNC_PACKAGES.mcpServer}"]
    }
  }
}`;

export const MCP_CODEX_CONFIG = `[mcp_servers.formsync]
command = "npx"
args = ["-y", "--registry=https://npm.pkg.github.com", "${FORMSYNC_PACKAGES.mcpServer}"]`;

export const NO_HOST_MESSAGE =
  "No AI host detected. Install the FormSync MCP server, then retry. Run: " + MCP_NPX_COMMAND;

export const CONNECT_INSTALL_STEPS = [
  {
    id: "quick",
    title: "Install the host (any assistant)",
    hint: "Run this once in a terminal. It listens on 127.0.0.1:3737 and does not give the model browser control.",
    code: MCP_NPX_COMMAND,
  },
  {
    id: "claude",
    title: "Claude Desktop",
    hint: "Paste into claude_desktop_config.json, then restart Claude.",
    code: MCP_JSON_CONFIG,
  },
  {
    id: "cursor",
    title: "Cursor",
    hint: "Paste into ~/.cursor/mcp.json (or Cursor Settings → MCP), then reload.",
    code: MCP_JSON_CONFIG,
  },
  {
    id: "codex",
    title: "Codex CLI",
    hint: "Paste into ~/.codex/config.toml, then restart Codex.",
    code: MCP_CODEX_CONFIG,
  },
] as const;
