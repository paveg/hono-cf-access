import { Hono } from "hono";
import type {
	AsnBlockOptions,
	BlockMiddlewareName,
	CfInfo,
	CountryBlockOptions,
	MaintenanceOptions,
} from "../../dist/index.js";
import {
	asnBlock,
	BlockConfigError,
	countryBlock,
	extractCfInfo,
	maintenance,
} from "../../dist/index.js";

const _cfInfo: CfInfo = {
	country: "JP",
	asn: 13335,
	city: "Tokyo",
};

const _countryDeny: CountryBlockOptions = {
	deny: ["KP", "IR"],
	fallback: "deny",
};

const _countryAllow: CountryBlockOptions = {
	allow: ["JP", "US"],
	onDenied: (c) => c.text("blocked", 403),
};

const _asnDeny: AsnBlockOptions = {
	deny: [13335],
	fallback: "allow",
};

const _maintenance: MaintenanceOptions = {
	enabled: true,
	allowedIps: ["203.0.113.1"],
	retryAfter: 60,
	fallback: "deny",
	onMaintenance: async (c) => c.text("maintenance", 503),
};

const _name: BlockMiddlewareName = "countryBlock";

const _err = new BlockConfigError("invalid", "asnBlock");
const _errName: BlockMiddlewareName = _err.middleware;

const app = new Hono();
app.use("*", countryBlock({ deny: ["KP"] }));
app.use("*", asnBlock({ allow: [13335] }));
app.use("*", maintenance({ enabled: false }));
app.get("/me", (c) => {
	const cf: CfInfo | undefined = extractCfInfo(c);
	const stored: CfInfo = c.var.cfInfo;
	return c.json({ cf, stored });
});

void _cfInfo;
void _countryDeny;
void _countryAllow;
void _asnDeny;
void _maintenance;
void _name;
void _err;
void _errName;
void app;
