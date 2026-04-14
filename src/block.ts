import type { Context, MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { type BlockMiddlewareName, cfUnavailableResponse } from "./errors";
import type { CfInfo } from "./types";
import { validateDenyAllowOptions } from "./validation";

interface BlockConfig<T> {
	name: BlockMiddlewareName;
	extractValue: (info: CfInfo) => T | undefined;
	defaultResponse: (value: T, c: Context) => Response;
	normalize?: (items: T[]) => T[];
}

interface BlockOptions<T> {
	deny?: T[];
	allow?: T[];
	fallback?: "allow" | "deny";
	onDenied?: (c: Context) => Response | Promise<Response>;
}

export function createBlockMiddleware<T>(config: BlockConfig<T>) {
	return (options: BlockOptions<T>): MiddlewareHandler => {
		validateDenyAllowOptions(options.deny, options.allow, config.name);

		const fallback = options.fallback ?? "allow";
		const norm = config.normalize ?? ((x: T[]) => x);
		const denySet = options.deny ? new Set(norm(options.deny)) : null;
		const allowSet = options.allow ? new Set(norm(options.allow)) : null;

		return async (c, next) => {
			const cfInfo = ensureCfInfo(c);

			const instance = c.req.path;

			if (!cfInfo) {
				if (fallback === "deny") return cfUnavailableResponse(instance);
				return next();
			}

			const value = config.extractValue(cfInfo);
			if (value === undefined) {
				if (fallback === "deny") return cfUnavailableResponse(instance);
				return next();
			}

			const denied = denySet ? denySet.has(value) : !allowSet?.has(value);

			if (denied) {
				if (options.onDenied) return options.onDenied(c);
				return config.defaultResponse(value, c);
			}

			return next();
		};
	};
}
