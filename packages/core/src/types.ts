export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  enum?: JsonValue[];
  const?: JsonValue;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  additionalProperties?: boolean | JsonSchema;
  default?: JsonValue;
  examples?: JsonValue[];
  xFormsync?: {
    inputType?: string;
    multiple?: boolean;
    acceptsFile?: boolean;
    contentEditable?: boolean;
  };
}

export interface FillContext {
  hint?: string;
  siteName?: string;
  locale?: string;
  extra?: Record<string, JsonValue>;
}

export interface PageInfo {
  url?: string;
  title?: string;
  origin?: string;
}

export interface FilePayload {
  field: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
}

export interface FillRequestParams {
  requestId: string;
  schema: JsonSchema;
  context?: FillContext;
  page?: PageInfo;
}

export interface FillResultParams {
  requestId: string;
  values: Record<string, JsonValue>;
  files?: FilePayload[];
  meta?: {
    model?: string;
    sources?: string[];
  };
}

export interface FillErrorParams {
  requestId: string;
  error: {
    code: string;
    message: string;
    details?: JsonValue;
  };
}

export interface ValidationIssue {
  path: string;
  message: string;
  keyword?: string;
}

export interface ValidationErrorParams {
  requestId: string;
  errors: ValidationIssue[];
  schema: JsonSchema;
  previousValues?: Record<string, JsonValue>;
}

export type TransportKind = "webmcp" | "websocket" | "postmessage" | "http" | "mock";

export type FieldMapper = (
  value: JsonValue,
  element: Element | null,
  field: string,
) => void | Promise<void>;

export type FieldMappers = Record<string, FieldMapper>;

export interface FieldDiff {
  field: string;
  label: string;
  previous: JsonValue | undefined;
  next: JsonValue | undefined;
  included: boolean;
  error?: string;
  acceptsFile?: boolean;
}

export interface HostDetection {
  available: boolean;
  kind: TransportKind | "none";
  detail?: string;
}

export class FormSyncError extends Error {
  readonly code: string;
  readonly causeError?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "FormSyncError";
    this.code = code;
    this.causeError = cause;
  }
}
