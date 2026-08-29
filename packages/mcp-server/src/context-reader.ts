import { readFile, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

export async function readProjectContext(rootDir: string): Promise<Record<string, string>> {
  const root = resolve(rootDir);
  const files = ["package.json", "README.md", "readme.md", "pyproject.toml", "Cargo.toml", "go.mod"];
  const out: Record<string, string> = {};
  for (const file of files) {
    try {
      const contents = await readFile(resolve(root, file), "utf8");
      out[file] = contents.slice(0, 20_000);
    } catch {
      /* optional */
    }
  }
  try {
    const { stdout } = await execFileAsync("git", ["remote", "-v"], { cwd: root });
    out["git-remote"] = stdout.trim();
  } catch {
    /* optional */
  }
  try {
    const { stdout } = await execFileAsync("git", ["log", "-1", "--pretty=%s"], { cwd: root });
    out["git-head-subject"] = stdout.trim();
  } catch {
    /* optional */
  }
  return out;
}

const BLOCKED_DIR_NAMES = new Set([".ssh", ".gnupg", ".aws", ".kube", ".docker"]);
const BLOCKED_BASENAMES = new Set([
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  ".netrc",
  "credentials",
  "credentials.json",
]);

function isInsideRoot(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isSensitivePath(target: string): boolean {
  const parts = target.split(/[/\\]/);
  const base = basename(target).toLowerCase();
  if (BLOCKED_BASENAMES.has(base)) return true;
  if (base === ".env" || base.startsWith(".env.")) return true;
  return parts.some((part) => BLOCKED_DIR_NAMES.has(part));
}

export async function encodeLocalFile(
  filePath: string,
  rootDir?: string,
): Promise<{ filename: string; mimeType: string; dataUrl: string }> {
  const root = resolve(rootDir || process.cwd());
  const expanded = filePath.startsWith("~")
    ? resolve(process.env.HOME || process.env.USERPROFILE || "", filePath.slice(1))
    : resolve(filePath);
  const realRoot = await realpath(root);
  const info = await stat(expanded);
  if (!info.isFile()) throw new Error(`Not a file: ${expanded}`);
  const realFile = await realpath(expanded);
  if (!isInsideRoot(realRoot, realFile)) {
    throw new Error(`Refusing to read a file outside the project root (${realRoot})`);
  }
  if (isSensitivePath(realFile)) {
    throw new Error(`Refusing to read a sensitive path (${basename(realFile)})`);
  }
  if (info.size > 5 * 1024 * 1024) throw new Error(`File too large (max 5MB): ${basename(realFile)}`);
  const buf = await readFile(realFile);
  const ext = extname(realFile).toLowerCase();
  const mimeType = MIME[ext] || "application/octet-stream";
  return {
    filename: basename(realFile),
    mimeType,
    dataUrl: `data:${mimeType};base64,${buf.toString("base64")}`,
  };
}

export function mockFillFromContext(
  schema: { properties?: Record<string, { type?: string | string[]; maxLength?: number; format?: string; enum?: unknown[]; description?: string; title?: string }> },
  context: Record<string, string>,
): Record<string, unknown> {
  let pkg: { name?: string; description?: string; repository?: { url?: string } | string; homepage?: string; keywords?: string[] } = {};
  try {
    pkg = JSON.parse(context["package.json"] || "{}") as typeof pkg;
  } catch {
    pkg = {};
  }
  const repo =
    typeof pkg.repository === "string"
      ? pkg.repository
      : pkg.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") ||
        context["git-remote"]?.split("\n")[0]?.replace(/^origin\s+/, "").replace(/\s.*/ , "") ||
        "";
  const values: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
    const hint = `${key} ${prop.description ?? ""} ${prop.title ?? ""}`.toLowerCase();
    let value: unknown;
    if (type === "array") value = pkg.keywords?.slice(0, 6) ?? ["TypeScript"];
    else if (type === "boolean") value = true;
    else if (type === "number" || type === "integer") value = 1;
    else if (prop.enum?.length) value = prop.enum[0];
    else if (hint.includes("email")) value = "dev@example.com";
    else if (hint.includes("tagline") || hint.includes("headline")) {
      value = (pkg.description || "Fill web forms with local AI").slice(0, prop.maxLength ?? 120);
    } else if (hint.includes("name") || hint.includes("title") || hint.includes("project")) {
      value = pkg.name || "formsync";
    } else if (hint.includes("repo") || hint.includes("github") || hint.includes("url") && hint.includes("git")) {
      value = repo.startsWith("http") ? repo : repo ? `https://github.com/${repo}` : "https://github.com/example/formsync";
    } else if (prop.format === "uri" || hint.includes("url") || hint.includes("logo")) {
      value = pkg.homepage || repo || "https://example.com";
    } else if (hint.includes("description") || hint.includes("summary") || hint.includes("cover")) {
      value = (context["README.md"] || context["readme.md"] || pkg.description || "Project summary").slice(0, 800);
    } else {
      value = pkg.description || pkg.name || key;
    }
    if (typeof value === "string" && prop.maxLength) value = value.slice(0, prop.maxLength);
    values[key] = value;
  }
  return values;
}
