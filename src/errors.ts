const BASE_TYPE = "https://hono-cf-access.dev/errors";

interface ProblemDetail {
	type: string;
	title: string;
	status: number;
	detail: string;
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

export function countryDeniedResponse(country: string): Response {
	return problemResponse({
		type: `${BASE_TYPE}/country-denied`,
		title: "Forbidden",
		status: 403,
		detail: `Access from country '${country}' is not allowed`,
	});
}

export function asnDeniedResponse(asn: number): Response {
	return problemResponse({
		type: `${BASE_TYPE}/asn-denied`,
		title: "Forbidden",
		status: 403,
		detail: `Access from ASN ${asn} is not allowed`,
	});
}

export function maintenanceResponse(retryAfter?: number | string): Response {
	return problemResponse(
		{
			type: `${BASE_TYPE}/maintenance`,
			title: "Service Unavailable",
			status: 503,
			detail: "The service is currently under maintenance",
		},
		retryAfter !== undefined ? { "retry-after": String(retryAfter) } : undefined,
	);
}

export function cfUnavailableResponse(): Response {
	return problemResponse({
		type: `${BASE_TYPE}/cf-unavailable`,
		title: "Forbidden",
		status: 403,
		detail: "Cloudflare request metadata is not available",
	});
}
