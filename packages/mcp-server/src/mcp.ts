import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { makeNotification, METHODS } from "@kunalpanchal/formsync-core";
import type { SessionStore } from "./session-store.js";
import { readProjectContext } from "./context-reader.js";
import { submitSessionValues } from "./rpc-handler.js";
import { notifyProgress } from "./bridge.js";

export function createMcpServer(store: SessionStore, rootDir: string): McpServer {
  const server = new McpServer({
    name: "formsync",
    version: "1.0.1",
  });

  server.tool(
    "list_pending_forms",
    "List web forms waiting to be filled by FormSync. Call this when the user wants to autofill a page they just clicked Fill with AI on.",
    {},
    async () => {
      const pending = store.listActive().map((s) => ({
        requestId: s.requestId,
        title: s.schema.title,
        origin: s.origin,
        page: s.page,
        context: s.context,
        required: s.schema.required,
        fields: Object.keys(s.schema.properties ?? {}),
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: pending.length
              ? JSON.stringify({ pending }, null, 2)
              : "No pending FormSync forms. Ask the user to click Fill with AI in the browser.",
          },
        ],
      };
    },
  );

  server.tool(
    "get_form_schema",
    "Return the full JSON Schema and page context for a pending FormSync fill request.",
    { requestId: z.string().describe("Session id from list_pending_forms") },
    async ({ requestId }) => {
      const session = store.get(requestId);
      if (!session) {
        return { content: [{ type: "text" as const, text: `Unknown session ${requestId}` }], isError: true };
      }
      store.markProcessing(requestId);
      notifyProgress(store, requestId, "AI assistant is reading the schema");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                requestId,
                schema: session.schema,
                context: session.context,
                page: session.page,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "read_project_context",
    "Read local project files (package.json, README, git remote) from a workspace directory. Use this to infer form values. Data never leaves this machine except as the JSON values you later submit.",
    {
      rootDir: z
        .string()
        .optional()
        .describe("Workspace directory. Defaults to the FormSync server root."),
    },
    async ({ rootDir: dir }) => {
      const ctx = await readProjectContext(dir || rootDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(ctx, null, 2) }] };
    },
  );

  server.tool(
    "fill_web_form",
    "Submit populated JSON for a pending FormSync web form. The browser validates the payload and shows a diff for the user to approve before any DOM writes. For file inputs, pass a local path that resolves inside the project root; sensitive paths such as .ssh or .env are refused. The host encodes allowed files as data URLs.",
    {
      requestId: z.string(),
      values: z.record(z.unknown()).describe("JSON object matching the form schema"),
      files: z
        .array(
          z.object({
            field: z.string(),
            path: z.string().optional(),
            filename: z.string().optional(),
            mimeType: z.string().optional(),
            dataUrl: z.string().optional(),
          }),
        )
        .optional(),
    },
    async ({ requestId, values, files }) => {
      try {
        await submitSessionValues(
          store,
          requestId,
          values as Record<string, import("@kunalpanchal/formsync-core").JsonValue>,
          files,
          rootDir,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: "Values sent to the browser. The user must approve the diff before fields are filled.",
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
        };
      }
    },
  );

  server.tool(
    "reject_web_form",
    "Tell the browser that the assistant cannot fill a pending form.",
    {
      requestId: z.string(),
      reason: z.string(),
    },
    async ({ requestId, reason }) => {
      const session = store.fail(requestId, reason);
      session.send(
        JSON.stringify(
          makeNotification(METHODS.fillError, {
            requestId,
            error: { code: "AGENT_REJECTED", message: reason },
          }),
        ),
      );
      return { content: [{ type: "text" as const, text: "Error sent to the browser." }] };
    },
  );

  server.prompt("fill_pending_form", "Fill the next pending FormSync web form from local project context", () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `A website requested FormSync autofill. Use list_pending_forms, get_form_schema, and read_project_context. Infer the best values from local files only. Then call fill_web_form with JSON that matches the schema exactly (honor maxLength and uri formats). Do not invent secrets.`,
        },
      },
    ],
  }));

  return server;
}

export async function connectStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
