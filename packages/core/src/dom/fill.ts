import type { FieldMappers, FilePayload, JsonSchema, JsonValue } from "../types.js";
import { resolveElement } from "../schema/diff.js";
import { dispatchInputEvents, setContentEditable, setNativeChecked, setNativeInputValue, setSelectValue } from "./events.js";
import { attachFiles, dataUrlToFile, isDataUrl } from "./files.js";

export interface ApplyOptions {
  mappers?: FieldMappers;
  files?: FilePayload[];
  schema?: JsonSchema;
}

function asString(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function asBoolean(value: JsonValue | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "on" || value === "1";
  return false;
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function fillHiddenOrContentEditable(el: Element, value: string): boolean {
  if (el instanceof HTMLElement && el.isContentEditable) {
    setContentEditable(el, value);
    return true;
  }
  const sibling =
    (el.nextElementSibling instanceof HTMLElement && el.nextElementSibling.isContentEditable
      ? el.nextElementSibling
      : null) ||
    (el.previousElementSibling instanceof HTMLElement && el.previousElementSibling.isContentEditable
      ? el.previousElementSibling
      : null);
  if (sibling) {
    setContentEditable(sibling, value);
    return true;
  }
  return false;
}

function fillNative(el: Element, field: string, value: JsonValue, files?: FilePayload[]): void {
  if (el instanceof HTMLInputElement) {
    switch (el.type) {
      case "checkbox": {
        const group = el.form?.elements.namedItem(el.name || field);
        if (group instanceof RadioNodeList && group.length > 1) {
          const wanted = new Set(asStringArray(value));
          for (const node of Array.from(group)) {
            if (node instanceof HTMLInputElement && node.type === "checkbox") {
              setNativeChecked(node, wanted.has(node.value) || wanted.has(node.id));
            }
          }
          return;
        }
        setNativeChecked(el, asBoolean(value));
        return;
      }
      case "radio": {
        const group = el.form?.elements.namedItem(el.name || field);
        const match = asString(value);
        const nodes = group instanceof RadioNodeList ? Array.from(group) : [el];
        for (const node of nodes) {
          if (node instanceof HTMLInputElement && node.type === "radio") {
            setNativeChecked(node, node.value === match);
          }
        }
        return;
      }
      case "file": {
        const payload = files?.find((f) => f.field === field);
        if (payload) {
          const file = dataUrlToFile(payload.dataUrl, payload.filename, payload.mimeType);
          attachFiles(el, [file]);
          return;
        }
        if (typeof value === "string" && isDataUrl(value)) {
          const file = dataUrlToFile(value, field);
          attachFiles(el, [file]);
        }
        return;
      }
      case "number":
      case "range":
        setNativeInputValue(el, value === null || value === undefined ? "" : String(value));
        return;
      default:
        setNativeInputValue(el, asString(value));
        return;
    }
  }
  if (el instanceof HTMLTextAreaElement) {
    setNativeInputValue(el, asString(value));
    return;
  }
  if (el instanceof HTMLSelectElement) {
    setSelectValue(el, el.multiple ? asStringArray(value) : asString(value));
    return;
  }
  if (fillHiddenOrContentEditable(el, asString(value))) return;
  if (el instanceof HTMLElement) {
    el.setAttribute("value", asString(value));
    dispatchInputEvents(el);
  }
}

/**
 * Write validated values into a form. Custom mappers run first for complex widgets
 * (Select2, Slate, tag inputs). File fields consume data-URL payloads from the MCP host.
 */
export async function applyFormValues(
  form: HTMLFormElement,
  values: Record<string, JsonValue>,
  options: ApplyOptions = {},
): Promise<void> {
  for (const [field, value] of Object.entries(values)) {
    const mapper = options.mappers?.[field];
    const el = resolveElement(form, field);
    if (mapper) {
      await mapper(value, el, field);
      continue;
    }
    if (!el) continue;
    fillNative(el, field, value, options.files);
  }
}

export function resolveForm(target: string | HTMLFormElement, root: ParentNode = document): HTMLFormElement {
  if (typeof target !== "string") return target;
  const el = root.querySelector(target);
  if (el instanceof HTMLFormElement) return el;
  if (el instanceof HTMLElement) {
    const nested = el.querySelector("form");
    if (nested) return nested;
  }
  throw new Error(`FormSync: could not find form matching selector "${target}"`);
}
