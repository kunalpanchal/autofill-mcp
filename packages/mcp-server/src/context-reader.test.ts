import { mkdir, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encodeLocalFile } from "./context-reader.js";

describe("encodeLocalFile", () => {
  it("reads a file inside the project root", async () => {
    const root = join(tmpdir(), `formsync-safe-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const file = join(root, "logo.txt");
    await writeFile(file, "ok");
    const packed = await encodeLocalFile(file, root);
    expect(packed.filename).toBe("logo.txt");
    expect(packed.dataUrl).toMatch(/^data:text\/plain;base64,/);
  });

  it("refuses a path outside the project root", async () => {
    const root = join(tmpdir(), `formsync-root-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const outside = join(tmpdir(), `formsync-outside-${Date.now()}.txt`);
    await writeFile(outside, "secret");
    await expect(encodeLocalFile(outside, root)).rejects.toThrow(/outside the project root/);
  });

  it("refuses sensitive paths such as ssh keys", async () => {
    const ssh = join(homedir(), ".ssh", "id_ed25519");
    await expect(encodeLocalFile(ssh, tmpdir())).rejects.toThrow(/sensitive|outside the project root/);
  });

  it("refuses a symlink that escapes the project root", async () => {
    const root = join(tmpdir(), `formsync-sym-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const outside = join(tmpdir(), `formsync-secret-${Date.now()}.txt`);
    await writeFile(outside, "secret");
    const link = join(root, "logo.txt");
    await symlink(outside, link);
    await expect(encodeLocalFile(link, root)).rejects.toThrow(/outside the project root/);
  });

  it("refuses .env files even when they sit inside the project root", async () => {
    const root = join(tmpdir(), `formsync-env-${Date.now()}`);
    await mkdir(root, { recursive: true });
    const envFile = join(root, ".env");
    await writeFile(envFile, "SECRET=1");
    await expect(encodeLocalFile(envFile, root)).rejects.toThrow(/sensitive/);
  });
});
