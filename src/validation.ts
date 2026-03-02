/**
 * Validates deny/allow options shared by countryBlock and asnBlock.
 * Throws on invalid combinations: both specified, neither specified, or empty arrays.
 */
export function validateDenyAllowOptions(
	deny: unknown[] | undefined,
	allow: unknown[] | undefined,
): void {
	if (deny && allow) {
		throw new Error('Cannot specify both "deny" and "allow". Use one or the other.');
	}
	if (!deny && !allow) {
		throw new Error('Either "deny" or "allow" must be specified.');
	}
	if (deny?.length === 0 || allow?.length === 0) {
		throw new Error("deny/allow must not be empty.");
	}
}
