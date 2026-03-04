# hono-cf-access

## 0.2.0

### Minor Changes

- 72a1162: Extract createBlockMiddleware generic factory for shared deny/allow logic, add RFC 9457 instance field to all Problem Detail responses, and introduce DenyAllow discriminated union type for stricter type safety.

## 0.1.0

### Minor Changes

- Add IPv4 validation to prevent invalid IPs from matching CIDR ranges, reject empty deny/allow arrays at initialization, and extract shared validation helper.
