import type { MiddlewareHandler } from "hono";
import { createBlockMiddleware } from "./block";
import { asnDeniedResponse } from "./errors";
import type { AsnBlockOptions } from "./types";

const createAsnBlock = createBlockMiddleware<number>({
	extractValue: (info) => info.asn,
	defaultResponse: (asn, c) => asnDeniedResponse(asn, c.req.path),
});

export function asnBlock(options: AsnBlockOptions): MiddlewareHandler {
	return createAsnBlock(options);
}
