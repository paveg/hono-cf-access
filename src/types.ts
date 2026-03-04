import type { Context } from "hono";

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
