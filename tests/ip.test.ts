import { describe, expect, it } from "vitest";
import { ipToInt, isIpAllowed, isIpInCidr } from "../src/ip";

describe("ipToInt", () => {
	it("converts 0.0.0.0 to 0", () => {
		expect(ipToInt("0.0.0.0")).toBe(0);
	});

	it("converts 255.255.255.255 to 4294967295", () => {
		expect(ipToInt("255.255.255.255")).toBe(4294967295);
	});

	it("converts 192.168.1.1 correctly", () => {
		expect(ipToInt("192.168.1.1")).toBe(3232235777);
	});
});

describe("isIpInCidr", () => {
	// IP1: Single IP exact match
	it("returns true for exact IP match", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.1")).toBe(true);
	});

	// IP2: Single IP no match
	it("returns false for non-matching IP", () => {
		expect(isIpInCidr("192.168.1.2", "192.168.1.1")).toBe(false);
	});

	// IP3: IP within /24 CIDR
	it("returns true for IP within /24 CIDR", () => {
		expect(isIpInCidr("192.168.1.100", "192.168.1.0/24")).toBe(true);
	});

	// IP4: IP outside /24 CIDR
	it("returns false for IP outside /24 CIDR", () => {
		expect(isIpInCidr("192.168.2.1", "192.168.1.0/24")).toBe(false);
	});

	// IP5: /32 CIDR (single host)
	it("returns true for exact match with /32 CIDR", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.1/32")).toBe(true);
	});

	it("returns false for non-match with /32 CIDR", () => {
		expect(isIpInCidr("10.0.0.2", "10.0.0.1/32")).toBe(false);
	});

	// IP6: /0 CIDR (all addresses)
	it("returns true for any IP with /0 CIDR", () => {
		expect(isIpInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
		expect(isIpInCidr("255.255.255.255", "0.0.0.0/0")).toBe(true);
	});

	// IP7: Invalid IP format
	it("does not throw for invalid IP", () => {
		expect(() => isIpInCidr("invalid", "192.168.1.0/24")).not.toThrow();
	});
});

describe("isIpAllowed", () => {
	it("returns true when IP matches any entry", () => {
		expect(isIpAllowed("192.168.1.50", ["10.0.0.0/8", "192.168.1.0/24"])).toBe(true);
	});

	it("returns false when IP matches no entry", () => {
		expect(isIpAllowed("172.16.0.1", ["10.0.0.0/8", "192.168.1.0/24"])).toBe(false);
	});

	it("returns false for empty list", () => {
		expect(isIpAllowed("192.168.1.1", [])).toBe(false);
	});
});
