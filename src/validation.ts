import { BlockConfigError, type BlockMiddlewareName } from "./errors";

/**
 * Validates deny/allow options shared by countryBlock and asnBlock.
 *
 * @throws {BlockConfigError} When both specified, neither specified, or
 *   either is an empty array. The error's `middleware` field identifies
 *   the caller.
 */
export function validateDenyAllowOptions(
	deny: unknown[] | undefined,
	allow: unknown[] | undefined,
	middleware: BlockMiddlewareName,
): void {
	if (deny && allow) {
		throw new BlockConfigError(
			'cannot specify both "deny" and "allow" — use one or the other',
			middleware,
		);
	}
	if (!deny && !allow) {
		throw new BlockConfigError('either "deny" or "allow" must be specified', middleware);
	}
	if (deny?.length === 0 || allow?.length === 0) {
		throw new BlockConfigError("deny/allow must not be empty", middleware);
	}
}
