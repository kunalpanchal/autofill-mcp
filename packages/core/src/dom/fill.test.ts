import { describe, expect, it, vi } from "vitest";
import { applyFormValues } from "./fill.js";
import { attachFiles, dataUrlToFile } from "./files.js";
import { setNativeInputValue } from "./events.js";

function mount(html: string): HTMLFormElement {
  document.body.innerHTML = html;
  return document.querySelector("form")!;
}

describe("applyFormValues", () => {
  it("sets native inputs, textarea, select, checkbox, and radio", async () => {
    const form = mount(`
      <form>
        <input name="projectName" />
        <textarea name="description"></textarea>
        <select name="visibility"><option value="public">Public</option><option value="private">Private</option></select>
        <input type="checkbox" name="remote" />
        <input type="radio" name="plan" value="free" />
        <input type="radio" name="plan" value="pro" />
        <select name="techStack" multiple>
          <option value="ts">TS</option>
          <option value="go">Go</option>
        </select>
      </form>
    `);

    const inputEvents: string[] = [];
    form.addEventListener("input", (e) => inputEvents.push((e.target as HTMLElement).getAttribute("name") || ""));
    form.addEventListener("change", (e) => inputEvents.push(`change:${(e.target as HTMLElement).getAttribute("name")}`));

    await applyFormValues(form, {
      projectName: "FormSync",
      description: "A local AI form filler",
      visibility: "private",
      remote: true,
      plan: "pro",
      techStack: ["ts", "go"],
    });

    expect((form.elements.namedItem("projectName") as HTMLInputElement).value).toBe("FormSync");
    expect((form.elements.namedItem("description") as HTMLTextAreaElement).value).toBe("A local AI form filler");
    expect((form.elements.namedItem("visibility") as HTMLSelectElement).value).toBe("private");
    expect((form.elements.namedItem("remote") as HTMLInputElement).checked).toBe(true);
    expect((form.querySelector('input[name="plan"][value="pro"]') as HTMLInputElement).checked).toBe(true);
    const multi = form.elements.namedItem("techStack") as HTMLSelectElement;
    expect(Array.from(multi.selectedOptions).map((o) => o.value)).toEqual(["ts", "go"]);
    expect(inputEvents.some((e) => e === "projectName" || e === "change:projectName")).toBe(true);
  });

  it("uses the native value setter so React-style trackers see a change", () => {
    const form = mount(`<form><input name="tagline" /></form>`);
    const input = form.elements.namedItem("tagline") as HTMLInputElement;
    const tracker = { setValue: vi.fn() };
    (input as unknown as { _valueTracker: { setValue: (v: string) => void } })._valueTracker = tracker;
    setNativeInputValue(input, "Ship in one click");
    expect(input.value).toBe("Ship in one click");
    expect(tracker.setValue).toHaveBeenCalled();
  });

  it("invokes custom field mappers for complex widgets", async () => {
    const form = mount(`<form><div data-formsync-field="editor"></div></form>`);
    const mapper = vi.fn();
    await applyFormValues(
      form,
      { editor: "rich text" },
      { mappers: { editor: mapper } },
    );
    expect(mapper).toHaveBeenCalledWith("rich text", expect.any(Element), "editor");
  });

  it("attaches File objects to file inputs from data URLs", async () => {
    const form = mount(`<form><input type="file" name="logo" /></form>`);
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const file = dataUrlToFile(dataUrl, "logo.png", "image/png");
    expect(file.name).toBe("logo.png");
    expect(file.type).toBe("image/png");
    await applyFormValues(
      form,
      { logo: dataUrl },
      { files: [{ field: "logo", filename: "logo.png", mimeType: "image/png", dataUrl }] },
    );
    const input = form.elements.namedItem("logo") as HTMLInputElement;
    expect(input.files?.[0]?.name).toBe("logo.png");
  });
});

describe("attachFiles", () => {
  it("writes DataTransfer files onto the input", () => {
    document.body.innerHTML = `<input type="file" />`;
    const input = document.querySelector("input")!;
    attachFiles(input, [new File(["hello"], "notes.txt", { type: "text/plain" })]);
    expect(input.files?.[0]?.name).toBe("notes.txt");
  });
});
