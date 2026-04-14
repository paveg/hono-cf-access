import { describe, expect, it } from "vitest";
import { asnBlock } from "../src/asn-block";
import { countryBlock } from "../src/country-block";
import { BlockConfigError } from "../src/errors";

describe("BlockConfigError", () => {
	it("is an Error subclass with the expected name", () => {
		const e = new BlockConfigError("msg", "countryBlock");
		expect(e).toBeInstanceOf(Error);
		expect(e).toBeInstanceOf(BlockConfigError);
		expect(e.name).toBe("BlockConfigError");
		expect(e.middleware).toBe("countryBlock");
	});

	it("countryBlock throws BlockConfigError with middleware prefix when both deny and allow given", () => {
		expect(() => countryBlock({ deny: ["CN"], allow: ["JP"] } as never)).toThrow(BlockConfigError);
		expect(() => countryBlock({ deny: ["CN"], allow: ["JP"] } as never)).toThrow(/countryBlock:/);
	});

	it("asnBlock throws BlockConfigError when neither deny nor allow specified", () => {
		expect(() => asnBlock({} as never)).toThrow(BlockConfigError);
		expect(() => asnBlock({} as never)).toThrow(/asnBlock:/);
	});

	it("countryBlock throws BlockConfigError on empty deny array", () => {
		expect(() => countryBlock({ deny: [] })).toThrow(BlockConfigError);
		expect(() => countryBlock({ deny: [] })).toThrow(/countryBlock:/);
	});
});
