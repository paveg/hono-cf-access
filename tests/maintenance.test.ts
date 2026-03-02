import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { maintenance } from "../src/maintenance";
import { createCfRequest, ok } from "./helpers/mock-cf";

describe("maintenance", () => {
	// MT1: enabled: true
	it("returns 503 when enabled is true", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: true }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.type).toBe("https://hono-cf-access.dev/errors/maintenance");
		expect(body.title).toBe("Service Unavailable");
		expect(res.headers.get("content-type")).toBe("application/problem+json");
	});

	// MT2: enabled: false
	it("allows access when enabled is false", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: false }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("ok");
	});

	// MT3: enabled: async function → true
	it("returns 503 when enabled async function returns true", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: async () => true }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
	});

	// MT4: enabled: async function → false
	it("allows access when enabled async function returns false", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: async () => false }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
	});

	// MT5: enabled: true + IP in allowedIps
	it("allows access when client IP is in allowedIps", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["203.0.113.50"],
			}),
		);
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "203.0.113.50" },
			}),
		);
		expect(res.status).toBe(200);
	});

	// MT6: enabled: true + IP NOT in allowedIps
	it("returns 503 when client IP is not in allowedIps", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["203.0.113.50"],
			}),
		);
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "10.0.0.1" },
			}),
		);
		expect(res.status).toBe(503);
	});

	// MT7: enabled: true + IP matches CIDR
	it("allows access when client IP matches CIDR range", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["192.168.1.0/24"],
			}),
		);
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "192.168.1.100" },
			}),
		);
		expect(res.status).toBe(200);
	});

	// MT8: enabled: true + IP does NOT match CIDR
	it("returns 503 when client IP does not match CIDR range", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["192.168.1.0/24"],
			}),
		);
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "192.168.2.1" },
			}),
		);
		expect(res.status).toBe(503);
	});

	// MT9: retryAfter specified
	it("includes Retry-After header when retryAfter is specified", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: true, retryAfter: 3600 }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
		expect(res.headers.get("retry-after")).toBe("3600");
	});

	it("includes Retry-After header with string value", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				retryAfter: "Wed, 21 Oct 2025 07:28:00 GMT",
			}),
		);
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.headers.get("retry-after")).toBe("Wed, 21 Oct 2025 07:28:00 GMT");
	});

	// MT10: onMaintenance custom response
	it("uses onMaintenance custom response", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				onMaintenance: (c) => c.html("<h1>Under Maintenance</h1>", 503),
			}),
		);
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
		expect(await res.text()).toBe("<h1>Under Maintenance</h1>");
	});

	// MT11: CF-Connecting-IP missing + fallback: 'allow' (with allowedIps)
	it("allows when CF-Connecting-IP is missing with fallback allow", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["203.0.113.50"],
				fallback: "allow",
			}),
		);
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
	});

	// MT12: CF-Connecting-IP missing + fallback: 'deny' (with allowedIps)
	it("returns 503 when CF-Connecting-IP is missing with fallback deny", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: ["203.0.113.50"],
				fallback: "deny",
			}),
		);
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
	});

	// Sync function enabled
	it("handles synchronous enabled function", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: () => true }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
	});

	// MT: retryAfter: 0 should still set the header
	it("includes Retry-After: 0 header when retryAfter is 0", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: true, retryAfter: 0 }));
		app.get("/test", ok);

		const res = await app.request(new Request("http://localhost/test"));
		expect(res.status).toBe(503);
		expect(res.headers.get("retry-after")).toBe("0");
	});

	// MT: allowedIps: [] should not bypass maintenance (empty list = no one allowed)
	it("returns 503 when allowedIps is empty array", async () => {
		const app = new Hono();
		app.use(
			"*",
			maintenance({
				enabled: true,
				allowedIps: [],
			}),
		);
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "203.0.113.50" },
			}),
		);
		expect(res.status).toBe(503);
	});

	// No allowedIps with enabled true → always maintenance
	it("returns 503 for all requests when no allowedIps", async () => {
		const app = new Hono();
		app.use("*", maintenance({ enabled: true }));
		app.get("/test", ok);

		const res = await app.request(
			new Request("http://localhost/test", {
				headers: { "cf-connecting-ip": "203.0.113.50" },
			}),
		);
		expect(res.status).toBe(503);
	});

	// CF3: cfInfo with chained middlewares (no recomputation)
	it("does not recompute cfInfo when already set", async () => {
		const app = new Hono();
		const { countryBlock } = await import("../src/country-block");
		app.use("*", countryBlock({ deny: ["CN"] }));
		app.use("*", maintenance({ enabled: false }));
		app.get("/test", (c) => {
			const info = c.get("cfInfo");
			return c.json({ country: info?.country });
		});

		const res = await app.request(createCfRequest("/test", { country: "JP" }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.country).toBe("JP");
	});
});
