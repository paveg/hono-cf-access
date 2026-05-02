---
"hono-cf-access": minor
---

Drop support for Node.js 20. Node 20 (Iron) reached end-of-life on 2026-04-30, so the CI matrix is reduced to Node 22 and 24, and `engines.node` is bumped from `>=20` to `>=22`.
