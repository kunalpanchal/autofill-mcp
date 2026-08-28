import type { FillContext, FilePayload, JsonSchema, JsonValue, PageInfo, ValidationIssue } from "@kunalpanchal/formsync-core";

export type SessionStatus = "queued" | "processing" | "completed" | "cancelled" | "error";

export interface PendingSession {
  requestId: string;
  schema: JsonSchema;
  context?: FillContext;
  page?: PageInfo;
  origin?: string;
  createdAt: number;
  status: SessionStatus;
  values?: Record<string, JsonValue>;
  files?: FilePayload[];
  error?: string;
  send: (payload: string) => void;
}

export class SessionStore {
  private readonly sessions = new Map<string, PendingSession>();

  put(session: PendingSession): void {
    this.sessions.set(session.requestId, session);
  }

  get(requestId: string): PendingSession | undefined {
    return this.sessions.get(requestId);
  }

  listActive(): PendingSession[] {
    return [...this.sessions.values()].filter((s) => s.status === "queued" || s.status === "processing");
  }

  complete(requestId: string, values: Record<string, JsonValue>, files?: FilePayload[]): PendingSession {
    const session = this.require(requestId);
    session.status = "completed";
    session.values = values;
    session.files = files;
    return session;
  }

  fail(requestId: string, message: string): PendingSession {
    const session = this.require(requestId);
    session.status = "error";
    session.error = message;
    return session;
  }

  cancel(requestId: string): void {
    const session = this.sessions.get(requestId);
    if (session) session.status = "cancelled";
  }

  dropClient(send: (payload: string) => void): void {
    for (const session of this.sessions.values()) {
      if (session.send === send && (session.status === "queued" || session.status === "processing")) {
        session.status = "cancelled";
      }
    }
  }

  require(requestId: string): PendingSession {
    const session = this.sessions.get(requestId);
    if (!session) throw Object.assign(new Error(`Unknown FormSync session ${requestId}`), { rpcCode: -32002 });
    return session;
  }

  markProcessing(requestId: string): PendingSession {
    const session = this.require(requestId);
    session.status = "processing";
    return session;
  }

  validationErrors?: Map<string, ValidationIssue[]>;
}
