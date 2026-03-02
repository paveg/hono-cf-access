import type { MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { maintenanceResponse } from "./errors";
import { getClientIp, isIpAllowed } from "./ip";
import type { MaintenanceOptions } from "./types";

export function maintenance(options: MaintenanceOptions): MiddlewareHandler {
	const fallback = options.fallback ?? "allow";

	return async (c, next) => {
		const isEnabled =
			typeof options.enabled === "function" ? await options.enabled(c) : options.enabled;

		if (!isEnabled) {
			ensureCfInfo(c);
			return next();
		}

		// Maintenance is enabled — check IP allowlist
		if (options.allowedIps?.length) {
			const clientIp = getClientIp(c);

			if (!clientIp) {
				// IP unavailable — use fallback
				if (fallback === "allow") {
					ensureCfInfo(c);
					return next();
				}
				// fallback: 'deny' → return maintenance response
			} else if (isIpAllowed(clientIp, options.allowedIps)) {
				ensureCfInfo(c);
				return next();
			}
		}

		if (options.onMaintenance) return options.onMaintenance(c);
		return maintenanceResponse(options.retryAfter);
	};
}
