import { describe, expect, it } from "vitest";
import { FormSyncClient } from "./client.js";
import { MockTransport } from "./transports/mock.js";
import { inferSchemaFromForm } from "../schema/infer.js";

describe("FormSyncClient with mock transport", () => {
  it("fills a form from mock AI values after validation", async () => {
    document.body.innerHTML = `
      <form id="ph">
        <input name="projectName" required />
        <input name="tagline" maxlength="60" />
        <textarea name="description"></textarea>
      </form>
    `;
    const form = document.querySelector("form")!;
    const client = new FormSyncClient({
      transports: ["mock"],
      mockFiller: () => ({
        projectName: "FormSync",
        tagline: "Local AI, structured JSON",
        description: "A privacy-first form bridge.",
      }),
      mockDelayMs: 0,
    });

    const outcome = await client.fill({ targetForm: form, onApprove: async () => true });
    expect(outcome.transport).toBe("mock");
    expect((form.elements.namedItem("projectName") as HTMLInputElement).value).toBe("FormSync");
    expect((form.elements.namedItem("tagline") as HTMLInputElement).value).toBe("Local AI, structured JSON");
    expect(outcome.diffs.length).toBeGreaterThan(0);
  });

  it("retries when the first payload fails JSON Schema validation", async () => {
    document.body.innerHTML = `<form><input name="tagline" maxlength="8" required /></form>`;
    const form = document.querySelector("form")!;
    let calls = 0;
    const client = new FormSyncClient({
      transports: ["mock"],
      mockDelayMs: 0,
      mockFiller: () => {
        calls += 1;
        return { tagline: calls === 1 ? "this is way too long for the field" : "short" };
      },
    });
    const outcome = await client.fill({
      targetForm: form,
      schema: inferSchemaFromForm(form),
      maxRetries: 2,
      onApprove: async () => true,
    });
    expect(calls).toBeGreaterThan(1);
    expect((form.elements.namedItem("tagline") as HTMLInputElement).value).toBe("short");
    expect(outcome.values.tagline).toBe("short");
  });

  it("throws VALIDATION_FAILED instead of writing invalid values after retries", async () => {
    document.body.innerHTML = `<form><input name="tagline" maxlength="8" required /></form>`;
    const form = document.querySelector("form")!;
    const client = new FormSyncClient({
      transports: ["mock"],
      mockDelayMs: 0,
      mockFiller: () => ({ tagline: "this is way too long for the field" }),
    });
    await expect(
      client.fill({
        targetForm: form,
        schema: inferSchemaFromForm(form),
        maxRetries: 0,
        onApprove: async () => true,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect((form.elements.namedItem("tagline") as HTMLInputElement).value).toBe("");
  });

  it("throws VALIDATION_FAILED when requireApproval is skipped and values stay invalid", async () => {
    document.body.innerHTML = `<form><input name="tagline" maxlength="8" required /></form>`;
    const form = document.querySelector("form")!;
    const client = new FormSyncClient({
      transports: ["mock"],
      mockDelayMs: 0,
      mockFiller: () => ({ tagline: "this is way too long for the field" }),
    });
    await expect(
      client.fill({
        targetForm: form,
        schema: inferSchemaFromForm(form),
        maxRetries: 0,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect((form.elements.namedItem("tagline") as HTMLInputElement).value).toBe("");
  });

  it("throws NO_HOST when no transports are available", async () => {
    document.body.innerHTML = `<form><input name="n" /></form>`;
    const client = new FormSyncClient({ transports: [] });
    await expect(client.fill({ targetForm: document.querySelector("form")! })).rejects.toMatchObject({
      code: "NO_HOST",
    });
  });
});

describe("MockTransport", () => {
  it("responds to hello and requestFill", async () => {
    const t = new MockTransport({ delayMs: 0 });
    await t.connect();
    const hello = await t.request("formsync/hello");
    expect(hello).toMatchObject({ protocolVersion: "1.0.0" });
  });
});
