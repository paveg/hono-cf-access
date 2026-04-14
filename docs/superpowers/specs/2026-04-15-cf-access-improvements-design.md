# Design: hono-cf-access CRIT/IMPORTANT Improvements

- **Date**: 2026-04-15
- **Status**: Accepted
- **Scope**: Address CRITICAL and IMPORTANT findings from the 2026-04-15 audit of `hono-cf-access`.

## Goals

1. Close the documented security gap around `cf-connecting-ip` trust assumptions.
2. Improve API ergonomics (typed errors, contextual messages) without breaking existing callers.
3. Raise the integrity of the `100% coverage` claim and plug IPv6 / CIDR edge case holes.
4. Move deny/allow mutual exclusion from runtime-only to the type system (breaking).

## Non-Goals

- JWT verification. This library remains a geo/IP access middleware based on `request.cf`.
- Service token handling. Out of scope — JWT verification (e.g. `@hono/cloudflare-access`) is the correct layer for service token identity. README will direct users there.
- Unrelated refactoring of modules not touched by these findings.

## Release Strategy

Two SemVer releases, four PRs total:

- **v0.4 — non-breaking, additive (3 PRs)**
- **v0.5 — breaking change (1 PR)**

Rationale: keeping the `deny`/`allow` type narrowing in its own release produces a clean CHANGELOG, lets users adopt docs/errors/tests without migration pressure, and makes the v0.5 upgrade a focused type-only diff.

---

## v0.4 PR #1 — Docs & TSDoc

### Changes

- `src/ip.ts` `getClientIp()`: add TSDoc `@remarks` stating that `cf-connecting-ip` is only trustworthy inside a Cloudflare Workers request context; outside Workers (local dev over plain HTTP, reverse proxies) the header is caller-controllable.
- `src/maintenance.ts`: mirror the warning on the IP allowlist option.
- Public API TSDoc (`countryBlock`, `asnBlock`, `maintenance`, `extractCfInfo`): `@param`, `@returns`, `@throws BlockConfigError`, `@example`. `@throws` is documented even in v0.4 because the concrete error type ships in PR #2; readers benefit from the contract up front.
- `src/types.ts` `CfInfo`: `@remarks` listing intentionally-omitted `request.cf` fields (e.g. `tlsVersion`, `clientTcpRtt`, `metalocation`) and the reasoning (not relevant to geo/IP access control).
- `README.md`: new **Security** section covering
  - IP header trust boundary (CF Workers only).
  - CIDR syntax + IPv6 support scope.
  - Fail-closed behavior on misconfiguration.
  - Pointer to `@hono/cloudflare-access` for JWT / service token verification.

### Why

A1 (`cf-connecting-ip` trust) is CRITICAL because a user reading only the README can deploy `maintenance({ allowedIps })` behind an untrusted proxy and believe it is an allowlist. Making the constraint visible at the call site (TSDoc) and in discovery docs (README) is the cheapest mitigation.

### Verification

- TSDoc renders cleanly in TypeScript language server hovers (manual check in VS Code).
- `pnpm build` produces `.d.ts` containing the TSDoc comments.
- README links resolve.

---

## v0.4 PR #2 — Typed Errors

### Changes

- New `src/errors.ts`: `export class BlockConfigError extends Error` with `name = 'BlockConfigError'` and optional `middleware` field.
- Re-export from `src/index.ts`.
- `src/validation.ts`: throw `BlockConfigError` instead of generic `Error`. Accept a `middleware` name parameter (`'countryBlock'` | `'asnBlock'` | `'maintenance'`) and prefix it in the message: `"countryBlock: cannot specify both deny and allow"`.
- Call sites in `src/block.ts` and `src/maintenance.ts` pass their middleware name.

### Backward compatibility

`BlockConfigError extends Error`, so:

- Existing `try { … } catch (e) { if (e instanceof Error) … }` still works.
- Error messages change (now prefixed) — this is a string surface, not a typed API. Documented in CHANGELOG as an additive change, not breaking.

### Why

B5a and B5b raise the signal for consumers debugging misconfiguration, and prepare the ground for v0.5 where `BlockConfigError` becomes the sole throw type.

