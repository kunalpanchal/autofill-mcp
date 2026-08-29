import { describe, expect, it } from "vitest";
import { inferSchemaFromForm } from "./infer.js";

function mountForm(html: string): HTMLFormElement {
  document.body.innerHTML = html;
  const form = document.querySelector("form");
  if (!form) throw new Error("no form");
  return form;
}

describe("inferSchemaFromForm", () => {
  it("extracts name, labels, placeholders, required, and types", () => {
    const form = mountForm(`
      <form aria-label="Launch listing">
        <label for="projectName">Project name</label>
        <input id="projectName" name="projectName" required maxlength="80" />

        <label>
          Tagline
          <input name="tagline" placeholder="Short catchy headline" maxlength="60" />
        </label>

        <textarea name="description" aria-label="Detailed summary" required></textarea>
        <input type="url" name="repoUrl" />
        <input type="email" name="contact" />
        <input type="number" name="years" min="0" max="40" />
        <input type="checkbox" name="remote" />
        <select name="visibility">
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <input type="radio" name="plan" value="free" />
        <input type="radio" name="plan" value="pro" />
        <input type="file" name="logo" />
        <button type="submit">Send</button>
      </form>
    `);

    const schema = inferSchemaFromForm(form);
    expect(schema.title).toBe("Launch listing");
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["projectName", "description"]);
    expect(schema.properties?.projectName?.maxLength).toBe(80);
    expect(schema.properties?.tagline?.maxLength).toBe(60);
    expect(schema.properties?.tagline?.description).toMatch(/Tagline|headline/);
    expect(schema.properties?.description?.description).toBe("Detailed summary");
    expect(schema.properties?.repoUrl?.format).toBe("uri");
    expect(schema.properties?.contact?.format).toBe("email");
    expect(schema.properties?.years?.type).toBe("number");
    expect(schema.properties?.remote?.type).toBe("boolean");
    expect(schema.properties?.visibility?.enum).toEqual(["public", "private"]);
    expect(schema.properties?.plan?.enum).toEqual(["free", "pro"]);
    expect(schema.properties?.logo?.xFormsync?.acceptsFile).toBe(true);
    expect(schema.properties?.["send"]).toBeUndefined();
  });

  it("skips submit buttons and unnamed controls", () => {
    const form = mountForm(`<form><input type="text" /><button>Go</button></form>`);
    const schema = inferSchemaFromForm(form);
    expect(schema.properties).toEqual({});
  });
});
