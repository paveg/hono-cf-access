import type { Context } from "hono";

const IPV4_PART_COUNT = 4;

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
	if (!isValidIPv4(ip)) return false;

	const slash = cidr.indexOf("/");
	if (slash === -1) return ip === cidr;

	const network = cidr.substring(0, slash);
	const prefix = Number.parseInt(cidr.substring(slash + 1), 10);
	const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
	return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

export function isIpAllowed(ip: string, allowList: string[]): boolean {
	return allowList.some((entry) => isIpInCidr(ip, entry));
}

export function getClientIp(c: Context): string | undefined {
	return c.req.header("cf-connecting-ip") ?? undefined;
}
