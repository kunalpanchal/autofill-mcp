import { describe, expect, it } from "vitest";
import { autoInit, defineFormSyncElements } from "./element.js";

describe("form-sync-button", () => {
  it("defines a custom element and auto-inits data-formsync forms", () => {
    defineFormSyncElements();
    expect(customElements.get("form-sync-button")).toBeDefined();
    document.body.innerHTML = `<form data-formsync><input name="n" /></form>`;
    autoInit();
    expect(document.querySelector("form-sync-button")).toBeTruthy();
    expect(document.querySelector("form-sync-button")?.shadowRoot?.textContent).toMatch(/Fill with AI/);
  });
});
