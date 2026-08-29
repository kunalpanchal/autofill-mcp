import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this repo at /autofill-mcp/
  base: process.env.GITHUB_PAGES === "true" ? "/autofill-mcp/" : "/",
  plugins: [
    react(),
    {
      name: "github-pages-404",
      closeBundle() {
        const outDir = resolve("dist");
        copyFileSync(resolve(outDir, "index.html"), resolve(outDir, "404.html"));
      },
    },
  ],
  server: { port: 5180 },
});
