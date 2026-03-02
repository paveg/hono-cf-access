import type { MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { asnDeniedResponse, cfUnavailableResponse } from "./errors";
import type { AsnBlockOptions } from "./types";

export function asnBlock(options: AsnBlockOptions): MiddlewareHandler {
	if (options.deny && options.allow) {
		throw new Error('Cannot specify both "deny" and "allow". Use one or the other.');
	}
	if (!options.deny && !options.allow) {
		throw new Error('Either "deny" or "allow" must be specified.');
	}

	const fallback = options.fallback ?? "allow";
	const denySet = options.deny ? new Set(options.deny) : null;
	const allowSet = options.allow ? new Set(options.allow) : null;

	return async (c, next) => {
		const cfInfo = ensureCfInfo(c);

		if (!cfInfo) {
			if (fallback === "deny") return cfUnavailableResponse();
			return next();
		}

		const asn = cfInfo.asn;
		if (asn === undefined) {
			if (fallback === "deny") return cfUnavailableResponse();
			return next();
		}

		const denied = denySet ? denySet.has(asn) : !allowSet?.has(asn);

		if (denied) {
			if (options.onDenied) return options.onDenied(c);
			return asnDeniedResponse(asn);
		}

		return next();
	};
}
