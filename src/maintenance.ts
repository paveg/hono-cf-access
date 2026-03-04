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

		if (isEnabled) {
			const respond = () =>
				options.onMaintenance?.(c) ?? maintenanceResponse(options.retryAfter, c.req.path);

			if (options.allowedIps?.length) {
				const clientIp = getClientIp(c);
				if (!clientIp) {
					if (fallback === "deny") return respond();
				} else if (!isIpAllowed(clientIp, options.allowedIps)) {
					return respond();
				}
			} else {
				return respond();
			}
		}

		ensureCfInfo(c);
		return next();
	};
}
