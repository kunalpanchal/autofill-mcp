/**
 * Default FormSync theme. Class names stay stable so hosts can restyle without
 * replacing components. Override any `--fsync-*` variable on `:root` or a wrapper.
 */
export const FORMSYNC_CSS = `
:root, :host {
  --fsync-font: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --fsync-fg: #0f172a;
  --fsync-muted: #475569;
  --fsync-line: #cbd5e1;
  --fsync-btn-bg: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --fsync-btn-fg: #fff;
  --fsync-btn-height: 40px;
  --fsync-btn-radius: 10px;
  --fsync-btn-shadow: 0 1px 2px rgba(15, 23, 42, 0.18), 0 8px 20px rgba(79, 70, 229, 0.28);
  --fsync-overlay-bg: rgba(15, 23, 42, 0.48);
  --fsync-card-bg: #fff;
  --fsync-card-fg: #0f172a;
  --fsync-card-radius: 16px;
  --fsync-primary: #4f46e5;
  --fsync-primary-fg: #fff;
  --fsync-pre-bg: #0f172a;
  --fsync-pre-fg: #e2e8f0;
}
.fsync-root { all: initial; font-family: var(--fsync-font); color: var(--fsync-fg); }
.fsync-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--fsync-btn-height);
  padding: 0 16px;
  border: 0;
  border-radius: var(--fsync-btn-radius);
  background: var(--fsync-btn-bg);
  color: var(--fsync-btn-fg);
  font: 600 14px/1 var(--fsync-font);
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: var(--fsync-btn-shadow);
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
}
.fsync-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
.fsync-btn:active { transform: translateY(0); }
.fsync-btn:focus-visible { outline: 2px solid #a5b4fc; outline-offset: 2px; }
.fsync-btn:disabled { opacity: 0.7; cursor: wait; transform: none; }
.fsync-btn__icon { width: 16px; height: 16px; display: block; }
.fsync-btn--busy .fsync-btn__icon { animation: fsync-spin 0.8s linear infinite; }
@keyframes fsync-spin { to { transform: rotate(360deg); } }

.fsync-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: var(--fsync-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: var(--fsync-font);
}
.fsync-card {
  width: min(640px, 100%);
  max-height: min(80vh, 720px);
  overflow: auto;
  background: var(--fsync-card-bg);
  color: var(--fsync-card-fg);
  border-radius: var(--fsync-card-radius);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
  padding: 24px;
}
.fsync-card h2 { margin: 0 0 8px; font-size: 18px; }
.fsync-card p { margin: 0 0 16px; color: var(--fsync-muted); font-size: 14px; line-height: 1.5; }
.fsync-pre {
  background: var(--fsync-pre-bg);
  color: var(--fsync-pre-fg);
  border-radius: 10px;
  padding: 12px 14px;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: auto;
  margin: 0 0 16px;
}
.fsync-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.fsync-ghost, .fsync-primary {
  height: 36px; padding: 0 14px; border-radius: 8px; font: 600 13px/1 inherit; cursor: pointer;
}
.fsync-ghost { background: var(--fsync-card-bg); border: 1px solid var(--fsync-line); color: var(--fsync-fg); }
.fsync-primary { background: var(--fsync-primary); border: 0; color: var(--fsync-primary-fg); }
.fsync-diff { width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 16px; }
.fsync-diff th, .fsync-diff td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.fsync-diff .prev { color: #94a3b8; text-decoration: line-through; }
.fsync-diff .next { color: #0f766e; }
.fsync-diff .err { color: #b91c1c; font-size: 12px; }
.fsync-check { margin-right: 6px; }
.fsync-steps { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 10px; }
.fsync-step { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
.fsync-step h3 { margin: 0 0 4px; font-size: 13px; }
.fsync-step p { margin: 0 0 8px; font-size: 12px; }
.fsync-step .fsync-pre { margin: 0; }
.fsync-copy-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 0 0 6px; }
.fsync-copy {
  height: 28px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--fsync-line);
  background: var(--fsync-card-bg); font: 600 11px/1 var(--fsync-font); cursor: pointer;
}
`;

let injected = false;

export function injectFormSyncStyles(doc: Document = document): void {
  if (injected || doc.getElementById("formsync-styles")) return;
  const style = doc.createElement("style");
  style.id = "formsync-styles";
  style.textContent = FORMSYNC_CSS;
  doc.head.appendChild(style);
  injected = true;
}

export const SPARKLE_SVG = `<svg class="fsync-btn__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5l1.2 3.6L13 6.3l-3.8 1.2L8 11.1 6.8 7.5 3 6.3l3.8-1.2L8 1.5z" fill="currentColor"/><path d="M12.5 9.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z" fill="currentColor"/></svg>`;
