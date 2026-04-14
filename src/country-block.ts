import type { MiddlewareHandler } from "hono";
import { createBlockMiddleware } from "./block";
import { countryDeniedResponse } from "./errors";
import type { CountryBlockOptions } from "./types";

const createCountryBlock = createBlockMiddleware<string>({
	extractValue: (info) => info.country,
	defaultResponse: (country, c) => countryDeniedResponse(country, c.req.path),
	normalize: (codes) => codes.map((c) => c.toUpperCase()),
});

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
export function countryBlock(options: CountryBlockOptions): MiddlewareHandler {
	return createCountryBlock(options);
}
