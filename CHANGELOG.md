# hono-cf-access

## 0.3.0

### Minor Changes

- [#13](https://github.com/paveg/hono-cf-access/pull/13) [`473b901`](https://github.com/paveg/hono-cf-access/commit/473b901183f5ec8ddb14a068899960095f01ef77) Thanks [@paveg](https://github.com/paveg)! - errors: move `type` URIs in Problem Detail responses from the unclaimed `hono-cf-access.dev` domain to `github.com/paveg/hono-cf-access` repository anchors. The previous base URL was not provably owned by the project, exposing downstream error-doc consumers to a potential typosquatting impersonation if a third party registered the domain. The new URIs are hosted on the GitHub repository README and remain dereferenceable via auto-generated heading anchors (`#country-denied`, `#asn-denied`, `#maintenance`, `#cf-unavailable`). Clients that hard-code the old URL strings will need to update.

- [#12](https://github.com/paveg/hono-cf-access/pull/12) [`390ee23`](https://github.com/paveg/hono-cf-access/commit/390ee23144d1be4dfa20a1ecc5d6cea430d79dac) Thanks [@paveg](https://github.com/paveg)! - maintenance: change default `fallback` from `"allow"` to `"deny"` to prevent silent lockdown bypass. Previously, when `allowedIps` was set and `cf-connecting-ip` could not be resolved, the request would fall through to the next handler, silently bypassing the maintenance response. The new default is fail-closed. Operators who need the old behavior can still opt in with `fallback: "allow"`. Affects `maintenance()` only; `countryBlock()` and `asnBlock()` defaults are unchanged.

## 0.2.0

### Minor Changes

- 72a1162: Extract createBlockMiddleware generic factory for shared deny/allow logic, add RFC 9457 instance field to all Problem Detail responses, and introduce DenyAllow discriminated union type for stricter type safety.

## 0.1.0

### Minor Changes

- Add IPv4 validation to prevent invalid IPs from matching CIDR ranges, reject empty deny/allow arrays at initialization, and extract shared validation helper.
