import type { JsonValue } from "@kunalpanchal/formsync-core";

export function flattenPreview(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Coerce a diff-editor string back to the type the schema last returned. */
export function parseProposedValue(original: JsonValue | undefined, raw: string): JsonValue {
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
