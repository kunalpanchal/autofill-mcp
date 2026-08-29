import { useEffect, useMemo, useRef, useState } from "react";
import {
  FormSyncClient,
  FormSyncError,
  type FieldDiff,
  type FieldMappers,
  type FilePayload,
  type FillContext,
  type JsonSchema,
  type JsonValue,
  type TransportPreference,
} from "@kunalpanchal/formsync-core";

export interface UseFormSyncOptions {
  schema?: JsonSchema;
  targetForm: string | HTMLFormElement;
  context?: FillContext;
  fieldMappers?: FieldMappers;
  onSuccess?: (data: Record<string, JsonValue>) => void;
  onError?: (err: Error) => void;
  requireApproval?: boolean;
  maxRetries?: number;
  transports?: TransportPreference[];
  mockFiller?: (schema: JsonSchema) => Record<string, JsonValue> | Promise<Record<string, JsonValue>>;
}

export interface FormSyncConnectState {
  open: boolean;
  detail: string;
  close: () => void;
  retry: () => void;
}

export interface FormSyncDiffState {
  open: boolean;
  diffs: FieldDiff[];
  files: FilePayload[];
  cancel: () => void;
  confirm: (values: Record<string, JsonValue>) => void;
}

export interface FormSyncController {
  fill: () => void;
  busy: boolean;
  status: string;
  connect: FormSyncConnectState;
  diff: FormSyncDiffState;
  triggerProps: {
    type: "button";
    onClick: () => void;
    disabled: boolean;
    "aria-busy": boolean;
  };
}

/**
 * Headless fill controller. Renders nothing. Use this when the host supplies
 * its own button, connect UI, and approval UI.
 */
export function useFormSync(options: UseFormSyncOptions): FormSyncController {
  const client = useMemo(
    () =>
      new FormSyncClient({
        transports: options.transports,
        mockFiller: options.mockFiller,
      }),
    [options.transports, options.mockFiller],
  );

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDetail, setConnectDetail] = useState("");
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);
  const [files, setFiles] = useState<FilePayload[]>([]);
  const pending = useRef<{
    resolve: (v: boolean | Record<string, JsonValue>) => void;
  } | null>(null);

  useEffect(() => {
    return () => client.disconnect();
  }, [client]);

  function fill() {
    void run();
  }

  async function run() {
    setBusy(true);
    setStatus("Connecting…");
    try {
      const outcome = await client.fill({
        targetForm: options.targetForm,
        schema: options.schema,
        context: options.context,
        fieldMappers: options.fieldMappers,
        maxRetries: options.maxRetries,
        onProgress: (_stage, message) => setStatus(message),
        onApprove: async (nextDiffs, _values, nextFiles) => {
          if (options.requireApproval === false) return true;
          setDiffs(nextDiffs);
          setFiles(nextFiles);
          setDiffOpen(true);
          return await new Promise<boolean | Record<string, JsonValue>>((resolve) => {
            pending.current = { resolve };
          });
        },
      });
      options.onSuccess?.(outcome.values);
      setStatus("Filled");
    } catch (err) {
      if (err instanceof FormSyncError && err.code === "NO_HOST") {
        setConnectDetail(err.message);
        setConnectOpen(true);
      } else if (err instanceof FormSyncError && err.code === "REJECTED") {
        setStatus("Rejected");
      } else {
        options.onError?.(err instanceof Error ? err : new Error(String(err)));
        setStatus("Error");
      }
    } finally {
      setBusy(false);
    }
  }

  const connect: FormSyncConnectState = {
    open: connectOpen,
    detail: connectDetail,
    close: () => setConnectOpen(false),
    retry: () => {
      setConnectOpen(false);
      fill();
    },
  };

  const diff: FormSyncDiffState = {
    open: diffOpen,
    diffs,
    files,
    cancel: () => {
      setDiffOpen(false);
      pending.current?.resolve(false);
      pending.current = null;
    },
    confirm: (values) => {
      setDiffOpen(false);
      pending.current?.resolve(values);
      pending.current = null;
    },
  };

  return {
    fill,
    busy,
    status,
    connect,
    diff,
    triggerProps: {
      type: "button",
      onClick: fill,
      disabled: busy,
      "aria-busy": busy,
    },
  };
}
