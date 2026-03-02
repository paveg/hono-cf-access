import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { asnBlock } from "../src/asn-block";
import { createCfRequest, ok } from "./helpers/mock-cf";

describe("asnBlock", () => {
	// AB1: Access from an ASN in deny list
	it("denies access from an ASN in deny list", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134, 4837] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 4134 }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/asn-denied");
		expect(body.detail).toContain("4134");
		expect(res.headers.get("content-type")).toBe("application/problem+json");
	});

	// AB2: Access from an ASN NOT in deny list
	it("allows access from an ASN not in deny list", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134, 4837] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 13335 }));
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("ok");
	});

	// AB3: Access from an ASN in allow list
	it("allows access from an ASN in allow list", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ allow: [13335, 209242] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 13335 }));
		expect(res.status).toBe(200);
	});

	// AB4: Access from an ASN NOT in allow list
	it("denies access from an ASN not in allow list", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ allow: [13335, 209242] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 4134 }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/asn-denied");
	});

	// AB5: request.cf undefined + fallback: 'allow' (default)
	it("allows when request.cf is undefined with fallback allow", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134] }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
	});

	// AB6: request.cf undefined + fallback: 'deny'
	it("denies when request.cf is undefined with fallback deny", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134], fallback: "deny" }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/cf-unavailable");
	});

	// AB7: Both deny and allow specified
	it("throws when both deny and allow are specified", () => {
		expect(() => asnBlock({ deny: [4134], allow: [13335] })).toThrow(
			'Cannot specify both "deny" and "allow"',
		);
	});

	// AB8: Neither deny nor allow specified
	it("throws when neither deny nor allow is specified", () => {
		expect(() => asnBlock({})).toThrow('Either "deny" or "allow" must be specified');
	});

	// Empty array validation
	it("throws when deny is an empty array", () => {
		expect(() => asnBlock({ deny: [] })).toThrow();
	});

	it("throws when allow is an empty array", () => {
		expect(() => asnBlock({ allow: [] })).toThrow();
	});

	// AB9: onDenied custom response
	it("uses onDenied custom response", async () => {
		const app = new Hono();
		app.use(
			"*",
			asnBlock({
				deny: [4134],
				onDenied: (c) => c.json({ error: "ASN not allowed" }, 403),
			}),
		);
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 4134 }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toBe("ASN not allowed");
	});

	// ASN field missing in request.cf (cf exists but no asn)
	it("allows when asn is missing with fallback allow", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "JP" }));
		expect(res.status).toBe(200);
	});

	it("denies when asn is missing with fallback deny", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134], fallback: "deny" }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "JP" }));
		expect(res.status).toBe(403);
	});

	// CF2: cfInfo is set after asnBlock passes
	it("sets cfInfo context variable", async () => {
		const app = new Hono();
		app.use("*", asnBlock({ deny: [4134] }));
		app.get("/test", (c) => {
			const info = c.get("cfInfo");
			return c.json({ asn: info?.asn });
		});

		const res = await app.request(createCfRequest("/test", { country: "JP", asn: 13335 }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.asn).toBe(13335);
	});
});
