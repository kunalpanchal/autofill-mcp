import {
  FormSyncClient,
  FormSyncError,
  FORMSYNC_CSS,
  SPARKLE_SVG,
  type FieldDiff,
  type FilePayload,
  type FillContext,
  type JsonSchema,
  type JsonValue,
  type TransportPreference,
} from "@formsync/core";

function flatten(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export class FormSyncButtonElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["target-form", "label", "require-approval"];
  }

  private root: ShadowRoot;
  private client: FormSyncClient | null = null;
  schema: JsonSchema | undefined;
  context: FillContext | undefined;
  transports: TransportPreference[] | undefined;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.innerHTML = `
      <style>${FORMSYNC_CSS}
        :host { display: inline-block; }
      </style>
      <button type="button" class="fsync-btn" part="button">
        ${SPARKLE_SVG}
        <span class="fsync-btn__label">Fill with AI</span>
      </button>
    `;
    this.root.querySelector("button")?.addEventListener("click", () => void this.run());
  }

  get targetForm(): string {
    return this.getAttribute("target-form") || this.closest("form")?.id
      ? `#${CSS.escape(this.getAttribute("target-form") || this.closest("form")?.id || "")}`
      : "";
  }

  connectedCallback(): void {
    const label = this.getAttribute("label");
    if (label) {
      const span = this.root.querySelector(".fsync-btn__label");
      if (span) span.textContent = label;
    }
  }

  private resolveTarget(): string | HTMLFormElement {
    const attr = this.getAttribute("target-form");
    if (attr) return attr;
    const form = this.closest("form");
    if (form) return form;
    throw new Error("form-sync-button needs target-form or must live inside a <form>");
  }

  async run(): Promise<void> {
    const button = this.root.querySelector("button")!;
    const label = this.root.querySelector(".fsync-btn__label")!;
    button.disabled = true;
    button.classList.add("fsync-btn--busy");
    label.textContent = "Filling…";
    this.client ??= new FormSyncClient({ transports: this.transports ?? ["webmcp", "websocket", "postmessage", "http"] });
    try {
      const outcome = await this.client.fill({
        targetForm: this.resolveTarget(),
        schema: this.schema,
        context: this.context,
        onProgress: (_s, message) => {
          label.textContent = message.slice(0, 40);
        },
        onApprove: async (diffs, values, files) => {
          if (this.getAttribute("require-approval") === "false") return true;
          return await this.showDiff(diffs, values, files);
        },
      });
      this.dispatchEvent(new CustomEvent("formsync-success", { detail: outcome.values, bubbles: true }));
      label.textContent = this.getAttribute("label") || "Fill with AI";
    } catch (err) {
      if (err instanceof FormSyncError && err.code === "NO_HOST") {
        this.showConnect(err.message);
      } else if (!(err instanceof FormSyncError && err.code === "REJECTED")) {
        this.dispatchEvent(new CustomEvent("formsync-error", { detail: err, bubbles: true }));
      }
      label.textContent = this.getAttribute("label") || "Fill with AI";
    } finally {
      button.disabled = false;
      button.classList.remove("fsync-btn--busy");
    }
  }

  private showConnect(detail: string): void {
    const overlay = document.createElement("div");
    overlay.className = "fsync-overlay";
    overlay.innerHTML = `
      <style>${FORMSYNC_CSS}</style>
      <div class="fsync-card" role="dialog" aria-modal="true">
        <h2>No AI host detected</h2>
        <p>Run <code>npx @formsync/mcp-server</code> or add FormSync to your Claude Desktop / Cursor MCP config.</p>
        <pre class="fsync-pre">npx @formsync/mcp-server</pre>
        <p>${detail}</p>
        <div class="fsync-actions">
          <button type="button" class="fsync-ghost" data-close>Close</button>
          <button type="button" class="fsync-primary" data-retry>Retry</button>
        </div>
      </div>
    `;
    overlay.querySelector("[data-close]")?.addEventListener("click", () => overlay.remove());
    overlay.querySelector("[data-retry]")?.addEventListener("click", () => {
      overlay.remove();
      void this.run();
    });
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
      const rows = diffs
        .map(
          (d) => `
        <tr>
          <td><input type="checkbox" class="fsync-check" data-field="${d.field}" checked /></td>
          <td>${escapeHtml(d.label)}${d.error ? `<div class="err">${escapeHtml(d.error)}</div>` : ""}</td>
          <td class="prev">${escapeHtml(flatten(d.previous) || "—")}</td>
          <td><input data-edit="${d.field}" value="${escapeAttr(flatten(d.next))}" /></td>
        </tr>`,
        )
        .join("");
      overlay.innerHTML = `
        <style>${FORMSYNC_CSS}</style>
        <div class="fsync-card" role="dialog" aria-modal="true">
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
