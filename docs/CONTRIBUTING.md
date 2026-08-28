# Contributing

```bash
pnpm install
pnpm test
pnpm --filter @formsync/demo dev
```

- TypeScript strict mode is required.
- Keep browser-facing packages free of Node builtins.
- Protocol changes belong in `docs/PROTOCOL.md` and a unit test in `packages/core` or `packages/mcp-server`.
- Do not add browser-automation or CDP helpers; FormSync's contract is JSON in / JSON out.
