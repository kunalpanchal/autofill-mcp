#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = "https://npm.pkg.github.com";
const packages = ["packages/core", "packages/react", "packages/web", "packages/mcp-server"];

function published(name, version) {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version", "--registry", registry], {
      cwd: root,
      stdio: "pipe",
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

for (const dir of packages) {
  const pkg = JSON.parse(readFileSync(resolve(root, dir, "package.json"), "utf8"));
  const spec = `${pkg.name}@${pkg.version}`;
  if (published(pkg.name, pkg.version)) {
    process.stdout.write(`skip ${spec} (already on GitHub Packages)\n`);
    continue;
  }
  process.stdout.write(`publish ${spec}\n`);
  execFileSync(
    "pnpm",
    ["--filter", pkg.name, "publish", "--no-git-checks", "--access", "public"],
    { cwd: root, stdio: "inherit", env: process.env },
  );
}
