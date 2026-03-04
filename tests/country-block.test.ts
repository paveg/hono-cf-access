import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { countryBlock } from "../src/country-block";
import { createCfRequest, ok } from "./helpers/mock-cf";

describe("countryBlock", () => {
	// CB1: Access from a country in deny list
	it("denies access from a country in deny list", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN", "RU"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "CN" }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/country-denied");
		expect(body.detail).toContain("CN");
		expect(res.headers.get("content-type")).toBe("application/problem+json");
	});

	it("includes instance field in denied response", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"] }));
		app.get("/api/data", ok);

		const res = await app.request(createCfRequest("/api/data", { country: "CN" }));
		const body = await res.json();
		expect(body.instance).toBe("/api/data");
	});

	// CB2: Access from a country NOT in deny list
	it("allows access from a country not in deny list", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN", "RU"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "JP" }));
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("ok");
	});

	// CB3: Access from a country in allow list
	it("allows access from a country in allow list", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ allow: ["JP", "US", "GB"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "JP" }));
		expect(res.status).toBe(200);
	});

	// CB4: Access from a country NOT in allow list
	it("denies access from a country not in allow list", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ allow: ["JP", "US", "GB"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "CN" }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/country-denied");
	});

	// CB5: request.cf undefined + fallback: 'allow' (default)
	it("allows when request.cf is undefined with fallback allow", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"] }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
	});

	// CB6: request.cf undefined + fallback: 'deny'
	it("denies when request.cf is undefined with fallback deny", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"], fallback: "deny" }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/cf-unavailable");
	});

	// CB7: Both deny and allow specified (runtime guard for JS consumers)
	it("throws when both deny and allow are specified", () => {
		// @ts-expect-error testing invalid input
		expect(() => countryBlock({ deny: ["CN"], allow: ["JP"] })).toThrow(
			'Cannot specify both "deny" and "allow"',
		);
	});

	// CB8: Neither deny nor allow specified (runtime guard for JS consumers)
	it("throws when neither deny nor allow is specified", () => {
		// @ts-expect-error testing invalid input
		expect(() => countryBlock({})).toThrow('Either "deny" or "allow" must be specified');
	});

	// Empty array validation
	it("throws when deny is an empty array", () => {
		expect(() => countryBlock({ deny: [] })).toThrow();
	});

	it("throws when allow is an empty array", () => {
		expect(() => countryBlock({ allow: [] })).toThrow();
	});

	// CB9: onDenied custom response
	it("uses onDenied custom response", async () => {
		const app = new Hono();
		app.use(
			"*",
			countryBlock({
				deny: ["CN"],
				onDenied: (c) => c.html("<h1>Access Denied</h1>", 403),
			}),
		);
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "CN" }));
		expect(res.status).toBe(403);
		expect(await res.text()).toBe("<h1>Access Denied</h1>");
	});

	// CB10: Lowercase country code normalization
	it("normalizes lowercase country codes", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["cn"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { country: "CN" }));
		expect(res.status).toBe(403);
	});

	// Country field missing in request.cf (cf exists but no country)
	it("allows when country is missing with fallback allow", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"] }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 13335 }));
		expect(res.status).toBe(200);
	});

	it("denies when country is missing with fallback deny", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"], fallback: "deny" }));
		app.get("/test", ok);

		const res = await app.request(createCfRequest("/test", { asn: 13335 }));
		expect(res.status).toBe(403);
	});

	// CF1/CF2: cfInfo is set after countryBlock passes
	it("sets cfInfo context variable", async () => {
		const app = new Hono();
		app.use("*", countryBlock({ deny: ["CN"] }));
		app.get("/test", (c) => {
			const info = c.get("cfInfo");
			return c.json({ country: info?.country });
		});

		const res = await app.request(createCfRequest("/test", { country: "JP", asn: 13335 }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.country).toBe("JP");
	});
});
