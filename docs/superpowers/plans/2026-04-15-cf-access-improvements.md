# hono-cf-access CRIT/IMPORTANT Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship audit findings as v0.4 (three non-breaking PRs) and v0.5 (breaking, if needed).

**Architecture:** The library is a Hono middleware package. Source in `src/`, tests in `tests/`, strict Biome + Vitest + tsup + changesets. Each PR is self-contained (docs / errors / tests) and targets a focused concern.

**Tech Stack:** TypeScript 5.6, Hono 4+, Vitest 3, Biome 1.9, tsup 8, Cloudflare Workers types, changesets.

---

## Important discoveries (read before starting)

- `src/errors.ts` **already exists** and hosts Problem Detail response helpers. Add `BlockConfigError` there (do not create a new file).
- `src/types.ts:16` **already defines** `DenyAllow<T>` as a discriminated union (`{ deny; allow?: never } | { allow; deny?: never }`). The public API `CountryBlockOptions`/`AsnBlockOptions` is already narrowed. **v0.5 PR #4 is therefore a no-op at the public API level**; the plan below folds its remaining work (internal `block.ts` `BlockOptions<T>` tightening + changeset note) into v0.4 PR #2 optionally, and otherwise cancels v0.5. Escalate to the user if this discovery changes the scope agreement.
- `src/ip.ts::isIpInCidr` does **not throw** on malformed CIDR — it returns `false`. Tests for malformed CIDR assert `false`, not `toThrow`.
- `@throws BlockConfigError` in TSDoc (PR #1) references a symbol that lands in PR #2. To keep docs honest, PR #1 writes `@throws Error` and PR #2 updates the TSDoc to `@throws BlockConfigError` as part of the same PR.

## Conventions

- Branch naming: `pr1-docs-tsdoc`, `pr2-typed-errors`, `pr3-tests-coverage`, (`pr4-breaking-union` only if user confirms).
- Commit style: conventional commits (`docs:`, `feat:`, `test:`, `chore:`). Project uses changesets — add a changeset file under `.changeset/` per PR.
- Run after each change: `pnpm typecheck && pnpm test && pnpm lint`.
- Create PR only on user confirmation, per `~/.claude/rules/workflow.md`.

---

## PR #1 — Docs & TSDoc (v0.4, non-breaking)

**Files:**
- Modify: `src/ip.ts` (add TSDoc to `getClientIp`)
- Modify: `src/maintenance.ts` (add TSDoc to `maintenance`, warn on `allowedIps`)
- Modify: `src/country-block.ts` (add TSDoc to `countryBlock`)
- Modify: `src/asn-block.ts` (add TSDoc to `asnBlock`)
- Modify: `src/cf.ts` (add TSDoc to `extractCfInfo`)
- Modify: `src/types.ts` (add `@remarks` to `CfInfo`)
- Modify: `README.md` (add Security section)
- Create: `.changeset/pr1-docs.md`

### Task 1.1: Baseline verification

- [ ] **Step 1: Run existing tests and capture baseline**

```bash
cd /Users/ryota/repos/github.com/paveg/hono-cf-access
pnpm install
pnpm typecheck && pnpm test
```
Expected: all pass.

- [ ] **Step 2: Create branch**

```bash
git checkout -b pr1-docs-tsdoc
```

### Task 1.2: TSDoc for `getClientIp`

- [ ] **Step 1: Read current `src/ip.ts:149-152`**

- [ ] **Step 2: Replace lines 149-152 with:**

```ts
/**
 * Returns the client IP from the `cf-connecting-ip` request header.
 *
 * @param c - Hono context.
 * @returns The client IP string, or `undefined` if the header is missing.
 *
 * @remarks
 * `cf-connecting-ip` is **only trustworthy inside a Cloudflare Workers
 * request context**. Outside Workers (local dev over plain HTTP, when
 * running behind a non-CF reverse proxy, or when tests inject arbitrary
 * headers) the header is caller-controllable and MUST NOT be used for
 * security decisions. Callers relying on this IP for allowlisting —
 * notably {@link maintenance} with `allowedIps` — must ensure requests
 * reach this middleware only via Cloudflare.
 */
export function getClientIp(c: Context): string | undefined {
	return c.req.header("cf-connecting-ip") ?? undefined;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```
Expected: pass.

### Task 1.3: TSDoc for `maintenance`

- [ ] **Step 1: Read `src/maintenance.ts:7`**

- [ ] **Step 2: Insert above `export function maintenance(...)`:**

```ts
/**
 * Returns a Hono middleware that blocks traffic with HTTP 503 while a
 * maintenance window is active.
 *
 * @param options - Maintenance configuration.
 * @returns A Hono middleware handler.
 *
 * @remarks
 * `options.allowedIps` uses the `cf-connecting-ip` header to identify the
 * client. See {@link getClientIp} — this is only safe inside a Cloudflare
 * Workers context. When the request does not flow through Cloudflare, the
 * header can be spoofed and the allowlist MUST NOT be relied on for
 * security.
 *
 * For JWT or Cloudflare Access service-token verification use the
 * `@hono/cloudflare-access` middleware alongside this library; JWT
 * verification is intentionally out of scope here.
 *
 * @example
 * ```ts
 * app.use(maintenance({ enabled: env.MAINTENANCE === "1" }));
 * ```
 */
export function maintenance(options: MaintenanceOptions): MiddlewareHandler {
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: pass.

### Task 1.4: TSDoc for `countryBlock`

- [ ] **Step 1: Read `src/country-block.ts`** — identify the `export` line for `countryBlock`.

- [ ] **Step 2: Insert above the export:**

```ts
/**
 * Blocks or allows requests by Cloudflare-reported country
 * (`request.cf.country`, ISO 3166-1 alpha-2).
 *
 * @param options - `{ deny }` or `{ allow }` — mutually exclusive.
 * @returns A Hono middleware handler.
 * @throws {Error} When both `deny` and `allow` are specified, when neither
 *   is specified, or when either array is empty. (Becomes `BlockConfigError`
 *   once PR #2 lands.)
 *
 * @example
 * ```ts
 * app.use(countryBlock({ deny: ["CN", "RU"] }));
 * app.use(countryBlock({ allow: ["JP", "US"] }));
 * ```
 */
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

### Task 1.5: TSDoc for `asnBlock`

- [ ] **Step 1: Read `src/asn-block.ts`**.

- [ ] **Step 2: Insert above the export:**

```ts
/**
 * Blocks or allows requests by Cloudflare-reported ASN
 * (`request.cf.asn`).
 *
 * @param options - `{ deny }` or `{ allow }` — mutually exclusive.
 * @returns A Hono middleware handler.
 * @throws {Error} Same validation rules as {@link countryBlock}.
 *   (Becomes `BlockConfigError` once PR #2 lands.)
 *
 * @example
 * ```ts
 * app.use(asnBlock({ deny: [4134, 4837] }));
 * ```
 */
```

- [ ] **Step 3: Typecheck**

### Task 1.6: TSDoc for `extractCfInfo`

- [ ] **Step 1: Read `src/cf.ts`** — locate `extractCfInfo`.

- [ ] **Step 2: Insert above its export:**

```ts
/**
 * Extracts the supported subset of {@link CfInfo} from a request's
 * `request.cf` properties, or returns `undefined` if `request.cf` is
 * missing (e.g. local dev without CF runtime).
 *
 * @param req - A `Request` with optional Cloudflare `cf` properties.
 * @returns {@link CfInfo} or `undefined`.
 */
```

### Task 1.7: `CfInfo` `@remarks`

- [ ] **Step 1: Edit `src/types.ts` — replace the `export interface CfInfo { ... }` block with:**

```ts
/**
 * Subset of `IncomingRequestCfProperties` this library surfaces on the
 * Hono context.
 *
 * @remarks
 * Intentionally omitted fields include `tlsVersion`, `clientTcpRtt`,
 * `metalocation`, `requestPriority`, and other transport-level details.
 * Scope is restricted to geographic and network-identity data relevant to
 * access control; widen the type explicitly if you need more.
 */
export interface CfInfo {
	country?: string;
	asn?: number;
	city?: string;
	region?: string;
	regionCode?: string;
	continent?: string;
	latitude?: string;
	longitude?: string;
	timezone?: string;
	postalCode?: string;
}
```

### Task 1.8: README Security section

- [ ] **Step 1: Read `README.md`** — find a good insertion point (before "Examples" or after "Middlewares").

- [ ] **Step 2: Add a `## Security` section. Include these sub-points verbatim as prose (not as a literal bullet copy — phrase naturally):**

  - **Trust boundary for `cf-connecting-ip`**: This header is set by Cloudflare and is reliable only when the request actually reaches your Worker via Cloudflare. Outside that context (local dev over plain HTTP, a non-CF reverse proxy, test harnesses) the header is caller-controllable. `maintenance({ allowedIps })` depends on this header — do not rely on it for security unless your deployment guarantees CF-terminated requests.
  - **IP allowlist syntax**: `allowedIps` accepts bare IPv4/IPv6 addresses and CIDR blocks. IPv6 zone IDs (`fe80::1%eth0`) and IPv4-mapped IPv6 (`::ffff:192.0.2.1`) are normalised before matching.
  - **Malformed CIDR entries** (e.g. `192.168.1.0/33`, `not:a:cidr/64`) silently never match. Audit your allowlist — a typo is a fail-open for that entry only.
  - **Fail-closed on misconfiguration**: `fallback` defaults to `"allow"` for country/ASN blocks and `"deny"` for `maintenance` when `cf` metadata is absent. If you need a stricter posture, set `fallback: "deny"` on country/ASN blocks too.
  - **JWT & service tokens are out of scope**: Use `@hono/cloudflare-access` alongside this library for Access JWT verification and service-token identity. Treating header presence as proof of identity without signature verification is unsafe.

### Task 1.9: Changeset + commit

- [ ] **Step 1: Create `.changeset/pr1-docs.md`:**

```md
---
"hono-cf-access": patch
---

docs: add TSDoc to public API, `CfInfo` remarks, and README Security section.
No API changes.
```

- [ ] **Step 2: Verify everything**

```bash
pnpm typecheck && pnpm test && pnpm lint
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/ README.md .changeset/pr1-docs.md
git commit -m "$(cat <<'EOF'
docs: add TSDoc for public API and README Security section

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push + PR (only with user confirmation)**

---

## PR #2 — Typed Errors (v0.4, non-breaking)

**Files:**
- Modify: `src/errors.ts` (add `BlockConfigError` class)
- Modify: `src/validation.ts` (throw `BlockConfigError`, accept middleware name)
- Modify: `src/block.ts` (pass middleware name to validation)
- Modify: `src/country-block.ts` (pass `"countryBlock"` when calling `createBlockMiddleware`)
- Modify: `src/asn-block.ts` (pass `"asnBlock"` when calling `createBlockMiddleware`)
- Modify: `src/index.ts` (re-export `BlockConfigError`)
- Modify: `src/country-block.ts` + `src/asn-block.ts` TSDoc (`@throws {Error}` → `@throws {BlockConfigError}`)
- Create: `tests/errors.test.ts`
- Create: `.changeset/pr2-errors.md`

### Task 2.1: Branch

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b pr2-typed-errors
```

### Task 2.2: Red — test `BlockConfigError`

- [ ] **Step 1: Create `tests/errors.test.ts`:**

```ts
import { describe, expect, it } from "vitest";
import { BlockConfigError } from "../src/errors";
import { countryBlock } from "../src/country-block";
import { asnBlock } from "../src/asn-block";

describe("BlockConfigError", () => {
	it("is an Error subclass with the expected name", () => {
		const e = new BlockConfigError("msg", "countryBlock");
		expect(e).toBeInstanceOf(Error);
		expect(e).toBeInstanceOf(BlockConfigError);
		expect(e.name).toBe("BlockConfigError");
		expect(e.middleware).toBe("countryBlock");
	});

	it("countryBlock throws BlockConfigError with middleware prefix when both deny and allow given", () => {
		expect(() =>
			countryBlock({ deny: ["CN"], allow: ["JP"] } as never),
		).toThrow(BlockConfigError);
		expect(() =>
			countryBlock({ deny: ["CN"], allow: ["JP"] } as never),
		).toThrow(/countryBlock:/);
	});

	it("asnBlock throws BlockConfigError when neither deny nor allow specified", () => {
		expect(() => asnBlock({} as never)).toThrow(BlockConfigError);
		expect(() => asnBlock({} as never)).toThrow(/asnBlock:/);
	});

	it("countryBlock throws BlockConfigError on empty deny array", () => {
		expect(() => countryBlock({ deny: [] })).toThrow(BlockConfigError);
		expect(() => countryBlock({ deny: [] })).toThrow(/countryBlock:/);
	});
});
```

- [ ] **Step 2: Run and verify it FAILS**

```bash
pnpm test tests/errors.test.ts
```
Expected: fails — `BlockConfigError` not exported.

### Task 2.3: Green — add `BlockConfigError` to `src/errors.ts`

- [ ] **Step 1: Append to `src/errors.ts` (above or below existing code, keep problem-detail helpers in place):**

```ts
export type BlockMiddlewareName = "countryBlock" | "asnBlock" | "maintenance";

export class BlockConfigError extends Error {
	readonly middleware: BlockMiddlewareName;

	constructor(message: string, middleware: BlockMiddlewareName) {
		super(`${middleware}: ${message}`);
		this.name = "BlockConfigError";
		this.middleware = middleware;
	}
}
```

- [ ] **Step 2: Add export in `src/index.ts`:**

Replace line 1-7 of `src/index.ts` with:

```ts
export { countryBlock } from "./country-block";
export { asnBlock } from "./asn-block";
export { maintenance } from "./maintenance";
export { extractCfInfo } from "./cf";
export { BlockConfigError } from "./errors";

export type {
	CfInfo,
	CountryBlockOptions,
	AsnBlockOptions,
	MaintenanceOptions,
} from "./types";
export type { BlockMiddlewareName } from "./errors";
```

### Task 2.4: Green — update `validation.ts`

- [ ] **Step 1: Replace the entire `src/validation.ts` with:**

```ts
import { BlockConfigError, type BlockMiddlewareName } from "./errors";

/**
 * Validates deny/allow options shared by countryBlock and asnBlock.
 *
 * @throws {BlockConfigError} When both specified, neither specified, or
 *   either is an empty array. The error's `middleware` field identifies
 *   the caller.
 */
export function validateDenyAllowOptions(
	deny: unknown[] | undefined,
	allow: unknown[] | undefined,
	middleware: BlockMiddlewareName,
): void {
	if (deny && allow) {
		throw new BlockConfigError(
			'cannot specify both "deny" and "allow" — use one or the other',
			middleware,
		);
	}
	if (!deny && !allow) {
		throw new BlockConfigError(
			'either "deny" or "allow" must be specified',
			middleware,
		);
	}
	if (deny?.length === 0 || allow?.length === 0) {
		throw new BlockConfigError("deny/allow must not be empty", middleware);
	}
}
```

### Task 2.5: Green — propagate middleware name through `block.ts`

- [ ] **Step 1: Edit `src/block.ts` — replace the `createBlockMiddleware` signature and validation call:**

Change the `BlockConfig<T>` interface to include the middleware name, and update the factory:

```ts
import type { Context, MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { cfUnavailableResponse, type BlockMiddlewareName } from "./errors";
import type { CfInfo } from "./types";
import { validateDenyAllowOptions } from "./validation";

interface BlockConfig<T> {
	name: BlockMiddlewareName;
	extractValue: (info: CfInfo) => T | undefined;
	defaultResponse: (value: T, c: Context) => Response;
	normalize?: (items: T[]) => T[];
}

interface BlockOptions<T> {
	deny?: T[];
	allow?: T[];
	fallback?: "allow" | "deny";
	onDenied?: (c: Context) => Response | Promise<Response>;
}

export function createBlockMiddleware<T>(config: BlockConfig<T>) {
	return (options: BlockOptions<T>): MiddlewareHandler => {
		validateDenyAllowOptions(options.deny, options.allow, config.name);
		// …rest of body unchanged
```

Keep the rest of the function body as-is.

### Task 2.6: Green — update callers

- [ ] **Step 1: Read `src/country-block.ts`**, update the `createBlockMiddleware` call to include `name: "countryBlock"` in the config object.

- [ ] **Step 2: Do the same in `src/asn-block.ts` with `name: "asnBlock"`.**

### Task 2.7: Update TSDoc from PR #1 to reference `BlockConfigError`

- [ ] **Step 1: In `src/country-block.ts` and `src/asn-block.ts`, change**

```ts
* @throws {Error} ... (Becomes `BlockConfigError` once PR #2 lands.)
```
to
```ts
* @throws {BlockConfigError} When both `deny` and `allow` are specified,
 *   when neither is specified, or when either array is empty.
```

### Task 2.8: Verify green

- [ ] **Step 1: Run**

```bash
pnpm typecheck && pnpm test && pnpm lint
```
Expected: all pass, new `tests/errors.test.ts` green, existing tests still green.

### Task 2.9: Changeset + commit

- [ ] **Step 1: Create `.changeset/pr2-errors.md`:**

```md
---
"hono-cf-access": minor
---

feat: add `BlockConfigError` class, exported from the package root.
Validation errors from `countryBlock` / `asnBlock` now throw
`BlockConfigError` (still `instanceof Error`). Error messages now include
the offending middleware name as a prefix.
```

- [ ] **Step 2: Commit**

```bash
git add src/ tests/errors.test.ts .changeset/pr2-errors.md
git commit -m "$(cat <<'EOF'
feat: add typed BlockConfigError with middleware context

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## PR #3 — Tests & Coverage Honesty (v0.4, non-breaking)

**Files:**
- Modify: `vitest.config.ts` (remove `src/index.ts` from coverage exclude)
- Modify: `tests/ip.test.ts` (edge cases)
- Modify: `tests/integration.test.ts` (chaining + response shape checks)
- Create: `.changeset/pr3-tests.md`

### Task 3.1: Branch + baseline

- [ ] **Step 1:**

```bash
git checkout main && git pull
git checkout -b pr3-tests-coverage
pnpm test --coverage
```

Capture the current coverage number for comparison.

### Task 3.2: Remove `src/index.ts` from coverage exclude

- [ ] **Step 1: Edit `vitest.config.ts` — change**

```ts
exclude: ["src/index.ts", "src/types.ts"],
```
to
```ts
exclude: ["src/types.ts"],
```

- [ ] **Step 2: Run coverage**

```bash
pnpm test --coverage
```
Expected: pass, coverage still 100% (re-exports are executed by existing tests).

If coverage drops below 100%, add a one-line smoke test to `tests/integration.test.ts`:

```ts
import * as pkg from "../src/index";
it("package root exports expected symbols", () => {
	expect(typeof pkg.countryBlock).toBe("function");
	expect(typeof pkg.asnBlock).toBe("function");
	expect(typeof pkg.maintenance).toBe("function");
	expect(typeof pkg.extractCfInfo).toBe("function");
});
```

### Task 3.3: Red — IPv6 edge-case tests

- [ ] **Step 1: Read `tests/ip.test.ts` to match existing style, then append:**

```ts
describe("ip edge cases", () => {
	it("strips IPv6 zone ID before matching", () => {
		expect(isIpInCidr("fe80::1%eth0", "fe80::/10")).toBe(true);
	});

	it("matches IPv4-mapped IPv6 against IPv4 CIDR", () => {
		expect(isIpInCidr("::ffff:192.0.2.1", "192.0.2.0/24")).toBe(true);
	});

	it("matches IPv4-mapped IPv6 against IPv6 CIDR", () => {
		expect(isIpInCidr("::ffff:192.0.2.1", "::ffff:0:0/96")).toBe(false); // normalized to IPv4, family mismatches
	});

	it("rejects malformed CIDR prefix > 32 for IPv4 without throwing", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/33")).toBe(false);
	});

	it("rejects CIDR with negative prefix", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/-1")).toBe(false);
	});

	it("rejects CIDR with non-numeric prefix", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/abc")).toBe(false);
	});

	it("rejects malformed IPv6 CIDR network", () => {
		expect(isIpInCidr("::1", "not:a:valid::cidr/64")).toBe(false);
	});

	it("rejects IPv6 CIDR with prefix > 128", () => {
		expect(isIpInCidr("::1", "::/129")).toBe(false);
	});
});
```

Make sure the import line at top of file already exports `isIpInCidr` — if not, adjust.

- [ ] **Step 2: Run**

```bash
pnpm test tests/ip.test.ts
```
Expected: most pass immediately (behavior exists) — if any fail, they reveal a real bug. Investigate before adjusting the assertion.

### Task 3.4: Integration chaining tests

- [ ] **Step 1: Append to `tests/integration.test.ts`:**

```ts
describe("short-circuit and response shape", () => {
	it("does not invoke downstream middleware after a block", async () => {
		const app = new Hono();
		let asnWasCalled = false;
		app.use(
			"/api/*",
			countryBlock({ deny: ["CN"] }),
			async (c, next) => {
				asnWasCalled = true;
				return next();
			},
		);
		app.get("/api/data", ok);
		const res = await app.request(createCfRequest("/api/data", { country: "CN" }));
		expect(res.status).toBe(403);
		expect(asnWasCalled).toBe(false);
	});

	it("block response has Problem Detail shape", async () => {
		const app = new Hono();
		app.use("/api/*", countryBlock({ deny: ["CN"] }));
		app.get("/api/data", ok);
		const res = await app.request(createCfRequest("/api/data", { country: "CN" }));
		expect(res.headers.get("content-type")).toBe("application/problem+json");
		const body = await res.json();
		expect(body).toMatchObject({
			type: expect.stringContaining("country-denied"),
			title: "Forbidden",
			status: 403,
			detail: expect.stringContaining("CN"),
			instance: "/api/data",
		});
	});

	it("maintenance returns retry-after header", async () => {
		const app = new Hono();
		app.use("/*", maintenance({ enabled: true, retryAfter: 120 }));
		app.get("/", ok);
		const res = await app.request(createCfRequest("/"));
		expect(res.status).toBe(503);
		expect(res.headers.get("retry-after")).toBe("120");
	});
});
```

- [ ] **Step 2: Run**

```bash
pnpm test tests/integration.test.ts
```
Expected: all pass.

### Task 3.5: Full verify

- [ ] **Step 1:**

```bash
pnpm typecheck && pnpm test --coverage && pnpm lint
```
Expected: all pass, 100% coverage (with `src/index.ts` now included).

### Task 3.6: Changeset + commit

- [ ] **Step 1: Create `.changeset/pr3-tests.md`:**

```md
---
"hono-cf-access": patch
---

