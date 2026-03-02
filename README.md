# hono-cf-access

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

## API

### `countryBlock(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deny` | `string[]` | — | Country codes to deny (ISO 3166-1 alpha-2) |
| `allow` | `string[]` | — | Country codes to allow. All others denied |
| `fallback` | `'allow' \| 'deny'` | `'allow'` | Behavior when `request.cf` is undefined |
| `onDenied` | `(c: Context) => Response` | — | Custom response for denied requests |

> `deny` and `allow` are mutually exclusive. Specifying both throws at initialization.

### `asnBlock(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deny` | `number[]` | — | ASN numbers to deny |
| `allow` | `number[]` | — | ASN numbers to allow. All others denied |
| `fallback` | `'allow' \| 'deny'` | `'allow'` | Behavior when `request.cf` is undefined |
| `onDenied` | `(c: Context) => Response` | — | Custom response for denied requests |

### `maintenance(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean \| (c: Context) => boolean \| Promise<boolean>` | — | Whether maintenance mode is active |
| `allowedIps` | `string[]` | — | IPs/CIDRs that bypass maintenance |
| `retryAfter` | `number \| string` | — | `Retry-After` header value |
| `fallback` | `'allow' \| 'deny'` | `'allow'` | Behavior when IP cannot be resolved |
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

## Error Responses

Default responses follow [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`Content-Type: application/problem+json`):

| Scenario | Status | Type |
|----------|--------|------|
| Country denied | 403 | `/errors/country-denied` |
| ASN denied | 403 | `/errors/asn-denied` |
| Maintenance | 503 | `/errors/maintenance` |
| CF data unavailable (strict) | 403 | `/errors/cf-unavailable` |

Example response:

```json
{
  "type": "https://hono-cf-access.dev/errors/country-denied",
  "title": "Forbidden",
  "status": 403,
  "detail": "Access from country 'CN' is not allowed"
}
```

## Difference from `@hono/cloudflare-access`

- **`@hono/cloudflare-access`**: Validates Cloudflare Access JWT tokens (authentication)
- **`hono-cf-access`**: Access control using `request.cf` geo data (authorization/filtering)

## License

MIT
