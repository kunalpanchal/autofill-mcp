/**
 * Scoped FormSync styles. Prefixed with `fsync-` so they do not collide with host pages.
 * Injected once per document by the React and web packages.
 */
export const FORMSYNC_CSS = `
.fsync-root { all: initial; font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; color: #0f172a; }
.fsync-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: #fff;
  font: 600 14px/1 "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18), 0 8px 20px rgba(79, 70, 229, 0.28);
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
  background: rgba(15, 23, 42, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
}
.fsync-card {
  width: min(560px, 100%);
  max-height: min(80vh, 720px);
  overflow: auto;
  background: #fff;
  color: #0f172a;
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
  padding: 24px;
}
.fsync-card h2 { margin: 0 0 8px; font-size: 18px; }
.fsync-card p { margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.5; }
.fsync-pre {
  background: #0f172a;
  color: #e2e8f0;
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
.fsync-ghost { background: #fff; border: 1px solid #cbd5e1; color: #0f172a; }
.fsync-primary { background: #4f46e5; border: 0; color: #fff; }
.fsync-diff { width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 16px; }
.fsync-diff th, .fsync-diff td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.fsync-diff .prev { color: #94a3b8; text-decoration: line-through; }
.fsync-diff .next { color: #0f766e; }
.fsync-diff .err { color: #b91c1c; font-size: 12px; }
.fsync-check { margin-right: 6px; }
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
