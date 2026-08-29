import { describe, expect, it } from "vitest";
import { validateAgainstSchema } from "./validate.js";
import type { JsonSchema } from "../types.js";

const schema: JsonSchema = {
  type: "object",
  properties: {
    projectName: { type: "string" },
    tagline: { type: "string", maxLength: 60 },
    repoUrl: { type: "string", format: "uri" },
    techStack: { type: "array", items: { type: "string" } },
  },
  required: ["projectName", "tagline"],
};

describe("validateAgainstSchema", () => {
  it("accepts valid payloads", () => {
    const result = validateAgainstSchema(schema, {
      projectName: "FormSync",
      tagline: "Fill forms with local AI",
      repoUrl: "https://github.com/example/formsync",
      techStack: ["TypeScript"],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects over-length strings and invalid URIs", () => {
    const result = validateAgainstSchema(schema, {
      projectName: "FormSync",
      tagline: "x".repeat(80),
      repoUrl: "not-a-url",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const messages = result.errors.map((e) => e.message).join(" ");
    expect(messages).toMatch(/maxLength|must NOT have more/);
    expect(messages.toLowerCase()).toMatch(/uri|format|url/);
  });

  it("rejects missing required fields", () => {
    const result = validateAgainstSchema(schema, { projectName: "Only name" });
    expect(result.ok).toBe(false);
  });
});
