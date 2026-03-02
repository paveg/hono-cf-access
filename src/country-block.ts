import type { MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { cfUnavailableResponse, countryDeniedResponse } from "./errors";
import type { CountryBlockOptions } from "./types";
import { validateDenyAllowOptions } from "./validation";

export function countryBlock(options: CountryBlockOptions): MiddlewareHandler {
	validateDenyAllowOptions(options.deny, options.allow);

	const fallback = options.fallback ?? "allow";
	const denySet = options.deny ? new Set(options.deny.map((c) => c.toUpperCase())) : null;
	const allowSet = options.allow ? new Set(options.allow.map((c) => c.toUpperCase())) : null;

	return async (c, next) => {
		const cfInfo = ensureCfInfo(c);

		if (!cfInfo) {
			if (fallback === "deny") return cfUnavailableResponse();
			return next();
		}

		const country = cfInfo.country;
		if (!country) {
			if (fallback === "deny") return cfUnavailableResponse();
			return next();
		}

		const denied = denySet ? denySet.has(country) : !allowSet?.has(country);

		if (denied) {
			if (options.onDenied) return options.onDenied(c);
			return countryDeniedResponse(country);
		}

		return next();
	};
}