test: include `src/index.ts` in coverage and add IPv6 / malformed-CIDR
edge-case tests and middleware-chaining assertions.
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts tests/ .changeset/pr3-tests.md
git commit -m "$(cat <<'EOF'
test: cover index re-exports, IPv6 edges, and chaining

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## PR #4 — v0.5 Breaking Change (CONDITIONAL)

**Status:** Likely not needed. `src/types.ts:16` already defines `DenyAllow<T>` as a discriminated union, so the public API already type-errors on `{ deny, allow }` simultaneous specification. Confirm with the user before starting this PR. If confirmed not needed, skip to "Close-out" below.

**If the user still wants a v0.5:** the only remaining work is tightening the **internal** `BlockOptions<T>` in `src/block.ts:13-18` to match the discriminated union. That is internal and not user-visible, so it would ship as a `patch` — not a breaking release.

**Escalate to the user:** "Based on code inspection, `CountryBlockOptions` and `AsnBlockOptions` are already discriminated unions in `src/types.ts:16`. v0.5 PR #4 appears unnecessary. Proceed without it, or is there a narrower breaking change you had in mind?"

---

## Close-out

- [ ] **Step 1: Push PRs in order #1 → #2 → #3**, each with user confirmation.
- [ ] **Step 2: After merge, bump version via changeset tooling:**

```bash
pnpm version-packages
```

This will consume the changesets and create a version bump commit.

---

## Self-review (completed inline while writing the plan)

- **Spec coverage:** A1 (Task 1.2, 1.3, 1.8), A2 (Task 1.8), A3 (Tasks 1.2–1.6, 2.7), D10 (Task 1.7), B5a (Task 2.3), B5b (Task 2.4–2.6), C7 (Task 3.2), C8 (Task 3.3), C9 (Task 3.4), B4 (deferred — PR #4 flagged as likely unnecessary with escalation text).
- **Placeholder scan:** No "TBD" / "TODO" / "implement later" in the body. The one place where Task 1.8 uses prose bullet list as *source material* for README prose is explicit, not a placeholder.
- **Type consistency:** `BlockMiddlewareName` spelled consistently in errors.ts, validation.ts, block.ts. `BlockConfigError.middleware` defined in Task 2.3, asserted in Task 2.2 — match.
