import { describe, expect, it } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { FormSyncButton } from "./FormSyncButton.js";

describe("FormSyncButton", () => {
  it("renders the Fill with AI label", async () => {
    document.body.innerHTML = `<div id="root"></div><form id="f"><input name="n" /></form>`;
    const root = createRoot(document.getElementById("root")!);
    await act(async () => {
      root.render(
        <FormSyncButton targetForm="#f" transports={["mock"]} requireApproval={false} />,
      );
    });
    expect(document.querySelector("button")?.textContent).toMatch(/Fill with AI/);
    root.unmount();
  });
});
