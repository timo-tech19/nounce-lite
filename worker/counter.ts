import { DurableObject } from "cloudflare:workers";
import type { CounterStore } from "./rate-limit";

/**
 * Exact per-day counters. One instance per scope (a visitor, or "global"); a Durable Object
 * handles one request at a time, so concurrent hits can't race the way KV counters do.
 */
export class DailyCounter extends DurableObject<Env> {
	hit(day: string, bucket: string): number {
		const sql = this.ctx.storage.sql;
		sql.exec(
			"CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, bucket TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, bucket))",
		);
		// Yesterday's counts are no longer needed.
		sql.exec("DELETE FROM hits WHERE day < ?", day);
		return sql
			.exec<{ n: number }>(
				"INSERT INTO hits (day, bucket, n) VALUES (?, ?, 1) ON CONFLICT(day, bucket) DO UPDATE SET n = n + 1 RETURNING n",
				day,
				bucket,
			)
			.one().n;
	}
}

export const durableObjectStore = (env: Env): CounterStore => ({
	hit: (scope, day, bucket) => env.COUNTER.getByName(scope).hit(day, bucket),
});
