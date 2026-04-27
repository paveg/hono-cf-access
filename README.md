# hono-cf-access

[![npm version](https://img.shields.io/npm/v/hono-cf-access)](https://www.npmjs.com/package/hono-cf-access)
[![CI](https://github.com/paveg/hono-cf-access/actions/workflows/ci.yml/badge.svg)](https://github.com/paveg/hono-cf-access/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/paveg/hono-cf-access?utm_source=oss&utm_medium=github&utm_campaign=paveg%2Fhono-cf-access&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai)
[![Devin Wiki](https://img.shields.io/badge/Devin-Wiki-blue)](https://app.devin.ai/org/ryota-ikezawa/wiki/paveg/hono-cf-access)

Access control middleware for [Hono](https://hono.dev/) leveraging Cloudflare Workers' `request.cf` properties.

Add country blocking, ASN blocking, and maintenance mode to any route with a single line.

## Features

- **`request.cf` native** — Uses geo data Cloudflare Workers provides for free
- **Declarative API** — Declare deny/allow lists, no hand-written conditionals
- **Three middlewares** — `countryBlock()`, `asnBlock()`, `maintenance()`
- **RFC 9457 compliant** — `application/problem+json` error responses
- **Customizable** — `onDenied` / `onMaintenance` escape hatches for custom responses
- **`fallback` option** — Controls behavior when `request.cf` is undefined (local dev)
- **`cfInfo` context variable** — Normalized geo data accessible from handlers
- **Zero external dependencies** — Only requires Hono as a peer dependency

## Install

```bash
npm install hono-cf-access
```

## Usage

### Country Blocking

```ts
import { Hono } from 'hono'
import { countryBlock } from 'hono-cf-access'

const app = new Hono()

// Deny access from specific countries
app.use('/api/*', countryBlock({
  deny: ['CN', 'RU'],
}))

// Or allow only specific countries
app.use('/api/*', countryBlock({
  allow: ['JP', 'US', 'GB'],
}))
```

### ASN Blocking

```ts
import { asnBlock } from 'hono-cf-access'

// Deny access from specific ASNs
app.use('/api/*', asnBlock({
  deny: [4134, 4837],
}))

// Or allow only specific ASNs
app.use('/api/*', asnBlock({
  allow: [13335, 209242],
}))
```

### Maintenance Mode

```ts
import { maintenance } from 'hono-cf-access'

// Static toggle
app.use('/api/*', maintenance({
  enabled: true,
}))

// Dynamic toggle via KV
app.use('/api/*', maintenance({
  enabled: async (c) => {
    const kv = c.env.MAINTENANCE_KV as KVNamespace
    return (await kv.get('maintenance_mode')) === 'true'
  },
}))

// With IP allowlist for admin access
app.use('/api/*', maintenance({
  enabled: true,
  allowedIps: [
    '203.0.113.50',
    '192.168.1.0/24',
  ],
  retryAfter: 3600,
}))
```

### Middleware Chaining

```ts
app.use('/api/*',
  countryBlock({ deny: ['CN', 'RU'] }),
  asnBlock({ deny: [4134] }),
  maintenance({ enabled: async (c) => { /* ... */ } }),
)
```

Each middleware operates independently. If one denies the request, subsequent ones are not executed.

### Accessing Geo Data

All middlewares set a `cfInfo` context variable with normalized geo data:

```ts
app.get('/api/info', (c) => {
  const info = c.get('cfInfo')
  // info.country  → 'JP'
  // info.asn      → 13335
  // info.city     → 'Tokyo'
  // info.timezone → 'Asia/Tokyo'
  return c.json(info)
})
```

### Custom Error Responses

```ts
countryBlock({
  deny: ['CN'],
  onDenied: (c) => c.html('<h1>Access Denied</h1>', 403),
})

maintenance({
  enabled: true,
  onMaintenance: (c) => c.html('<h1>Under Maintenance</h1>', 503),
})
```

## Security

### Trust boundary for `cf-connecting-ip`

The `cf-connecting-ip` header is injected by Cloudflare and is reliable only when the request actually reaches your Worker through Cloudflare's network. Outside that boundary — local development over plain HTTP, a non-Cloudflare reverse proxy, or test harnesses — the header is caller-controllable. The `maintenance({ allowedIps })` option depends on this header to grant bypass access, so do not rely on it for security unless your deployment guarantees that all traffic is CF-terminated.

### IP allowlist syntax

`allowedIps` accepts bare IPv4 and IPv6 addresses as well as CIDR blocks (e.g. `192.168.1.0/24`, `2001:db8::/32`). IPv6 zone IDs (`fe80::1%eth0`) and IPv4-mapped IPv6 addresses (`::ffff:192.0.2.1`) are normalised before matching, so you can use standard notation without worrying about representation differences.

### Malformed CIDR entries

A malformed CIDR entry (e.g. `192.168.1.0/33` or `not:a:cidr/64`) silently never matches any address. It does not throw — the entry is simply skipped, and no IP is granted a match by it. Audit your allowlist carefully: a typo in an admin CIDR will lock out that admin with no error.

### Fail-closed on misconfiguration

For `maintenance`, `fallback` defaults to `"deny"` when the client IP cannot be resolved and `allowedIps` is set, preventing an accidental lockdown bypass. For `countryBlock` and `asnBlock`, `fallback` defaults to `"allow"` (permissive) when Cloudflare's `cf` metadata is absent — for example during local development. Set `fallback: "deny"` on those middlewares too if you need a stricter posture in environments where CF data may be unavailable.

### JWT and service tokens are out of scope

This library performs access control based on Cloudflare-supplied geo and network data. It does not verify Cloudflare Access JWT tokens or service-token headers. Treating the mere presence of a header as proof of identity, without cryptographic signature verification, is unsafe. Use [`@hono/cloudflare-access`](https://github.com/honojs/middleware/tree/main/packages/cloudflare-access) alongside this library if you need Access JWT verification or service-token identity.

## API

### `countryBlock(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deny` | `string[]` | — | Country codes to deny (ISO 3166-1 alpha-2) |
| `allow` | `string[]` | — | Country codes to allow. All others denied |
| `fallback` | `'allow' \| 'deny'` | `'allow'` | Behavior when `request.cf` is undefined |
| `onDenied` | `(c: Context) => Response` | — | Custom response for denied requests |

> Throws [`BlockConfigError`](#blockconfigerror) at initialization if `deny` and `allow` are both specified, neither is specified, or either is an empty array.

### `asnBlock(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deny` | `number[]` | — | ASN numbers to deny |
| `allow` | `number[]` | — | ASN numbers to allow. All others denied |
| `fallback` | `'allow' \| 'deny'` | `'allow'` | Behavior when `request.cf` is undefined |
| `onDenied` | `(c: Context) => Response` | — | Custom response for denied requests |

> Throws [`BlockConfigError`](#blockconfigerror) at initialization if `deny` and `allow` are both specified, neither is specified, or either is an empty array.

### `maintenance(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean \| (c: Context) => boolean \| Promise<boolean>` | — | Whether maintenance mode is active |
| `allowedIps` | `string[]` | — | IPs/CIDRs that bypass maintenance (IPv4 and IPv6) |
| `retryAfter` | `number \| string` | — | `Retry-After` header value |
| `fallback` | `'allow' \| 'deny'` | `'deny'` | Fail-closed behavior when client IP cannot be resolved with `allowedIps` set. Opt into `'allow'` for permissive fallback. |
| `onMaintenance` | `(c: Context) => Response` | — | Custom maintenance response |

### `CfInfo`

```ts
interface CfInfo {
  country?: string
  asn?: number
  city?: string
  region?: string
  regionCode?: string
  continent?: string
  latitude?: string
  longitude?: string
  timezone?: string
  postalCode?: string
}
```

### `extractCfInfo(c)`

Returns the normalized `CfInfo` for a request, or `undefined` when `request.cf` is unavailable (e.g. local dev without the Cloudflare runtime). Use this when you need geo data without applying any block — for example, to read the country in a handler while leaving access control to a separate layer.

```ts
import { extractCfInfo } from 'hono-cf-access'

app.get('/api/region', (c) => {
  const info = extractCfInfo(c)
  return c.json({ region: info?.region ?? 'unknown' })
})
```

When any block middleware (`countryBlock`, `asnBlock`, `maintenance`) runs, it already populates `c.get('cfInfo')` for downstream handlers; `extractCfInfo` is the manual escape hatch for routes that do not run a middleware.

### `BlockConfigError`

Thrown synchronously by `countryBlock()` and `asnBlock()` when their `deny` / `allow` options are misconfigured. Subclass of `Error` with a `middleware` property identifying the offending caller, so a single `catch` can distinguish multiple call sites.

```ts
import { BlockConfigError, countryBlock } from 'hono-cf-access'

try {
  countryBlock({ deny: [], allow: [] })
} catch (e) {
  if (e instanceof BlockConfigError) {
    // e.middleware === 'countryBlock'
    // e.message === 'countryBlock: cannot specify both "deny" and "allow" — use one or the other'
  }
}
```

Throw conditions:
- Both `deny` and `allow` are specified
- Neither `deny` nor `allow` is specified
- Either `deny` or `allow` is an empty array

The error is thrown at the call to `countryBlock()` / `asnBlock()`, not at request time, so misconfiguration surfaces during Worker startup rather than as a runtime 500.

## Error Responses

Default responses follow [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`Content-Type: application/problem+json`):

| Scenario | Status | Type |
|----------|--------|------|
| Country denied | 403 | `#country-denied` |
| ASN denied | 403 | `#asn-denied` |
| Maintenance | 503 | `#maintenance` |
| CF data unavailable (strict) | 403 | `#cf-unavailable` |

Example response:

```json
{
  "type": "https://github.com/paveg/hono-cf-access#country-denied",
  "title": "Forbidden",
  "status": 403,
  "detail": "Access from country 'CN' is not allowed",
  "instance": "/api/data"
}
```

### country-denied
Request was denied because the resolved country code is on the deny list (or not on the allow list).

### asn-denied
Request was denied because the resolved ASN is on the deny list (or not on the allow list).

### maintenance
Request was rejected because maintenance mode is enabled. When `allowedIps` is set, only listed IPs bypass the lockdown.

### cf-unavailable
Request was denied because `request.cf` geolocation data was unavailable and `fallback` is set to `"deny"`.

## Difference from `@hono/cloudflare-access`

- **`@hono/cloudflare-access`**: Validates Cloudflare Access JWT tokens (authentication)
- **`hono-cf-access`**: Access control using `request.cf` geo data (authorization/filtering)

## License

MIT
