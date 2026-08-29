#!/usr/bin/env node
/**
 * Fails if any file under the given directory contains an em dash, or a
 * common encoding that would render as one in the browser.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node assert-no-emdash.mjs <dir>");
  process.exit(1);
}

const checks = [
  { label: "U+2014 em dash", re: /\u2014/g },
  { label: "HTML entity &mdash;", re: /&mdash;/gi },
  { label: "HTML numeric em dash", re: /&#(?:8212|x2014);/gi },
  { label: "JS/CSS unicode escape \\u2014", re: /\\u2014/gi },
];

const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    const buf = readFileSync(full);
    if (buf.includes(0)) continue;
    const text = buf.toString("utf8");
    for (const check of checks) {
      check.re.lastIndex = 0;
      if (!check.re.test(text)) continue;
      check.re.lastIndex = 0;
      const match = check.re.exec(text);
      const idx = match ? match.index : 0;
      const line = text.slice(0, idx).split("\n").length;
      hits.push(`${full}:${line} (${check.label})`);
    }
  }
}

walk(root);

if (hits.length) {
  console.error("Em dash found in GitHub Pages output:");
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

console.log(`No em dashes in ${root}`);
