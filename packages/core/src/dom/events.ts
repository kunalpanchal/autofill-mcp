/**
 * Framework-aware DOM value assignment.
 *
 * Setting `element.value = ...` does not notify React/Vue because they install
 * their own value trackers. We call the native HTMLInputElement/TextArea
 * prototype setter, then dispatch bubbling `input` and `change` events.
 */

function nativeValueSetter(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    element instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  const tracker = (element as unknown as { _valueTracker?: { setValue: (v: string) => void } })
    ._valueTracker;
  tracker?.setValue("");
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function nativeCheckedSetter(element: HTMLInputElement, checked: boolean): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "checked",
  );
  const tracker = (element as unknown as { _valueTracker?: { setValue: (v: string) => void } })
    ._valueTracker;
  tracker?.setValue(checked ? "false" : "true");
  if (descriptor?.set) {
    descriptor.set.call(element, checked);
  } else {
    element.checked = checked;
  }
}

export function dispatchInputEvents(element: Element): void {
  element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
}

export function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  nativeValueSetter(element, value);
  dispatchInputEvents(element);
}

export function setNativeChecked(element: HTMLInputElement, checked: boolean): void {
  nativeCheckedSetter(element, checked);
  dispatchInputEvents(element);
}

export function setSelectValue(element: HTMLSelectElement, value: string | string[]): void {
  if (element.multiple && Array.isArray(value)) {
    const wanted = new Set(value.map(String));
    for (const option of Array.from(element.options)) {
      option.selected = wanted.has(option.value);
    }
  } else {
    const stringValue = Array.isArray(value) ? String(value[0] ?? "") : String(value);
    element.value = stringValue;
  }
  dispatchInputEvents(element);
}

export function setContentEditable(element: HTMLElement, value: string): void {
  element.textContent = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
