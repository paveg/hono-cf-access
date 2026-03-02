import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { extractCfInfo } from "../src/cf";
import { createCfRequest } from "./helpers/mock-cf";

describe("extractCfInfo", () => {
	// CF1: cfInfo is available after extraction with full data
	it("extracts all fields from request.cf", () => {
		const app = new Hono();
		app.use("*", async (c, next) => {
			const info = extractCfInfo(c);
			if (info) c.set("cfInfo", info);
			await next();
		});
		app.get("/test", (c) => c.json(c.get("cfInfo")));

		const req = createCfRequest("/test", {
			country: "JP",
			asn: 13335,
			city: "Tokyo",
			region: "Tokyo",
			regionCode: "13",
			continent: "AS",
			latitude: "35.6895",
			longitude: "139.6917",
			timezone: "Asia/Tokyo",
			postalCode: "100-0001",
		});

		return app.request(req).then(async (res) => {
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toEqual({
				country: "JP",
				asn: 13335,
				city: "Tokyo",
				region: "Tokyo",
				regionCode: "13",
				continent: "AS",
				latitude: "35.6895",
				longitude: "139.6917",
				timezone: "Asia/Tokyo",
				postalCode: "100-0001",
			});
		});
	});

	// CF4: cfInfo when request.cf is undefined
	it("returns undefined when request.cf is undefined", () => {
		const app = new Hono();
		app.use("*", async (c, next) => {
			const info = extractCfInfo(c);
			if (info) c.set("cfInfo", info);
			await next();
		});
		app.get("/test", (c) => {
			const info = c.get("cfInfo");
			return c.json({ hasInfo: info !== undefined });
		});

		const req = new Request("http://localhost/test");
		return app.request(req).then(async (res) => {
			const body = await res.json();
			expect(body.hasInfo).toBe(false);
		});
	});

	// CF5: partially missing fields
	it("handles partially missing fields", () => {
		const app = new Hono();
		app.use("*", async (c, next) => {
			const info = extractCfInfo(c);
			if (info) c.set("cfInfo", info);
			await next();
		});
		app.get("/test", (c) => c.json(c.get("cfInfo")));

		const req = createCfRequest("/test", {
			country: "US",
			asn: 13335,
		});

		return app.request(req).then(async (res) => {
			const body = await res.json();
			expect(body.country).toBe("US");
			expect(body.asn).toBe(13335);
			expect(body.city).toBeUndefined();
			expect(body.region).toBeUndefined();
			expect(body.timezone).toBeUndefined();
		});
	});

	// Country code uppercase normalization
	it("normalizes country code to uppercase", () => {
		const app = new Hono();
		app.use("*", async (c, next) => {
			const info = extractCfInfo(c);
			if (info) c.set("cfInfo", info);
			await next();
		});
		app.get("/test", (c) => c.json(c.get("cfInfo")));

		const req = createCfRequest("/test", {
			country: "jp" as unknown as string,
		});

		return app.request(req).then(async (res) => {
			const body = await res.json();
			expect(body.country).toBe("JP");
		});
	});
});
