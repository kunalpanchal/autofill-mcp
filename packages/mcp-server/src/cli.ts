import { main } from "./index.js";

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack || err.message : err}\n`);
  process.exit(1);
});
