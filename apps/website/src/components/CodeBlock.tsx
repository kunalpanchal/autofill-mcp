import { useState, type ReactNode } from "react";

export function CodeBlock({ code, label = "Copy" }: { code: string; label?: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          });
        }}
      >
        {copied ? "Copied" : label}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
