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

	// IP7: Invalid IP format — must return false, not accidentally match
	it("returns false for invalid IP", () => {
		expect(isIpInCidr("invalid", "192.168.1.0/24")).toBe(false);
	});

	it("returns false for invalid IP against 0.0.0.0/8", () => {
		expect(isIpInCidr("invalid", "0.0.0.0/8")).toBe(false);
	});

	it("returns false for empty string IP", () => {
		expect(isIpInCidr("", "10.0.0.0/8")).toBe(false);
	});

	it("returns false for partial IP", () => {
		expect(isIpInCidr("192.168", "192.168.0.0/16")).toBe(false);
	});

	it("returns false for IP with out-of-range octets", () => {
		expect(isIpInCidr("256.1.2.3", "0.0.0.0/0")).toBe(false);
	});

	it("returns false for IP with negative octets", () => {
		expect(isIpInCidr("-1.0.0.0", "0.0.0.0/0")).toBe(false);
	});

	// /8 CIDR boundary values
	it("matches first address in /8 range", () => {
		expect(isIpInCidr("10.0.0.0", "10.0.0.0/8")).toBe(true);
	});

	it("matches last address in /8 range", () => {
		expect(isIpInCidr("10.255.255.255", "10.0.0.0/8")).toBe(true);
	});

	it("rejects address just outside /8 range", () => {
		expect(isIpInCidr("11.0.0.0", "10.0.0.0/8")).toBe(false);
	});

	it("rejects address just below /8 range", () => {
		expect(isIpInCidr("9.255.255.255", "10.0.0.0/8")).toBe(false);
	});

	// /16 CIDR boundary values
	it("matches first address in /16 range", () => {
		expect(isIpInCidr("172.16.0.0", "172.16.0.0/16")).toBe(true);
	});

	it("matches last address in /16 range", () => {
		expect(isIpInCidr("172.16.255.255", "172.16.0.0/16")).toBe(true);
	});

	it("rejects address just outside /16 range", () => {
		expect(isIpInCidr("172.17.0.0", "172.16.0.0/16")).toBe(false);
	});

	it("rejects address just below /16 range", () => {
		expect(isIpInCidr("172.15.255.255", "172.16.0.0/16")).toBe(false);
	});

	// Network part validation
	it("rejects CIDR with invalid network part", () => {
		expect(isIpInCidr("10.0.0.1", "invalid/24")).toBe(false);
	});

	it("rejects CIDR with out-of-range prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/33")).toBe(false);
	});

	it("rejects CIDR with negative prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/-1")).toBe(false);
	});

	it("rejects plain CIDR with invalid network", () => {
		expect(isIpInCidr("10.0.0.1", "999.999.999.999")).toBe(false);
	});

	it("rejects CIDR with trailing alpha in prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/24abc")).toBe(false);
	});

	it("rejects CIDR with extra slash in prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/24/extra")).toBe(false);
	});

	it("rejects CIDR with decimal prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/24.5")).toBe(false);
	});

	it("rejects CIDR with empty prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/")).toBe(false);
	});

	it("rejects CIDR with whitespace in prefix", () => {
		expect(isIpInCidr("10.0.0.1", "10.0.0.0/24 ")).toBe(false);
	});
});

