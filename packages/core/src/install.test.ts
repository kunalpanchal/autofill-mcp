import { describe, expect, it } from "vitest";
import { CONNECT_INSTALL_STEPS, FORMSYNC_PACKAGES, MCP_NPX_COMMAND, NO_HOST_MESSAGE } from "./install.js";

describe("MCP install copy", () => {
  it("tells the user to install the GitHub Packages MCP host", () => {
    expect(MCP_NPX_COMMAND).toContain(FORMSYNC_PACKAGES.mcpServer);
    expect(MCP_NPX_COMMAND).toContain("npm.pkg.github.com");
    expect(NO_HOST_MESSAGE).toMatch(/Install the FormSync MCP server/);
    expect(CONNECT_INSTALL_STEPS.map((s) => s.id)).toEqual(["quick", "claude", "cursor", "codex"]);
  });
});
