import { useEffect, type CSSProperties, type ReactNode } from "react";
import { injectFormSyncStyles, SPARKLE_SVG } from "@kunalpanchal/formsync-core";
import { ConnectModal, DiffModal } from "./modals.js";
import {
  useFormSync,
  type FormSyncConnectState,
  type FormSyncController,
  type FormSyncDiffState,
  type UseFormSyncOptions,
} from "./useFormSync.js";

export interface FormSyncView extends FormSyncController {
  label: string;
}

export interface FormSyncButtonProps extends UseFormSyncOptions {
  label?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Do not inject default CSS. Keep `fsync-*` class names as styling hooks, or
   * pass `children` / `renderTrigger` and use your own classes.
   */
  unstyled?: boolean;
  /** Replace the default trigger. Connect and diff UI still render unless you override them. */
  renderTrigger?: (state: FormSyncView) => ReactNode;
  /** Replace the default missing-host modal. Return null to render nothing. */
  renderConnect?: (state: FormSyncConnectState) => ReactNode;
  /** Replace the default approval diff. Return null to render nothing. */
  renderDiff?: (state: FormSyncDiffState) => ReactNode;
  /**
   * Custom trigger content inside the default button, or a render function that
   * owns the entire UI (trigger + connect + diff).
   */
  children?: ReactNode | ((state: FormSyncView) => ReactNode);
}

function isRenderFn(value: FormSyncButtonProps["children"]): value is (state: FormSyncView) => ReactNode {
  return typeof value === "function";
}

/**
 * Default Fill with AI UI. The fill flow itself is headless (`useFormSync`).
 * Pass `children` as a function, or `renderTrigger` / `renderConnect` / `renderDiff`,
 * to supply your own components. Omit them to use the built-in button and modals.
 */
export function FormSyncButton(props: FormSyncButtonProps): ReactNode {
  const ctrl = useFormSync(props);
  const view: FormSyncView = { ...ctrl, label: props.label ?? "Fill with AI" };
  const useDefaultChrome = !isRenderFn(props.children) && !props.renderTrigger;

  useEffect(() => {
    if (props.unstyled) return;
    if (isRenderFn(props.children)) return;
    injectFormSyncStyles();
  }, [props.unstyled, props.children]);

  if (isRenderFn(props.children)) {
    return <>{props.children(view)}</>;
  }

  const trigger = props.renderTrigger ? (
    props.renderTrigger(view)
  ) : (
    <button
      type="button"
      className={
        props.unstyled
          ? props.className
          : `fsync-btn${ctrl.busy ? " fsync-btn--busy" : ""}${props.className ? ` ${props.className}` : ""}`
      }
      style={props.style}
      onClick={ctrl.triggerProps.onClick}
      disabled={ctrl.triggerProps.disabled}
      aria-busy={ctrl.triggerProps["aria-busy"]}
    >
      {useDefaultChrome && !props.unstyled ? (
        <span dangerouslySetInnerHTML={{ __html: SPARKLE_SVG }} />
      ) : null}
      {props.children ?? (ctrl.busy ? ctrl.status || "Filling…" : view.label)}
    </button>
  );

  const connect = props.renderConnect ? (
    props.renderConnect(ctrl.connect)
  ) : (
    <ConnectModal
      open={ctrl.connect.open}
      detail={ctrl.connect.detail}
      onClose={ctrl.connect.close}
      onRetry={ctrl.connect.retry}
      unstyled={props.unstyled}
    />
  );

  const diff = props.renderDiff ? (
    props.renderDiff(ctrl.diff)
  ) : (
    <DiffModal
      open={ctrl.diff.open}
      diffs={ctrl.diff.diffs}
      files={ctrl.diff.files}
      onCancel={ctrl.diff.cancel}
      onConfirm={ctrl.diff.confirm}
      unstyled={props.unstyled}
    />
  );

  return (
    <>
      {trigger}
      {connect}
      {diff}
    </>
  );
}
