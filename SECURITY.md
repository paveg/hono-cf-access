# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.5.x | Yes |
| < 0.5 | No |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report security issues via [GitHub Security Advisories](https://github.com/paveg/hono-cf-access/security/advisories/new).

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You can expect an initial response within 72 hours. We will work with you to understand and address the issue before any public disclosure.

## Scope

This policy covers the `hono-cf-access` npm package. Vulnerabilities in dependencies should be reported to the respective maintainers.

## Access Control Considerations

This middleware makes allow/deny decisions from Cloudflare's `request.cf` properties. If you discover an issue that could lead to:

- Bypassing configured access-control rules
- Incorrect IP/CIDR range parsing that admits disallowed addresses
- A fail-open regression where a parsing or lookup error results in an allowed request instead of a denial

…please prioritize disclosure via the channel above.
