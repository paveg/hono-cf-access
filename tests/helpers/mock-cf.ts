import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";
import type { Context } from "hono";

export function createCfRequest(
	path: string,
	cf?: Partial<IncomingRequestCfProperties>,
	headers?: HeadersInit,
): Request {
	const req = new Request(`http://localhost${path}`, { headers });
	if (cf !== undefined) {
		Object.defineProperty(req, "cf", { value: cf, writable: false });
	}
	return req;
}

export const ok = (c: Context) => c.text("ok");
