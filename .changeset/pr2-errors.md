---
"hono-cf-access": minor
---

feat: add `BlockConfigError` class, exported from the package root.
Validation errors from `countryBlock` / `asnBlock` now throw
`BlockConfigError` (still `instanceof Error`). Error messages now include
the offending middleware name as a prefix.
