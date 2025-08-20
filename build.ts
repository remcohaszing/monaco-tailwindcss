import { $ } from "bun";

// Compile all TypeScript sources to dist, preserving the src folder structure (one file per source).
// This emits both .js and .d.ts (since declaration=true in tsconfig).
await $`bunx tsc`;

console.log(
  "Build complete: emitted JS + d.ts preserving module structure in dist/"
);
