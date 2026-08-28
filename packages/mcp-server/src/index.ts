import { DEFAULT_WS_HOST, DEFAULT_WS_PORT } from "@formsync/core";
import { startBridge } from "./bridge.js";
import { connectStdio, createMcpServer } from "./mcp.js";

export interface CliOptions {
  port: number;
  host: string;
  mockAgent: boolean;
  stdio: boolean;
  serveOnly: boolean;
  rootDir: string;
  help: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    port: DEFAULT_WS_PORT,
    host: DEFAULT_WS_HOST,
    mockAgent: false,
    stdio: !process.stdin.isTTY,
    serveOnly: false,
    rootDir: process.cwd(),
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--port") opts.port = Number(argv[++i]);
    else if (arg === "--host") opts.host = argv[++i] ?? opts.host;
    else if (arg === "--mock-agent") opts.mockAgent = true;
    else if (arg === "--stdio") opts.stdio = true;
    else if (arg === "--serve") {
      opts.serveOnly = true;
      opts.stdio = false;
    } else if (arg === "--root") opts.rootDir = argv[++i] ?? opts.rootDir;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(`FormSync MCP host

Usage: formsync-mcp [options]

  --port <n>        WebSocket/HTTP port (default ${DEFAULT_WS_PORT})
  --host <addr>     Bind address (default ${DEFAULT_WS_HOST})
  --root <dir>      Workspace used for read_project_context
  --stdio           Speak MCP on stdin/stdout (Claude Desktop / Cursor)
  --serve           HTTP + WebSocket only (no stdio MCP)
  --mock-agent      Auto-fill from local package.json/README without an LLM

When stdin is a pipe, --stdio is implied so Claude Desktop can launch this binary.
`);
    return;
  }

  const bridge = await startBridge({
    host: opts.host,
    port: opts.port,
    mockAgent: opts.mockAgent,
    rootDir: opts.rootDir,
  });

  if (opts.stdio) {
    const mcp = createMcpServer(bridge.store, opts.rootDir);
    await connectStdio(mcp);
    return;
  }

  process.stderr.write(
    `FormSync listening on ws://${opts.host}:${opts.port}  (HTTP POST /rpc, GET /health)\n` +
      (opts.mockAgent ? "Mock agent enabled — incoming forms will be filled from local project context.\n" : "Waiting for an MCP host (Claude Desktop, Cursor, …) to call fill_web_form.\n"),
  );
}

export { startBridge, createMcpServer };
