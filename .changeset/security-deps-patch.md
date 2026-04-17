---
"hono-cf-access": patch
---

chore(deps): patch all open Dependabot alerts by bumping `hono` devDep to
4.12.14 and forcing patched transitive versions of `vite` (>= 6.4.2),
`esbuild` (>= 0.25.0), and `picomatch` (>= 2.3.2 / >= 4.0.4) via
`pnpm.overrides`. All fixes are dev-only; `peerDependencies.hono` stays
at `>=4.0.0` — no consumer-facing API change.
