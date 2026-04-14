import type { MiddlewareHandler } from "hono";
import { ensureCfInfo } from "./cf";
import { maintenanceResponse } from "./errors";
import { getClientIp, isIpAllowed } from "./ip";
import type { MaintenanceOptions } from "./types";

/**
 * Returns a Hono middleware that blocks traffic with HTTP 503 while a
 * maintenance window is active.
 *
 * @param options - Maintenance configuration.
 * @returns A Hono middleware handler.
 *
 * @remarks
 * `options.allowedIps` uses the `cf-connecting-ip` header to identify the
 * client. See {@link getClientIp} — this is only safe inside a Cloudflare
 * Workers context. When the request does not flow through Cloudflare, the
 * header can be spoofed and the allowlist MUST NOT be relied on for
 * security.
 *
 * For JWT or Cloudflare Access service-token verification use the
 * `@hono/cloudflare-access` middleware alongside this library; JWT
 * verification is intentionally out of scope here.
 *
 * @example
 * ```ts
 * app.use(maintenance({ enabled: env.MAINTENANCE === "1" }));
 * ```
 */
export function maintenance(options: MaintenanceOptions): MiddlewareHandler {
	const fallback = options.fallback ?? "deny";

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
