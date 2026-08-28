import type { JsonSchema, JsonValue } from "../types.js";

function isFieldElement(
  el: Element,
): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  );
}

function skipType(type: string): boolean {
  return type === "submit" || type === "button" || type === "reset" || type === "image";
}

function labelTextFor(el: Element): string {
  if (el instanceof HTMLElement) {
    const aria = el.getAttribute("aria-label");
    if (aria?.trim()) return aria.trim();
    const described = el.getAttribute("aria-description");
    if (described?.trim()) return described.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const parts = labelledBy
        .split(/\s+/)
        .map((id) => el.ownerDocument.getElementById(id)?.textContent?.trim())
        .filter((t): t is string => Boolean(t));
      if (parts.length) return parts.join(" ");
    }
  }

  const id = (el as HTMLElement).id;
  if (id) {
    const label = el.ownerDocument.querySelector(`label[for="${cssEscape(id)}"]`);
    const text = extractLabelText(label, el);
    if (text) return text;
  }

  const parentLabel = el.closest("label");
  const nested = extractLabelText(parentLabel, el);
  if (nested) return nested;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.placeholder?.trim()) return el.placeholder.trim();
    if (el.title?.trim()) return el.title.trim();
  }

  const name = (el as HTMLInputElement).name || (el as HTMLElement).id;
  return name || "field";
}

function extractLabelText(label: Element | null, control: Element): string | undefined {
  if (!label) return undefined;
  const clone = label.cloneNode(true) as HTMLElement;
  for (const nested of Array.from(clone.querySelectorAll("input, select, textarea, button"))) {
    nested.remove();
  }
  const text = clone.textContent?.replace(/\s+/g, " ").trim();
  if (text) return text;
  return labelTextFor(control) === "field" ? undefined : undefined;
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}

function fieldType(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el instanceof HTMLSelectElement) return el.multiple ? "select-multiple" : "select";
  if (el instanceof HTMLTextAreaElement) return "textarea";
  return el.type || "text";
}

function inferFieldSchema(
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  extraRadioValues?: string[],
): JsonSchema {
  const type = fieldType(el);
  const description = labelTextFor(el);
  const schema: JsonSchema = { description };

  switch (type) {
    case "email":
      schema.type = "string";
      schema.format = "email";
      break;
    case "url":
      schema.type = "string";
      schema.format = "uri";
      break;
    case "number":
    case "range":
      schema.type = "number";
      if (el instanceof HTMLInputElement) {
        if (el.min !== "") schema.minimum = Number(el.min);
        if (el.max !== "") schema.maximum = Number(el.max);
      }
      break;
    case "checkbox":
      if (el instanceof HTMLInputElement && el.value && el.value !== "on") {
        schema.type = "array";
        schema.items = { type: "string" };
        schema.description = `${description} (multi-value checkbox group)`;
      } else {
        schema.type = "boolean";
      }
      break;
    case "radio": {
      schema.type = "string";
      const values = new Set<string>(extraRadioValues ?? []);
      if (el instanceof HTMLInputElement) values.add(el.value);
      schema.enum = [...values];
      break;
    }
    case "file":
      schema.type = "string";
      schema.format = "uri";
      schema.description = `${description}. Return a public URL or a local file path; the FormSync MCP host converts local files to a data URL.`;
      schema.xFormsync = { acceptsFile: true, inputType: "file" };
      break;
    case "select":
      schema.type = "string";
      if (el instanceof HTMLSelectElement) {
        schema.enum = Array.from(el.options)
          .filter((o) => o.value)
          .map((o) => o.value);
      }
      break;
    case "select-multiple":
      schema.type = "array";
      schema.items = { type: "string" };
      if (el instanceof HTMLSelectElement) {
        (schema.items as JsonSchema).enum = Array.from(el.options)
          .filter((o) => o.value)
          .map((o) => o.value);
      }
      schema.xFormsync = { multiple: true, inputType: "select" };
      break;
    case "date":
    case "datetime-local":
    case "month":
    case "week":
    case "time":
      schema.type = "string";
      schema.format = type === "date" ? "date" : "date-time";
      break;
    case "hidden":
      schema.type = "string";
      break;
    default:
      schema.type = "string";
  }

  if ("maxLength" in el && el.maxLength > 0) {
    schema.maxLength = el.maxLength;
  }
  if ("minLength" in el && el.minLength > 0) {
    schema.minLength = el.minLength;
  }
  if (el instanceof HTMLInputElement && el.pattern) {
    schema.pattern = el.pattern;
  }

  const contentEditableHost = findContentEditable(el);
  if (contentEditableHost) {
    schema.xFormsync = { ...schema.xFormsync, contentEditable: true };
  }

  return schema;
}

function findContentEditable(el: Element): HTMLElement | null {
  const next = el.nextElementSibling;
  if (next instanceof HTMLElement && next.isContentEditable) return next;
  const prev = el.previousElementSibling;
  if (prev instanceof HTMLElement && prev.isContentEditable) return prev;
  return null;
}

function fieldName(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | undefined {
  return el.name || el.id || undefined;
}

/**
 * Inspect a native HTML form and produce a JSON Schema describing its fields.
 * Uses name, id, placeholder, aria-label, and associated <label> text.
 */
export function inferSchemaFromForm(form: HTMLFormElement): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const seen = new Set<string>();

  const controls = Array.from(form.elements).filter(isFieldElement);

  const radioValues = new Map<string, string[]>();
  for (const el of controls) {
    if (el instanceof HTMLInputElement && el.type === "radio") {
      const name = fieldName(el);
      if (!name) continue;
      const list = radioValues.get(name) ?? [];
      if (!list.includes(el.value)) list.push(el.value);
      radioValues.set(name, list);
    }
  }

  for (const el of controls) {
    if (el.disabled) continue;
    const type = fieldType(el);
    if (skipType(type)) continue;
    const name = fieldName(el);
    if (!name) continue;

    if (seen.has(name)) continue;
    seen.add(name);

    const schema = inferFieldSchema(el, radioValues.get(name));
    properties[name] = schema;
    if (el.required) required.push(name);
  }

  const title =
    form.getAttribute("aria-label") ||
    form.getAttribute("data-formsync-title") ||
    form.name ||
    form.id ||
    "Form";

  const schema: JsonSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title,
    type: "object",
    properties,
  };
  if (required.length) schema.required = required;
  return schema;
}

export function schemaAcceptsFile(schema: JsonSchema, field: string): boolean {
  const prop = schema.properties?.[field];
  return Boolean(prop?.xFormsync?.acceptsFile);
}

export function flattenValuePreview(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
