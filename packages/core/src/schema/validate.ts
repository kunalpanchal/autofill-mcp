import AjvImport from "ajv";
import addFormatsImport from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { JsonSchema, JsonValue, ValidationIssue } from "../types.js";

function interopDefault<T>(mod: unknown): T {
  if (mod && typeof mod === "object" && "default" in mod) {
    return (mod as { default: T }).default;
  }
  return mod as T;
}

type AjvInstance = {
  compile: (schema: object) => ValidateFunction;
};
type AjvConstructor = new (options?: Record<string, unknown>) => AjvInstance;
type AddFormats = (ajv: AjvInstance) => void;

const Ajv = interopDefault<AjvConstructor>(AjvImport);
const addFormats = interopDefault<AddFormats>(addFormatsImport);

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: false,
  allowUnionTypes: true,
  validateSchema: false,
});
addFormats(ajv);

const cache = new WeakMap<JsonSchema, ValidateFunction>();

function compileReady(schema: JsonSchema): object {
  const { $schema: _schemaId, ...rest } = schema;
  return rest;
}

function getValidator(schema: JsonSchema): ValidateFunction {
  const cached = cache.get(schema);
  if (cached) return cached;
  const fn = ajv.compile(compileReady(schema));
  cache.set(schema, fn);
  return fn;
}

export function validateAgainstSchema(
  schema: JsonSchema,
  data: unknown,
): { ok: true; value: Record<string, JsonValue> } | { ok: false; errors: ValidationIssue[] } {
  const validate = getValidator(schema);
  const valid = validate(data);
  if (valid) {
    return { ok: true, value: data as Record<string, JsonValue> };
  }
  return { ok: false, errors: (validate.errors ?? []).map(toIssue) };
}

function toIssue(err: ErrorObject): ValidationIssue {
  const missing =
    err.params && typeof err.params === "object"
      ? (err.params as { missingProperty?: string }).missingProperty
      : undefined;
  const path = (err.instancePath || "/").replace(/^\//, "").replace(/\//g, ".") || missing || "";
  const message = err.message
    ? `${path || "(root)"} ${err.message}`
    : `${err.keyword} validation failed`;
  return { path: String(path), message, keyword: err.keyword };
}

export function formatValidationErrors(errors: ValidationIssue[]): string {
  return errors.map((e) => `- ${e.message}`).join("\n");
}

/**
 * Validate a (possibly partial) approved payload. Required fields that the user
 * skipped are not treated as errors; each included field still must match its schema.
 */
export function validateApprovedValues(
  schema: JsonSchema,
  approved: Record<string, JsonValue>,
): { ok: true; value: Record<string, JsonValue> } | { ok: false; errors: ValidationIssue[] } {
  const required = (schema.required ?? []).filter((key) => Object.prototype.hasOwnProperty.call(approved, key));
  return validateAgainstSchema({ ...schema, required }, approved);
}
