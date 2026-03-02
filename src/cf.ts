import type { Context } from "hono";
import type { CfInfo } from "./types";

export function extractCfInfo(c: Context): CfInfo | undefined {
	const cf = c.req.raw.cf;
	if (!cf) return undefined;

	return {
		country: typeof cf.country === "string" ? cf.country.toUpperCase() : undefined,
		asn: typeof cf.asn === "number" ? cf.asn : undefined,
		city: typeof cf.city === "string" ? cf.city : undefined,
		region: typeof cf.region === "string" ? cf.region : undefined,
		regionCode: typeof cf.regionCode === "string" ? cf.regionCode : undefined,
		continent: typeof cf.continent === "string" ? cf.continent : undefined,
		latitude: typeof cf.latitude === "string" ? cf.latitude : undefined,
		longitude: typeof cf.longitude === "string" ? cf.longitude : undefined,
		timezone: typeof cf.timezone === "string" ? cf.timezone : undefined,
		postalCode: typeof cf.postalCode === "string" ? cf.postalCode : undefined,
	};
}

/**
 * Sets cfInfo on the context if not already set by a preceding middleware.
 * Returns the CfInfo (or undefined if request.cf is unavailable).
 */
export function ensureCfInfo(c: Context): CfInfo | undefined {
	const existing = c.get("cfInfo");
	if (existing) return existing;

	const info = extractCfInfo(c);
	if (info) c.set("cfInfo", info);
	return info;
}
