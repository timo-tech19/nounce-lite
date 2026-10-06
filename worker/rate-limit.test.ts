import { describe, expect, it } from "vitest";
import { consume, type CounterStore } from "./rate-limit";
import { memoryStore } from "./test-helpers";

const limits = { perIp: 2, global: 3 };
const at = (iso: string) => new Date(iso);

const spy = (): CounterStore & { scopes: string[] } => {
	const inner = memoryStore();
	const scopes: string[] = [];
	return { scopes, hit: (scope, day, bucket) => (scopes.push(scope), inner.hit(scope, day, bucket)) };
};

describe("consume", () => {
	it("allows a visitor up to the limit, then refuses", async () => {
		const store = memoryStore();
		const hit = () => consume(store, { route: "check", ip: "1.1.1.1", limits, now: at("2026-10-06T10:00:00Z") });
		expect(await hit()).toBeNull();
		expect(await hit()).toBeNull();
		expect(await hit()).toMatchObject({ status: 429, code: "rate_limited" });
	});

	it("counts each route separately", async () => {
		const store = memoryStore();
		const now = at("2026-10-06T10:00:00Z");
		await consume(store, { route: "sentence", ip: "1.1.1.1", limits, now });
		await consume(store, { route: "sentence", ip: "1.1.1.1", limits, now });
		expect(await consume(store, { route: "check", ip: "1.1.1.1", limits: { ...limits, global: 10 }, now })).toBeNull();
	});

	it("resets at midnight UTC", async () => {
		const store = memoryStore();
		const hit = (iso: string) => consume(store, { route: "check", ip: "1.1.1.1", limits, now: at(iso) });
		await hit("2026-10-06T23:59:00Z");
		await hit("2026-10-06T23:59:30Z");
		expect(await hit("2026-10-06T23:59:59Z")).not.toBeNull();
		expect(await hit("2026-10-07T00:00:01Z")).toBeNull();
	});

	it("enforces the global cap across visitors", async () => {
		const store = memoryStore();
		const now = at("2026-10-06T10:00:00Z");
		for (const ip of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
			expect(await consume(store, { route: "check", ip, limits, now })).toBeNull();
		}
		expect(await consume(store, { route: "check", ip: "4.4.4.4", limits, now })).toMatchObject({
			message: expect.stringMatching(/across all visitors/),
		});
	});

	it("never stores the raw IP", async () => {
		const store = spy();
		await consume(store, { route: "check", ip: "203.0.113.7", limits, now: at("2026-10-06T10:00:00Z") });
		expect(store.scopes.join()).not.toContain("203.0.113.7");
	});
});
