/**
 * Convert a data URL into a File and attach it to an <input type="file">
 * via DataTransfer, then fire change/input so frameworks pick it up.
 */

export function dataUrlToFile(dataUrl: string, filename: string, mimeType?: string): File {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const mime = mimeType || match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  const bytes = isBase64 ? base64ToBytes(payload) : Uint8Array.from(unescape(payload), (c) => c.charCodeAt(0));
  return new File([bytes as BlobPart], filename, { type: mime });
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function attachFiles(input: HTMLInputElement, files: File[]): void {
  const dt = new DataTransfer();
  for (const file of files) dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function isLikelyLocalPath(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("file:") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    value.startsWith("~")
  );
}
