import {
  FormSyncClient,
  FormSyncError,
  FORMSYNC_CSS,
  SPARKLE_SVG,
  CONNECT_INSTALL_STEPS,
  MCP_NPX_COMMAND,
  type FieldDiff,
  type FilePayload,
  type FillContext,
  type JsonSchema,
  type JsonValue,
  type TransportPreference,
} from "@kunalpanchal/formsync-core";

function flatten(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export class FormSyncButtonElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["target-form", "label", "require-approval", "unstyled", "headless"];
  }

  private root: ShadowRoot;
  private client: FormSyncClient | null = null;
  schema: JsonSchema | undefined;
  context: FillContext | undefined;
  transports: TransportPreference[] | undefined;
  private pendingDiff: {
    resolve: (v: boolean | Record<string, JsonValue>) => void;
  } | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.renderChrome();
  }

  private isUnstyled(): boolean {
    return this.hasAttribute("unstyled");
  }

  private isHeadless(): boolean {
    return this.hasAttribute("headless");
  }

  private renderChrome(): void {
    const style = this.isUnstyled()
      ? `:host { display: inline-block; } button { font: inherit; }`
      : `${FORMSYNC_CSS}
        :host { display: inline-block; }`;
    this.root.innerHTML = `
      <style>${style}</style>
      <button type="button" class="${this.isUnstyled() ? "" : "fsync-btn"}" part="button">
        ${this.isUnstyled() ? "" : SPARKLE_SVG}
        <span class="fsync-btn__label" part="label"><slot></slot></span>
        <span class="fsync-btn__status" part="status" hidden></span>
      </button>
    `;
    const button = this.root.querySelector("button");
    button?.addEventListener("click", () => void this.fill());
    if (this.isHeadless()) {
      this.style.display = "contents";
      if (button) button.hidden = true;
    }
  }

  get targetForm(): string {
    return this.getAttribute("target-form") || this.closest("form")?.id
      ? `#${CSS.escape(this.getAttribute("target-form") || this.closest("form")?.id || "")}`
      : "";
  }

  connectedCallback(): void {
    this.syncLabel();
    if (this.isHeadless()) {
      const button = this.root.querySelector("button");
      if (button) button.hidden = true;
    }
  }

  attributeChangedCallback(name: string): void {
    if (name === "label") this.syncLabel();
    if (name === "unstyled" || name === "headless") this.renderChrome();
  }

  private syncLabel(): void {
    const slot = this.root.querySelector("slot");
    if (!slot) return;
    const assigned = slot.assignedNodes().filter((n) => n.textContent?.trim());
    if (assigned.length) return;
    const label = this.getAttribute("label") || "Fill with AI";
    slot.textContent = label;
  }

  private resolveTarget(): string | HTMLFormElement {
    const attr = this.getAttribute("target-form");
    if (attr) return attr;
    const form = this.closest("form");
    if (form) return form;
    throw new Error("form-sync-button needs target-form or must live inside a <form>");
  }

  /** Public so a host button can drive a headless element. */
  fill(): Promise<void> {
    return this.run();
  }

  approve(values: Record<string, JsonValue>): void {
    this.pendingDiff?.resolve(values);
    this.pendingDiff = null;
  }

  reject(): void {
    this.pendingDiff?.resolve(false);
    this.pendingDiff = null;
  }

  async run(): Promise<void> {
    const button = this.root.querySelector("button");
    const labelEl = this.root.querySelector(".fsync-btn__label") as HTMLElement | null;
    const statusEl = this.root.querySelector(".fsync-btn__status") as HTMLElement | null;
    if (button) {
      button.disabled = true;
      button.classList.add("fsync-btn--busy");
    }
    if (labelEl) labelEl.hidden = true;
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = "Filling…";
    }
    this.client ??= new FormSyncClient({
      transports: this.transports ?? ["webmcp", "websocket", "postmessage", "http"],
    });
    try {
      const outcome = await this.client.fill({
        targetForm: this.resolveTarget(),
        schema: this.schema,
        context: this.context,
        onProgress: (_s, message) => {
          this.dispatchEvent(new CustomEvent("formsync-progress", { detail: { message }, bubbles: true }));
          if (statusEl) statusEl.textContent = message.slice(0, 40);
        },
        onApprove: async (diffs, values, files) => {
          if (this.getAttribute("require-approval") === "false") return true;
          const ev = new CustomEvent("formsync-diff", {
            detail: { diffs, values, files },
            bubbles: true,
            cancelable: true,
          });
          if (!this.dispatchEvent(ev)) {
            return await new Promise<boolean | Record<string, JsonValue>>((resolve) => {
              this.pendingDiff = { resolve };
            });
          }
          return await this.showDiff(diffs, values, files);
        },
      });
      this.dispatchEvent(new CustomEvent("formsync-success", { detail: outcome.values, bubbles: true }));
    } catch (err) {
      if (err instanceof FormSyncError && err.code === "NO_HOST") {
        const ev = new CustomEvent("formsync-connect", {
          detail: { message: err.message },
          bubbles: true,
          cancelable: true,
        });
        if (this.dispatchEvent(ev)) this.showConnect(err.message);
      } else if (!(err instanceof FormSyncError && err.code === "REJECTED")) {
        this.dispatchEvent(new CustomEvent("formsync-error", { detail: err, bubbles: true }));
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove("fsync-btn--busy");
      }
      if (labelEl) labelEl.hidden = false;
      if (statusEl) {
        statusEl.hidden = true;
        statusEl.textContent = "";
      }
    }
  }

  private showConnect(detail: string): void {
    const overlay = document.createElement("div");
    overlay.className = "fsync-overlay";
    overlay.setAttribute("part", "overlay");
    const steps = CONNECT_INSTALL_STEPS.map(
      (step) => `
        <li class="fsync-step">
          <div class="fsync-copy-row">
            <h3>${escapeHtml(step.title)}</h3>
            <button type="button" class="fsync-copy" data-copy="${escapeAttr(step.code)}">Copy</button>
          </div>
          <p>${escapeHtml(step.hint)}</p>
          <pre class="fsync-pre">${escapeHtml(step.code)}</pre>
        </li>`,
    ).join("");
    overlay.innerHTML = `
      <style>${this.isUnstyled() ? "" : FORMSYNC_CSS}</style>
      <div class="fsync-card" role="dialog" aria-modal="true" aria-labelledby="fsync-connect-title" part="card">
        <h2 id="fsync-connect-title">No AI host detected</h2>
        <p>Install the FormSync MCP host on this computer (one time). After installing, retry and ask Claude, Cursor, or Codex to fill the pending form.</p>
        <ol class="fsync-steps">${steps}</ol>
        <p>Quick install: <code>${escapeHtml(MCP_NPX_COMMAND)}</code></p>
        <p>${escapeHtml(detail)}</p>
        <div class="fsync-actions">
          <button type="button" class="fsync-ghost" data-close>Close</button>
          <button type="button" class="fsync-primary" data-retry>I've installed it. Retry</button>
        </div>
      </div>
    `;
    overlay.querySelector("[data-close]")?.addEventListener("click", () => overlay.remove());
    overlay.querySelector("[data-retry]")?.addEventListener("click", () => {
      overlay.remove();
      void this.run();
    });
    for (const btn of Array.from(overlay.querySelectorAll("[data-copy]"))) {
      btn.addEventListener("click", () => {
        const text = (btn as HTMLElement).getAttribute("data-copy") || "";
        void navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied";
          window.setTimeout(() => {
            btn.textContent = "Copy";
          }, 1500);
        });
      });
    }
    document.body.appendChild(overlay);
  }

  private showDiff(
    diffs: FieldDiff[],
    values: Record<string, JsonValue>,
    files: FilePayload[],
  ): Promise<boolean | Record<string, JsonValue>> {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "fsync-overlay";
      overlay.setAttribute("part", "overlay");
      const rows = diffs
        .map(
          (d) => `
        <tr>
          <td><input type="checkbox" class="fsync-check" data-field="${d.field}" checked /></td>
          <td>${escapeHtml(d.label)}${d.error ? `<div class="err">${escapeHtml(d.error)}</div>` : ""}</td>
          <td class="prev">${escapeHtml(flatten(d.previous) || "-")}</td>
          <td><input data-edit="${d.field}" value="${escapeAttr(flatten(d.next))}" /></td>
        </tr>`,
        )
        .join("");
      overlay.innerHTML = `
        <style>${this.isUnstyled() ? "" : FORMSYNC_CSS}</style>
        <div class="fsync-card" role="dialog" aria-modal="true" part="card">
          <h2>Review AI values</h2>
          <p>Approve the fields that should be written into the form.</p>
          <table class="fsync-diff">
            <thead><tr><th>Apply</th><th>Field</th><th>Current</th><th>Proposed</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${files.length ? `<p>Files: ${files.map((f) => escapeHtml(f.filename)).join(", ")}</p>` : ""}
          <div class="fsync-actions">
            <button type="button" class="fsync-ghost" data-reject>Reject</button>
            <button type="button" class="fsync-primary" data-approve>Approve & fill</button>
          </div>
        </div>
      `;
      overlay.querySelector("[data-reject]")?.addEventListener("click", () => {
        overlay.remove();
        resolve(false);
      });
      overlay.querySelector("[data-approve]")?.addEventListener("click", () => {
        const next: Record<string, JsonValue> = {};
        for (const d of diffs) {
          const check = overlay.querySelector(`[data-field="${CSS.escape(d.field)}"]`) as HTMLInputElement | null;
          if (check && !check.checked) continue;
          const input = overlay.querySelector(`[data-edit="${CSS.escape(d.field)}"]`) as HTMLInputElement | null;
          next[d.field] = input ? input.value : values[d.field]!;
        }
        overlay.remove();
        resolve(next);
      });
      document.body.appendChild(overlay);
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

declare global {
  interface HTMLElementTagNameMap {
    "form-sync-button": FormSyncButtonElement;
  }
}

export function defineFormSyncElements(): void {
  if (!customElements.get("form-sync-button")) {
    customElements.define("form-sync-button", FormSyncButtonElement);
  }
}

export function autoInit(root: ParentNode = document): void {
  defineFormSyncElements();
  for (const form of Array.from(root.querySelectorAll("form[data-formsync]"))) {
    if (form.querySelector("form-sync-button")) continue;
    const btn = document.createElement("form-sync-button") as FormSyncButtonElement;
    form.appendChild(btn);
  }
}
