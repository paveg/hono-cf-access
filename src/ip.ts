import type { Context } from "hono";

const IPV4_PART_COUNT = 4;
const IPV6_GROUP_COUNT = 8;
const IPV4_MAPPED_PREFIX = "::ffff:";

function isValidIPv4(ip: string): boolean {
	const parts = ip.split(".");
	if (parts.length !== IPV4_PART_COUNT) return false;
	for (const part of parts) {
		if (part === "") return false;
		const n = Number(part);
		if (!Number.isInteger(n) || n < 0 || n > 255) return false;
	}
	return true;
}

function isIPv6(ip: string): boolean {
	return ip.includes(":");
}

/** Strip zone ID (%eth0) and normalize IPv4-mapped IPv6 to plain IPv4 */
function normalizeIp(ip: string): string {
	// Strip zone ID, preserving /prefix suffix if present
	const zoneIdx = ip.indexOf("%");
	let stripped = ip;
	if (zoneIdx !== -1) {
		const slashAfterZone = ip.indexOf("/", zoneIdx);
		stripped =
			slashAfterZone === -1
				? ip.substring(0, zoneIdx)
				: ip.substring(0, zoneIdx) + ip.substring(slashAfterZone);
	}

	// Normalize IPv4-mapped IPv6 → IPv4
	const lower = stripped.toLowerCase();
	if (lower.startsWith(IPV4_MAPPED_PREFIX)) {
		const v4 = stripped.substring(IPV4_MAPPED_PREFIX.length);
		if (isValidIPv4(v4)) return v4;
	}

	return stripped;
}

/** Expand :: shorthand and return 8 groups, or null if invalid structure */
function expandIPv6(ip: string): string[] | null {
	const halves = ip.split("::");
	if (halves.length > 2) return null; // multiple :: not allowed

	if (halves.length === 2) {
		const left = halves[0] === "" ? [] : halves[0].split(":");
		const right = halves[1] === "" ? [] : halves[1].split(":");
		const fill = IPV6_GROUP_COUNT - left.length - right.length;
		if (fill < 0) return null;
		const groups = [...left, ...Array(fill).fill("0"), ...right];
		return groups.length === IPV6_GROUP_COUNT ? groups : null;
	}

	const groups = ip.split(":");
	return groups.length === IPV6_GROUP_COUNT ? groups : null;
}

function isValidIPv6(ip: string): boolean {
	const groups = expandIPv6(ip);
	if (!groups) return false;
	for (const g of groups) {
		if (g.length === 0 || g.length > 4) return false;
		if (!/^[0-9a-fA-F]+$/.test(g)) return false;
	}
	return true;
}

function ipv6ToBigInt(ip: string): bigint {
	const groups = expandIPv6(ip) as string[];
	let result = 0n;
	for (const g of groups) {
		result = (result << 16n) | BigInt(Number.parseInt(g, 16));
	}
	return result;
}

function isIpv6InCidr(ip: string, network: string, prefix: number): boolean {
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
	if (!isValidIPv6(ip) || !isValidIPv6(network)) return false;

	if (prefix === 0) return true;
	const shift = BigInt(128 - prefix);
	return ipv6ToBigInt(ip) >> shift === ipv6ToBigInt(network) >> shift;
}

export function ipToInt(ip: string): number {
	const parts = ip.split(".");
	return (
		((Number.parseInt(parts[0], 10) << 24) |
			(Number.parseInt(parts[1], 10) << 16) |
			(Number.parseInt(parts[2], 10) << 8) |
			Number.parseInt(parts[3], 10)) >>>
		0
	);
}

export function isIpInCidr(ip: string, cidr: string): boolean {
	const normIp = normalizeIp(ip);
	const normCidr = normalizeIp(cidr);

	const slash = normCidr.indexOf("/");
	const network = slash === -1 ? normCidr : normCidr.substring(0, slash);

	const ipIsV6 = isIPv6(normIp);
	const cidrIsV6 = isIPv6(network);

	// Cross-family mismatch
	if (ipIsV6 !== cidrIsV6) return false;

	if (ipIsV6) {
		if (slash === -1)
			return (
				isValidIPv6(normIp) &&
				isValidIPv6(network) &&
				ipv6ToBigInt(normIp) === ipv6ToBigInt(network)
			);
		const prefix = Number.parseInt(normCidr.substring(slash + 1), 10);
		return isIpv6InCidr(normIp, network, prefix);
	}

	// IPv4 path (existing logic)
	if (!isValidIPv4(normIp)) return false;
	if (slash === -1) return isValidIPv4(network) && normIp === network;

	if (!isValidIPv4(network)) return false;
	const prefix = Number.parseInt(normCidr.substring(slash + 1), 10);
	if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

	const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
	return (ipToInt(normIp) & mask) === (ipToInt(network) & mask);
}

export function isIpAllowed(ip: string, allowList: string[]): boolean {
	return allowList.some((entry) => isIpInCidr(ip, entry));
}

/** Returns the client IP address from the cf-connecting-ip header. */
export function getClientIp(c: Context): string | undefined {
	return c.req.header("cf-connecting-ip") ?? undefined;
}
