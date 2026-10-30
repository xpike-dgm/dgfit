import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';

export interface ObservedUsage {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
}

/** Adds one PT AI request to today's usage row. Never throws. */
export async function recordAiUsage(
  userId: string,
  model: string,
  usage: ObservedUsage | undefined
): Promise<void> {
  try {
    const client = await getSystemClient();
    try {
      await client.query(
        `INSERT INTO dgfit_ai_usage (user_id, day, model, requests, input_tokens, output_tokens, cache_read_tokens)
         VALUES ($1, (now() AT TIME ZONE 'Europe/Istanbul')::date, $2, 1, $3, $4, $5)
         ON CONFLICT (user_id, day, model) DO UPDATE SET
           requests = dgfit_ai_usage.requests + 1,
           input_tokens = dgfit_ai_usage.input_tokens + EXCLUDED.input_tokens,
           output_tokens = dgfit_ai_usage.output_tokens + EXCLUDED.output_tokens,
           cache_read_tokens = dgfit_ai_usage.cache_read_tokens + EXCLUDED.cache_read_tokens`,
        [
          userId,
          model,
          usage?.inputTokens ?? 0,
          usage?.outputTokens ?? 0,
          usage?.inputTokenDetails?.cacheReadTokens ?? 0,
        ]
      );
    } finally {
      client.release();
    }
  } catch (error) {
    log('warn', '[DGFIT] Could not record AI usage:', error);
  }
}

/** Per-person totals for the last `days` days, plus a per-day series. */
export async function getAiUsageReport(days: number) {
  const client = await getSystemClient();
  try {
    const totals = await client.query(
      `SELECT u.id AS user_id, COALESCE(p.username, u.name) AS name,
              SUM(a.requests)::int AS requests,
              SUM(a.input_tokens)::bigint AS input_tokens,
              SUM(a.output_tokens)::bigint AS output_tokens,
              SUM(a.cache_read_tokens)::bigint AS cache_read_tokens,
              MAX(a.day) AS last_day,
              array_agg(DISTINCT a.model) AS models
         FROM dgfit_ai_usage a
         JOIN "user" u ON u.id = a.user_id
         LEFT JOIN profiles p ON p.id = u.id
        WHERE a.day >= CURRENT_DATE - $1::int
        GROUP BY u.id, p.username, u.name
        ORDER BY requests DESC`,
      [days]
    );
    const daily = await client.query(
      `SELECT day, SUM(requests)::int AS requests,
              SUM(input_tokens + output_tokens)::bigint AS tokens
         FROM dgfit_ai_usage
        WHERE day >= CURRENT_DATE - $1::int
        GROUP BY day ORDER BY day`,
      [days]
    );
    return { totals: totals.rows, daily: daily.rows };
  } finally {
    client.release();
  }
}