describe("isIpInCidr — IPv6", () => {
	// IPv6 exact match
	it("returns true for exact IPv6 match", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::1")).toBe(true);
	});

	it("returns false for non-matching IPv6", () => {
		expect(isIpInCidr("2001:db8::2", "2001:db8::1")).toBe(false);
	});

	// IPv6 CIDR ranges
	it("returns true for IPv6 within /64 CIDR", () => {
		expect(isIpInCidr("2001:db8:abcd:0012::1", "2001:db8:abcd:0012::/64")).toBe(true);
	});

	it("returns false for IPv6 outside /64 CIDR", () => {
		expect(isIpInCidr("2001:db8:abcd:0013::1", "2001:db8:abcd:0012::/64")).toBe(false);
	});

	it("returns true for IPv6 within /32 CIDR", () => {
		expect(isIpInCidr("2001:db8:ffff::1", "2001:db8::/32")).toBe(true);
	});

	it("returns false for IPv6 outside /32 CIDR", () => {
		expect(isIpInCidr("2001:db9::1", "2001:db8::/32")).toBe(false);
	});

	it("returns true for exact match with /128 CIDR", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::1/128")).toBe(true);
	});

	it("returns false for non-match with /128 CIDR", () => {
		expect(isIpInCidr("2001:db8::2", "2001:db8::1/128")).toBe(false);
	});

	it("returns true for any IPv6 with /0 CIDR", () => {
		expect(isIpInCidr("2001:db8::1", "::/0")).toBe(true);
		expect(isIpInCidr("fe80::1", "::/0")).toBe(true);
	});

	// Full form vs abbreviated form
	it("matches full form against abbreviated CIDR", () => {
		expect(isIpInCidr("2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8::1")).toBe(true);
	});

	it("matches abbreviated form against full CIDR", () => {
		expect(isIpInCidr("2001:db8::1", "2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(true);
	});

	// Invalid IPv6
	it("returns false for invalid IPv6 characters", () => {
		expect(isIpInCidr("2001:db8::xyz", "2001:db8::/32")).toBe(false);
	});

	it("returns false for too many groups", () => {
		expect(isIpInCidr("2001:db8:1:2:3:4:5:6:7", "2001:db8::/32")).toBe(false);
	});

	it("returns false for prefix > 128", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::/129")).toBe(false);
	});

	it("rejects IPv6 CIDR with trailing alpha in prefix", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::/32abc")).toBe(false);
	});

	it("rejects IPv6 CIDR with extra slash in prefix", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::/32/extra")).toBe(false);
	});

	it("rejects IPv6 CIDR with empty prefix", () => {
		expect(isIpInCidr("2001:db8::1", "2001:db8::/")).toBe(false);
	});

	// Invalid IPv6 edge cases for branch coverage
	it("returns false for multiple :: in IPv6", () => {
		expect(isIpInCidr("2001::db8::1", "2001:db8::/32")).toBe(false);
	});

	it("returns false for IPv6 with too many groups around ::", () => {
		expect(isIpInCidr("2001:db8:1:2:3:4:5::6:7", "2001:db8::/32")).toBe(false);
	});

	it("returns false for IPv6 group with more than 4 hex digits", () => {
		expect(isIpInCidr("2001:db800:0:0:0:0:0:1", "2001:db8::/32")).toBe(false);
	});

	it("returns false for IPv4 with empty octet part", () => {
		expect(isIpInCidr("192..1.1", "192.168.1.0/24")).toBe(false);
	});

	// Cross-family rejection
	it("rejects IPv4 address against IPv6 CIDR", () => {
		expect(isIpInCidr("192.168.1.1", "2001:db8::/32")).toBe(false);
	});

	it("rejects IPv6 address against IPv4 CIDR", () => {
		expect(isIpInCidr("2001:db8::1", "192.168.1.0/24")).toBe(false);
	});

	// IPv4-mapped IPv6
	it("matches IPv4-mapped IPv6 against IPv4 CIDR", () => {
		expect(isIpInCidr("::ffff:192.168.1.1", "192.168.1.0/24")).toBe(true);
	});

	it("matches IPv4 against IPv4-mapped IPv6 exact", () => {
		expect(isIpInCidr("192.168.1.1", "::ffff:192.168.1.1")).toBe(true);
	});

	// Zone ID stripping
	it("strips zone ID from IPv6 address", () => {
		expect(isIpInCidr("fe80::1%eth0", "fe80::1")).toBe(true);
	});

	it("strips zone ID from IPv6 CIDR", () => {
		expect(isIpInCidr("fe80::1", "fe80::%eth0/64")).toBe(true);
	});
});

describe("ip edge cases", () => {
	it("strips IPv6 zone ID before matching", () => {
		expect(isIpInCidr("fe80::1%eth0", "fe80::/10")).toBe(true);
	});

	it("matches IPv4-mapped IPv6 against IPv4 CIDR", () => {
		expect(isIpInCidr("::ffff:192.0.2.1", "192.0.2.0/24")).toBe(true);
	});

	it("IPv4-mapped IPv6 does not match an IPv6 CIDR after normalization", () => {
		expect(isIpInCidr("::ffff:192.0.2.1", "::ffff:0:0/96")).toBe(false);
	});

	it("rejects malformed CIDR prefix > 32 for IPv4 without throwing", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/33")).toBe(false);
	});

	it("rejects CIDR with negative prefix", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/-1")).toBe(false);
	});

	it("rejects CIDR with non-numeric prefix", () => {
		expect(isIpInCidr("192.168.1.1", "192.168.1.0/abc")).toBe(false);
	});

	it("rejects malformed IPv6 CIDR network", () => {
		expect(isIpInCidr("::1", "not:a:valid::cidr/64")).toBe(false);
	});

	it("rejects IPv6 CIDR with prefix > 128", () => {
		expect(isIpInCidr("::1", "::/129")).toBe(false);
	});

	it("IPv4 /0 matches any address", () => {
		expect(isIpInCidr("1.2.3.4", "0.0.0.0/0")).toBe(true);
	});

	it("IPv6 /0 matches any address", () => {
		expect(isIpInCidr("2001:db8::1", "::/0")).toBe(true);
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

	// Mixed IPv4 + IPv6 allow list
	it("matches IPv6 in mixed allow list", () => {
		expect(isIpAllowed("2001:db8::1", ["10.0.0.0/8", "2001:db8::/32"])).toBe(true);
	});

	it("matches IPv4 in mixed allow list with IPv6 entries", () => {
		expect(isIpAllowed("10.0.0.1", ["2001:db8::/32", "10.0.0.0/8"])).toBe(true);
	});

	it("rejects unmatched IP in mixed allow list", () => {
		expect(isIpAllowed("172.16.0.1", ["2001:db8::/32", "10.0.0.0/8"])).toBe(false);
	});
});
