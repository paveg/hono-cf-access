---
"hono-cf-access": minor
---

maintenance: change default `fallback` from `"allow"` to `"deny"` to prevent silent lockdown bypass. Previously, when `allowedIps` was set and `cf-connecting-ip` could not be resolved, the request would fall through to the next handler, silently bypassing the maintenance response. The new default is fail-closed. Operators who need the old behavior can still opt in with `fallback: "allow"`. Affects `maintenance()` only; `countryBlock()` and `asnBlock()` defaults are unchanged.
