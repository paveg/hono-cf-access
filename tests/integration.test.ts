import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { asnBlock } from "../src/asn-block";
import { countryBlock } from "../src/country-block";
import * as pkg from "../src/index";
import { maintenance } from "../src/maintenance";
import { createCfRequest, ok } from "./helpers/mock-cf";

describe("middleware chaining", () => {
	it("applies all middlewares in order", async () => {
		const app = new Hono();
		app.use(
			"/api/*",
			countryBlock({ deny: ["CN", "RU"] }),
			asnBlock({ deny: [4134] }),
			maintenance({ enabled: false }),
		);
		app.get("/api/data", (c) => {
			const info = c.get("cfInfo");
			return c.json({ country: info?.country, asn: info?.asn });
		});

		const res = await app.request(createCfRequest("/api/data", { country: "JP", asn: 13335 }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.country).toBe("JP");
		expect(body.asn).toBe(13335);
	});

	it("stops at first denying middleware (countryBlock)", async () => {
		const app = new Hono();
		app.use("/api/*", countryBlock({ deny: ["CN"] }), asnBlock({ deny: [4134] }));
		app.get("/api/data", ok);

		const res = await app.request(createCfRequest("/api/data", { country: "CN", asn: 13335 }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toContain("country-denied");
	});

	it("stops at second middleware (asnBlock) when country passes", async () => {
		const app = new Hono();
		app.use("/api/*", countryBlock({ deny: ["CN"] }), asnBlock({ deny: [4134] }));
		app.get("/api/data", ok);

		const res = await app.request(createCfRequest("/api/data", { country: "JP", asn: 4134 }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.type).toContain("asn-denied");
	});

	it("maintenance blocks even when country and ASN pass", async () => {
		const app = new Hono();
		app.use(
			"/api/*",
			countryBlock({ deny: ["CN"] }),
			asnBlock({ deny: [4134] }),
			maintenance({ enabled: true }),
		);
		app.get("/api/data", ok);

		const res = await app.request(createCfRequest("/api/data", { country: "JP", asn: 13335 }));
		expect(res.status).toBe(503);
	});

	it("applies middlewares per-route independently", async () => {
		const app = new Hono();
		app.use("/admin/*", countryBlock({ allow: ["JP"] }));
		app.use("/public/*", countryBlock({ deny: ["CN"] }));
		app.get("/admin/panel", ok);
		app.get("/public/info", ok);

		const jpReq = createCfRequest("/admin/panel", { country: "JP" });
		const usReq = createCfRequest("/admin/panel", { country: "US" });
		const publicReq = createCfRequest("/public/info", { country: "US" });

		expect((await app.request(jpReq)).status).toBe(200);
		expect((await app.request(usReq)).status).toBe(403);
		expect((await app.request(publicReq)).status).toBe(200);
	});
});

describe("package root", () => {
	it("exports expected symbols", () => {
		expect(typeof pkg.countryBlock).toBe("function");
		expect(typeof pkg.asnBlock).toBe("function");
		expect(typeof pkg.maintenance).toBe("function");
		expect(typeof pkg.extractCfInfo).toBe("function");
		expect(pkg.BlockConfigError.prototype).toBeInstanceOf(Error);
	});
});

describe("short-circuit and response shape", () => {
	it("does not invoke downstream middleware after a block", async () => {
		const app = new Hono();
		let downstreamCalled = false;
		app.use("/api/*", countryBlock({ deny: ["CN"] }), async (_c, next) => {
			downstreamCalled = true;
			return next();
		});
		app.get("/api/data", ok);
		const res = await app.request(createCfRequest("/api/data", { country: "CN" }));
		expect(res.status).toBe(403);
		expect(downstreamCalled).toBe(false);
	});

	it("block response has Problem Detail shape", async () => {
		const app = new Hono();
		app.use("/api/*", countryBlock({ deny: ["CN"] }));
		app.get("/api/data", ok);
		const res = await app.request(createCfRequest("/api/data", { country: "CN" }));
		expect(res.headers.get("content-type")).toBe("application/problem+json");
		const body = await res.json();
		expect(body).toMatchObject({
			type: expect.stringContaining("country-denied"),
			title: "Forbidden",
			status: 403,
			detail: expect.stringContaining("CN"),
			instance: "/api/data",
		});
	});

	it("maintenance returns retry-after header", async () => {
		const app = new Hono();
		app.use("/*", maintenance({ enabled: true, retryAfter: 120 }));
		app.get("/", ok);
		const res = await app.request(createCfRequest("/"));
		expect(res.status).toBe(503);
		expect(res.headers.get("retry-after")).toBe("120");
	});
});
