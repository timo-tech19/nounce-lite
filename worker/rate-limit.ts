import { createMiddleware } from "hono/factory";
import { ApiError } from "./errors";

/** Counts hits per scope (a visitor, or everyone) per day. */
export interface CounterStore {
	/** Adds one to the counter and returns the new total. */
	hit(scope: string, day: string, bucket: string): Promise<number>;
}

export interface Limits {
	/** Requests one visitor can make per route per UTC day. */
	perIp: number;
	/** Requests everyone together can make per UTC day: the cap on what a public demo can spend. */
	global: number;
}

/** Visitors are identified by a hash of their IP salted with the date, so raw IPs are never stored. */
async function visitorId(ip: string, day: string) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}:${ip}`));
	return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Counts this request against the visitor's and the global daily budget; null means it may proceed. */
export async function consume(
	store: CounterStore,
	{ route, ip, limits, now = new Date() }: { route: string; ip: string; limits: Limits; now?: Date },
): Promise<ApiError | null> {
	const day = now.toISOString().slice(0, 10);

	const mine = await store.hit(`ip:${await visitorId(ip, day)}`, day, route);
	if (mine > limits.perIp) {
		return new ApiError(
			429,
			"rate_limited",
			"You've reached today's limit for this demo. It resets at midnight UTC, or clone the repo to run it with your own key.",
		);
	}

	const everyone = await store.hit("global", day, "all");
	if (everyone > limits.global) {
		return new ApiError(
			429,
			"rate_limited",
			"The demo has reached its daily limit across all visitors. It resets at midnight UTC.",
		);
	}
	return null;
}

export const readLimits = (env: Env): Limits => ({
	perIp: Number(env.DAILY_LIMIT_PER_IP) || 25,
	global: Number(env.DAILY_LIMIT_GLOBAL) || 600,
});

export const rateLimit = (route: string, getStore: (env: Env) => CounterStore) =>
	createMiddleware<{ Bindings: Env }>(async (c, next) => {
		// Cloudflare sets this on every request that reaches a Worker.
		const ip = c.req.header("cf-connecting-ip") ?? "unknown";
		const rejection = await consume(getStore(c.env), { route, ip, limits: readLimits(c.env) });
		if (rejection) throw rejection;
		await next();
	});
