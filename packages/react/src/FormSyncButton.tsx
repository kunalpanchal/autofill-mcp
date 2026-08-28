import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FormSyncClient,
  FormSyncError,
  injectFormSyncStyles,
  SPARKLE_SVG,
  type FieldDiff,
  type FieldMappers,
  type FilePayload,
  type FillContext,
  type JsonSchema,
  type JsonValue,
  type TransportPreference,
} from "@kunalpanchal/formsync-core";
import { ConnectModal, DiffModal } from "./modals.js";

export interface FormSyncButtonProps {
  schema?: JsonSchema;
  targetForm: string | HTMLFormElement;
  context?: FillContext;
  fieldMappers?: FieldMappers;
  onSuccess?: (data: Record<string, JsonValue>) => void;
  onError?: (err: Error) => void;
  label?: string;
  requireApproval?: boolean;
  maxRetries?: number;
  transports?: TransportPreference[];
  mockFiller?: (schema: JsonSchema) => Record<string, JsonValue> | Promise<Record<string, JsonValue>>;
  className?: string;
}

export function FormSyncButton(props: FormSyncButtonProps): ReactNode {
  const client = useMemo(
    () =>
      new FormSyncClient({
        transports: props.transports,
        mockFiller: props.mockFiller,
      }),
    [props.transports, props.mockFiller],
  );

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDetail, setConnectDetail] = useState<string>("");
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);
  const [files, setFiles] = useState<FilePayload[]>([]);
  const pending = useRef<{
    resolve: (v: boolean | Record<string, JsonValue>) => void;
  } | null>(null);

  useEffect(() => {
    injectFormSyncStyles();
    return () => client.disconnect();
  }, [client]);

  async function run() {
    setBusy(true);
    setStatus("Connecting…");
    try {
      const outcome = await client.fill({
        targetForm: props.targetForm,
        schema: props.schema,
        context: props.context,
        fieldMappers: props.fieldMappers,
        maxRetries: props.maxRetries,
        onProgress: (_stage, message) => setStatus(message),
        onApprove: async (nextDiffs, values, nextFiles) => {
          if (props.requireApproval === false) return true;
          setDiffs(nextDiffs);
          setFiles(nextFiles);
          setDiffOpen(true);
          return await new Promise<boolean | Record<string, JsonValue>>((resolve) => {
            pending.current = { resolve };
          });
        },
      });
      props.onSuccess?.(outcome.values);
      setStatus("Filled");
    } catch (err) {
      if (err instanceof FormSyncError && err.code === "NO_HOST") {
        setConnectDetail(err.message);
        setConnectOpen(true);
      } else if (err instanceof FormSyncError && err.code === "REJECTED") {
        setStatus("Rejected");
      } else {
        props.onError?.(err instanceof Error ? err : new Error(String(err)));
        setStatus("Error");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`fsync-btn${busy ? " fsync-btn--busy" : ""}${props.className ? ` ${props.className}` : ""}`}
        onClick={() => void run()}
        disabled={busy}
        aria-busy={busy}
      >
        <span dangerouslySetInnerHTML={{ __html: SPARKLE_SVG }} />
        {busy ? status || "Filling…" : props.label ?? "Fill with AI"}
      </button>
      <ConnectModal
        open={connectOpen}
        detail={connectDetail}
        onClose={() => setConnectOpen(false)}
        onRetry={() => {
          setConnectOpen(false);
          void run();
        }}
      />
      <DiffModal
        open={diffOpen}
        diffs={diffs}
        files={files}
        onCancel={() => {
          setDiffOpen(false);
          pending.current?.resolve(false);
          pending.current = null;
        }}
        onConfirm={(values) => {
          setDiffOpen(false);
          pending.current?.resolve(values);
          pending.current = null;
        }}
      />
    </>
  );
}
