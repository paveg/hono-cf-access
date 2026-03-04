const BASE_TYPE = "https://hono-cf-access.dev/errors";

interface ProblemDetail {
	type: string;
	title: string;
	status: number;
	detail: string;
	instance?: string;
}

function problemResponse(problem: ProblemDetail, extraHeaders?: Record<string, string>): Response {
	return new Response(JSON.stringify(problem), {
		status: problem.status,
		headers: {
			"content-type": "application/problem+json",
			...extraHeaders,
		},
	});
}

export function countryDeniedResponse(country: string, instance?: string): Response {
	return problemResponse({
		type: `${BASE_TYPE}/country-denied`,
		title: "Forbidden",
		status: 403,
		detail: `Access from country '${country}' is not allowed`,
		instance,
	});
}

export function asnDeniedResponse(asn: number, instance?: string): Response {
	return problemResponse({
		type: `${BASE_TYPE}/asn-denied`,
		title: "Forbidden",
		status: 403,
		detail: `Access from ASN ${asn} is not allowed`,
		instance,
	});
}

export function maintenanceResponse(retryAfter?: number | string, instance?: string): Response {
	return problemResponse(
		{
			type: `${BASE_TYPE}/maintenance`,
			title: "Service Unavailable",
			status: 503,
			detail: "The service is currently under maintenance",
			instance,
		},
		retryAfter !== undefined ? { "retry-after": String(retryAfter) } : undefined,
	);
}

export function cfUnavailableResponse(instance?: string): Response {
	return problemResponse({
		type: `${BASE_TYPE}/cf-unavailable`,
		title: "Forbidden",
		status: 403,
		detail: "Cloudflare request metadata is not available",
		instance,
	});
}
