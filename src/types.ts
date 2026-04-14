import type { Context } from "hono";

/**
 * Subset of `IncomingRequestCfProperties` this library surfaces on the
 * Hono context.
 *
 * @remarks
 * Intentionally omitted fields include `tlsVersion`, `clientTcpRtt`,
 * `metalocation`, `requestPriority`, and other transport-level details.
 * Scope is restricted to geographic and network-identity data relevant to
 * access control; widen the type explicitly if you need more.
 */
export interface CfInfo {
	country?: string;
	asn?: number;
	city?: string;
	region?: string;
	regionCode?: string;
	continent?: string;
	latitude?: string;
	longitude?: string;
	timezone?: string;
	postalCode?: string;
}

type DenyAllow<T> = { deny: T[]; allow?: never } | { allow: T[]; deny?: never };

type BlockBase = {
	fallback?: "allow" | "deny";
	onDenied?: (c: Context) => Response | Promise<Response>;
};

export type CountryBlockOptions = BlockBase & DenyAllow<string>;

export type AsnBlockOptions = BlockBase & DenyAllow<number>;

export interface MaintenanceOptions {
	enabled: boolean | ((c: Context) => boolean | Promise<boolean>);
	allowedIps?: string[];
	retryAfter?: number | string;
	fallback?: "allow" | "deny";
	onMaintenance?: (c: Context) => Response | Promise<Response>;
}

declare module "hono" {
	interface ContextVariableMap {
		cfInfo: CfInfo;
	}
}
