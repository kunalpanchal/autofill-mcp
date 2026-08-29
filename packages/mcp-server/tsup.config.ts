import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    sourcemap: true,
    clean: true,
    dts: false,
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    sourcemap: true,
    dts: true,
    target: "node20",
  },
]);
