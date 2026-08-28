import type { JsonValue } from "@formsync/core";

export function flattenPreview(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
