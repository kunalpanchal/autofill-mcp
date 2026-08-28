import type { FieldDiff, JsonSchema, JsonValue } from "../types.js";
import { flattenValuePreview } from "./infer.js";
import { validateAgainstSchema } from "./validate.js";

export function readCurrentValues(
  form: HTMLFormElement,
  schema?: JsonSchema,
): Record<string, JsonValue> {
  const keys = schema?.properties ? Object.keys(schema.properties) : undefined;
  const result: Record<string, JsonValue> = {};
  const elements = Array.from(form.elements);

  const names = keys ?? [
    ...new Set(
      elements
        .map((el) => (el as HTMLInputElement).name || (el as HTMLElement).id)
        .filter((n): n is string => Boolean(n)),
    ),
  ];

  for (const name of names) {
    const value = readFieldValue(form, name);
    if (value !== undefined) result[name] = value;
  }
  return result;
}

export function readFieldValue(form: HTMLFormElement, name: string): JsonValue | undefined {
  const named = form.elements.namedItem(name);
  if (named instanceof RadioNodeList) {
    const items = Array.from(named);
    const radios = items.filter((n): n is HTMLInputElement => n instanceof HTMLInputElement && n.type === "radio");
    if (radios.length) {
      const checked = radios.find((r) => r.checked);
      return checked?.value ?? "";
    }
    const checks = items.filter((n): n is HTMLInputElement => n instanceof HTMLInputElement && n.type === "checkbox");
    if (checks.length) {
      return checks.filter((c) => c.checked).map((c) => c.value || "on");
    }
  }
  const el = resolveElement(form, name);
  if (!el) return undefined;
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return el.checked;
    if (el.type === "file") {
      return el.files?.[0]?.name ?? "";
    }
    if (el.type === "number" || el.type === "range") {
      return el.value === "" ? "" : Number(el.value);
    }
    return el.value;
  }
  if (el instanceof HTMLSelectElement) {
    if (el.multiple) return Array.from(el.selectedOptions).map((o) => o.value);
    return el.value;
  }
  if (el instanceof HTMLTextAreaElement) return el.value;
  if (el instanceof HTMLElement && el.isContentEditable) return el.innerText;
  return undefined;
}

export function resolveElement(form: HTMLFormElement, name: string): Element | null {
  const named = form.elements.namedItem(name);
  if (named instanceof RadioNodeList) return named[0] ?? null;
  if (named instanceof Element) return named;
  const escaped = cssEscape(name);
  return (
    form.querySelector(`[name="${escaped}"]`) ||
    form.querySelector(`#${escaped}`) ||
    form.querySelector(`[data-formsync-field="${escaped}"]`)
  );
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/"/g, '\\"');
}

export function computeDiff(
  schema: JsonSchema,
  previous: Record<string, JsonValue>,
  next: Record<string, JsonValue>,
): FieldDiff[] {
  const keys = new Set([
    ...Object.keys(schema.properties ?? {}),
    ...Object.keys(previous),
    ...Object.keys(next),
  ]);
  const diffs: FieldDiff[] = [];
  for (const field of keys) {
    const prop = schema.properties?.[field];
    const prev = previous[field];
    const nxt = next[field];
    if (JSON.stringify(prev) === JSON.stringify(nxt)) continue;
    const issue = prop
      ? validateAgainstSchema({ type: "object", properties: { [field]: prop }, required: schema.required?.includes(field) ? [field] : [] }, { [field]: nxt })
      : { ok: true as const, value: {} };
    diffs.push({
      field,
      label: prop?.description || prop?.title || field,
      previous: prev,
      next: nxt,
      included: true,
      error: issue.ok ? undefined : issue.errors.map((e) => e.message).join("; "),
      acceptsFile: Boolean(prop?.xFormsync?.acceptsFile),
    });
  }
  return diffs;
}

export function summarizeDiff(diffs: FieldDiff[]): string {
  if (!diffs.length) return "No changes.";
  return diffs
    .map((d) => `${d.label}: "${flattenValuePreview(d.previous)}" → "${flattenValuePreview(d.next)}"`)
    .join("\n");
}
