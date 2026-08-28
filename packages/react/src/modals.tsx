import { useEffect, useId, useState, type ReactNode } from "react";
import type { FieldDiff, FilePayload, JsonValue } from "@formsync/core";
import { flattenPreview } from "./preview.js";

export function ConnectModal(props: {
  open: boolean;
  detail?: string;
  onRetry: () => void;
  onClose: () => void;
}): ReactNode {
  if (!props.open) return null;
  const config = `{
  "mcpServers": {
    "formsync": {
      "command": "npx",
      "args": ["-y", "@formsync/mcp-server"]
    }
  }
}`;
  return (
    <div className="fsync-overlay" role="dialog" aria-modal="true" aria-labelledby="fsync-connect-title">
      <div className="fsync-card">
        <h2 id="fsync-connect-title">No AI host detected</h2>
        <p>
          FormSync did not find a local MCP host, WebMCP surface, or browser extension. Your AI
          never receives raw DOM access — it only returns structured JSON after you click Fill with
          AI.
        </p>
        <p>Start the local host, then retry:</p>
        <pre className="fsync-pre">npx @formsync/mcp-server</pre>
        <p>Or add this to Claude Desktop / Cursor MCP config:</p>
        <pre className="fsync-pre">{config}</pre>
        {props.detail ? <p>{props.detail}</p> : null}
        <div className="fsync-actions">
          <button type="button" className="fsync-ghost" onClick={props.onClose}>
            Close
          </button>
          <button type="button" className="fsync-primary" onClick={props.onRetry}>
            Retry connection
          </button>
        </div>
      </div>
    </div>
  );
}

export function DiffModal(props: {
  open: boolean;
  diffs: FieldDiff[];
  files: FilePayload[];
  onCancel: () => void;
  onConfirm: (values: Record<string, JsonValue>) => void;
}): ReactNode {
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const titleId = useId();

  useEffect(() => {
    const nextInc: Record<string, boolean> = {};
    const nextEdits: Record<string, string> = {};
    for (const d of props.diffs) {
      nextInc[d.field] = d.included;
      nextEdits[d.field] = flattenPreview(d.next);
    }
    setIncluded(nextInc);
    setEdits(nextEdits);
  }, [props.diffs]);

  if (!props.open) return null;

  return (
    <div className="fsync-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fsync-card">
        <h2 id={titleId}>Review AI values</h2>
        <p>
          Nothing is written to the form until you approve. Uncheck a field to skip it, or edit a
          value before applying.
        </p>
        {props.diffs.length === 0 ? (
          <p>The AI returned the same values already in the form.</p>
        ) : (
          <table className="fsync-diff">
            <thead>
              <tr>
                <th>Apply</th>
                <th>Field</th>
                <th>Current</th>
                <th>Proposed</th>
              </tr>
            </thead>
            <tbody>
              {props.diffs.map((d) => (
                <tr key={d.field}>
                  <td>
                    <input
                      className="fsync-check"
                      type="checkbox"
                      checked={included[d.field] ?? true}
                      onChange={(e) => setIncluded((s) => ({ ...s, [d.field]: e.target.checked }))}
                      aria-label={`Apply ${d.label}`}
                    />
                  </td>
                  <td>
                    {d.label}
                    {d.error ? <div className="err">{d.error}</div> : null}
                  </td>
                  <td className="prev">{flattenPreview(d.previous) || "—"}</td>
                  <td>
                    <input
                      value={edits[d.field] ?? ""}
                      onChange={(e) => setEdits((s) => ({ ...s, [d.field]: e.target.value }))}
                      aria-label={`Proposed ${d.label}`}
                      style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {props.files.length ? (
          <p>
            Files to attach: {props.files.map((f) => f.filename).join(", ")}
          </p>
        ) : null}
        <div className="fsync-actions">
          <button type="button" className="fsync-ghost" onClick={props.onCancel}>
            Reject
          </button>
          <button
            type="button"
            className="fsync-primary"
            onClick={() => {
              const values: Record<string, JsonValue> = {};
              for (const d of props.diffs) {
                if (!(included[d.field] ?? true)) continue;
                const raw = edits[d.field] ?? flattenPreview(d.next);
                values[d.field] = coerce(d.next, raw);
              }
              props.onConfirm(values);
            }}
          >
            Approve & fill
          </button>
        </div>
      </div>
    </div>
  );
}

function coerce(original: JsonValue | undefined, raw: string): JsonValue {
  if (typeof original === "boolean") return raw === "true" || raw === "on";
  if (typeof original === "number") return Number(raw);
  if (Array.isArray(original)) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return raw;
}
