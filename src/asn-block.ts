import type { MiddlewareHandler } from "hono";
import { createBlockMiddleware } from "./block";
import { asnDeniedResponse } from "./errors";
import type { AsnBlockOptions } from "./types";

const createAsnBlock = createBlockMiddleware<number>({
	name: "asnBlock",
	extractValue: (info) => info.asn,
	defaultResponse: (asn, c) => asnDeniedResponse(asn, c.req.path),
});

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
export function asnBlock(options: AsnBlockOptions): MiddlewareHandler {
	return createAsnBlock(options);
}