### Verification

- Existing tests still pass (generic `Error` catch paths unaffected).
- New tests assert `instanceof BlockConfigError` and message prefix per middleware.

---

## v0.4 PR #3 — Tests & Coverage Honesty

### Changes

- `vitest.config.ts`: remove `src/index.ts` from coverage `exclude`. Keep `src/types.ts` excluded (type-only file, Istanbul naturally reports no executable lines; excluding it avoids noise without inflating the metric).
- `tests/ip.test.ts` additions:
  - IPv6 zone ID stripping: `fe80::1%eth0` normalizes to `fe80::1`.
  - IPv4-mapped IPv6: `::ffff:192.0.2.1` matches CIDR `192.0.2.0/24` and `::ffff:0:0/96`.
  - Malformed CIDR rejection: `192.168.1.0/33`, `10.0.0.0/-1`, `not:a:valid::cidr/64`, `192.168.1.0/abc`. Each should throw `BlockConfigError` (after PR #2 merges) or `Error` (if PR #3 merges first — tests assert `Error`, upgraded to `BlockConfigError` after rebase).
- `tests/integration.test.ts` additions:
  - Chain `countryBlock` + `asnBlock` + `maintenance` and assert short-circuit order (first denial wins, downstream middleware not invoked).
  - Block response shape (status, headers, Problem Detail body) under each middleware.

### Why

C7 restores the honesty of the 100% claim (index.ts is real code: the public surface). C8 covers the IPv6 surface area that `src/ip.ts` normalization actually handles but does not test. C9 proves the composition contract users rely on.

### Verification

- `pnpm test --coverage` shows 100% for included files, and `src/index.ts` contributes ≥1 covered statement.
- New tests fail on `main` and pass after changes (red-green-refactor).

### Merge order

Prefer PR #2 before PR #3 so invalid-CIDR tests assert `BlockConfigError` directly. If ordering slips, PR #3 asserts `Error` and gets tightened in a follow-up.

---

## v0.5 PR #4 — Breaking: deny/allow Discriminated Union

### Changes

- `src/types.ts`: replace

  ```ts
  type BlockOptions<T> = { deny?: T[]; allow?: T[]; … };
  ```

  with

  ```ts
  type BlockOptions<T> =
    | ({ deny: readonly T[]; allow?: never } & BaseOptions)
    | ({ allow: readonly T[]; deny?: never } & BaseOptions);
  ```

  `{ deny, allow }` simultaneous specification becomes a type error at the call site.

- Keep the runtime `validateDenyAllowOptions` check and its `BlockConfigError` throw. Users who bypass the type system (e.g. via `as any`, dynamic config) still get a deterministic failure.
- CHANGELOG: migration guide with before/after snippets showing how a caller who passed both should split into two middleware chains or pick one.

### Why

B4. The current runtime-only enforcement gives no IDE feedback until a request lands. Narrowing the type catches the mistake at build time and documents the intent statically.

### Verification

- TypeScript compile error on `{ deny: [...], allow: [...] }` (expected, demonstrated in test via `@ts-expect-error`).
- Runtime test for `as any` bypass still throws `BlockConfigError`.

---

## Out of Scope / Rejected

- **B6 service tokens**: rejected. Safe service token handling requires JWT signature verification; a header-existence check would be security theatre. README points users to `@hono/cloudflare-access`.
- **Clock skew, timing-attack hardening for list lookups**: not applicable to current scope (no token expiry, `Set.has()` is already constant-time for typical sizes).

## Risks

- **PR #2 message-prefix change** could break consumers who string-match error messages. Low likelihood (internal misconfiguration errors), documented in CHANGELOG.
- **PR #4 type narrowing** may surface latent bugs in user code where both fields were passed and silently one won. This is the intended outcome; migration guide covers it.

## References

- Audit report: conversation on 2026-04-15.
- `~/.claude/rules/harness-engineering.md` — generator-evaluator separation, review discipline.
- `~/.claude/rules/development-principles.md` — simplicity, honesty, no over-engineering.
