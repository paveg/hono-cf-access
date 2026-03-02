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

export interface CountryBlockOptions {
	deny?: string[];
	allow?: string[];
	fallback?: "allow" | "deny";
	onDenied?: (c: Context) => Response | Promise<Response>;
}

export interface AsnBlockOptions {
	deny?: number[];
	allow?: number[];
	fallback?: "allow" | "deny";
	onDenied?: (c: Context) => Response | Promise<Response>;
}

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
