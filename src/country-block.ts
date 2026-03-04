import type { MiddlewareHandler } from "hono";
import { createBlockMiddleware } from "./block";
import { countryDeniedResponse } from "./errors";
import type { CountryBlockOptions } from "./types";

const createCountryBlock = createBlockMiddleware<string>({
	extractValue: (info) => info.country,
	defaultResponse: (country, c) => countryDeniedResponse(country, c.req.path),
	normalize: (codes) => codes.map((c) => c.toUpperCase()),
});

export function countryBlock(options: CountryBlockOptions): MiddlewareHandler {
	return createCountryBlock(options);
}
