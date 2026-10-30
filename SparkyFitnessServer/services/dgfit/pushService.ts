import webpush from 'web-push';
import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';

// DG FIT web push: reminders (workout, food, water) and friend events. The
// VAPID key pair is generated on first use and kept in dgfit_kv, so no extra
// environment variable is needed.

export interface NotificationSettings {
  workout_reminder: boolean;
  workout_reminder_time: string;
  food_reminder: boolean;
  food_reminder_time: string;
  water_reminder: boolean;
  friend_activity: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  workout_reminder: true,
  workout_reminder_time: '17:00',
  food_reminder: true,
  food_reminder_time: '20:30',
  water_reminder: false,
  friend_activity: true,
};

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type Row = Record<string, string>;
interface Queryable {
  query(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
}

async function withClient<T>(fn: (client: Queryable) => Promise<T>) {
  const client = await getSystemClient();
  try {
    return await fn(client as Queryable);
  } finally {
    client.release();
  }
}

let vapidReady: Promise<string> | null = null;

/** Loads (or creates once) the VAPID keys and returns the public key. */
export function ensureVapid(): Promise<string> {
  vapidReady ??= withClient(async (client) => {
    const existing = await client.query(
      "SELECT key, value FROM dgfit_kv WHERE key IN ('vapid_public', 'vapid_private')"
    );
    const map = new Map(existing.rows.map((r) => [r.key, r.value]));
    let publicKey = map.get('vapid_public');
    let privateKey = map.get('vapid_private');
    if (!publicKey || !privateKey) {
      const keys = webpush.generateVAPIDKeys();
      publicKey = keys.publicKey;
      privateKey = keys.privateKey;
      await client.query(
        `INSERT INTO dgfit_kv (key, value) VALUES ('vapid_public', $1), ('vapid_private', $2)
         ON CONFLICT (key) DO NOTHING`,
        [publicKey, privateKey]
      );
      // Another instance may have won the race; use what is stored.
      const stored = await client.query(
        "SELECT key, value FROM dgfit_kv WHERE key IN ('vapid_public', 'vapid_private')"
      );
      const storedMap = new Map(stored.rows.map((r) => [r.key, r.value]));
      publicKey = storedMap.get('vapid_public')!;
      privateKey = storedMap.get('vapid_private')!;
    }
    const contact =
      process.env.SPARKY_FITNESS_ADMIN_EMAIL || 'admin@dgfit.local';
    webpush.setVapidDetails(`mailto:${contact}`, publicKey, privateKey);
    return publicKey;
  }).catch((error) => {
    vapidReady = null;
    throw error;
  });
  return vapidReady;
}

export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | undefined
) {
  await withClient((client) =>
    client.query(
      `INSERT INTO dgfit_push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent`,
      [
        subscription.endpoint,
        userId,
        subscription.keys.p256dh,
        subscription.keys.auth,
        userAgent?.slice(0, 300) ?? null,
      ]
    )
  );
}

export async function deleteSubscription(userId: string, endpoint: string) {
  await withClient((client) =>
    client.query(
      'DELETE FROM dgfit_push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, userId]
    )
  );
}

export async function countSubscriptions(userId: string): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query(
      'SELECT COUNT(*) AS n FROM dgfit_push_subscriptions WHERE user_id = $1',
      [userId]
    );
    return Number(result.rows[0]?.n ?? 0);
  });
}

export async function getSettings(
  userId: string
): Promise<NotificationSettings> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT workout_reminder, to_char(workout_reminder_time, 'HH24:MI') AS workout_reminder_time,
              food_reminder, to_char(food_reminder_time, 'HH24:MI') AS food_reminder_time,
              water_reminder, friend_activity
         FROM dgfit_notification_settings WHERE user_id = $1`,
      [userId]
    );
    return (
      (result.rows[0] as unknown as NotificationSettings | undefined) ?? {
        ...DEFAULT_SETTINGS,
      }
    );
  });
}

export async function updateSettings(
  userId: string,
  changes: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const next = { ...(await getSettings(userId)), ...changes };
  await withClient((client) =>
    client.query(
      `INSERT INTO dgfit_notification_settings (user_id, workout_reminder, workout_reminder_time,
         food_reminder, food_reminder_time, water_reminder, friend_activity, updated_at)
       VALUES ($1, $2, $3::time, $4, $5::time, $6, $7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         workout_reminder = EXCLUDED.workout_reminder,
         workout_reminder_time = EXCLUDED.workout_reminder_time,
         food_reminder = EXCLUDED.food_reminder,
         food_reminder_time = EXCLUDED.food_reminder_time,
         water_reminder = EXCLUDED.water_reminder,
         friend_activity = EXCLUDED.friend_activity,
         updated_at = now()`,
      [
        userId,
        next.workout_reminder,
        next.workout_reminder_time,
        next.food_reminder,
        next.food_reminder_time,
        next.water_reminder,
        next.friend_activity,
      ]
    )
  );
  return next;
}

/** Sends to every device of a person; drops subscriptions the browser revoked. */
export async function sendToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  await ensureVapid();
  const subs = await withClient(async (client) => {
    const result = await client.query(
      'SELECT endpoint, p256dh, auth FROM dgfit_push_subscriptions WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  });
  let delivered = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 6 * 3600 }
      );
      delivered++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await withClient((client) =>
          client.query(
            'DELETE FROM dgfit_push_subscriptions WHERE endpoint = $1',
            [sub.endpoint]
          )
        );
      } else {
        log('warn', `[DGFIT] Push to ${userId} failed (${status ?? 'error'})`);
      }
    }
  }
  return delivered;
}

/** Friend events (requests, acceptances), if the person allows them. */
export async function notifyFriendEvent(userId: string, payload: PushPayload) {
  try {
    if (!(await getSettings(userId)).friend_activity) return;
    await sendToUser(userId, payload);
  } catch (error) {
    log('warn', '[DGFIT] Friend notification failed:', error);
  }
}

// --- Reminders -------------------------------------------------------------

const DAY_NAMES = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];

/** Claims today's reminder of this kind; false if it was already sent. */
async function claim(
  client: Queryable,
  userId: string,
  kind: string,
  day: string
) {
  const result = await client.query(
    `INSERT INTO dgfit_push_log (user_id, kind, day) VALUES ($1, $2, $3::date)
     ON CONFLICT DO NOTHING`,
    [userId, kind, day]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Runs every few minutes. For each person with a device, sends a reminder
 * once its time has come today (in their timezone) and it still applies:
 * a planned workout not logged yet, no food logged yet, or little water.
 */
export async function runReminders(): Promise<void> {
  const candidates = await withClient(async (client) => {
    const result = await client.query(
      `SELECT DISTINCT s.user_id,
              COALESCE(NULLIF(up.timezone, ''), 'Europe/Istanbul') AS tz,
              COALESCE(ns.workout_reminder, TRUE) AS workout_reminder,
              to_char(COALESCE(ns.workout_reminder_time, '17:00'), 'HH24:MI') AS workout_time,
              COALESCE(ns.food_reminder, TRUE) AS food_reminder,
              to_char(COALESCE(ns.food_reminder_time, '20:30'), 'HH24:MI') AS food_time,
              COALESCE(ns.water_reminder, FALSE) AS water_reminder
         FROM dgfit_push_subscriptions s
         LEFT JOIN user_preferences up ON up.user_id = s.user_id
         LEFT JOIN dgfit_notification_settings ns ON ns.user_id = s.user_id`
    );
    return result.rows;
  });

  for (const row of candidates) {
    try {
      await withClient(async (client) => {
        const now = await client.query(
          `SELECT to_char(now() AT TIME ZONE $1, 'YYYY-MM-DD') AS day,
                  to_char(now() AT TIME ZONE $1, 'HH24:MI') AS hhmm,
                  EXTRACT(DOW FROM now() AT TIME ZONE $1)::int AS dow`,
          [row.tz]
        );
        const { day, hhmm } = now.rows[0];
        const dow = Number(now.rows[0].dow);
        const userId = row.user_id;
        const due = (time: string) => hhmm >= time && hhmm < '23:30';

        if (String(row.workout_reminder) === 'true' && due(row.workout_time)) {
          const planned = await client.query(
            `SELECT COALESCE(a.session_name, wp.name, e.name) AS name
               FROM workout_plan_templates t
               JOIN workout_plan_template_assignments a ON a.template_id = t.id
               LEFT JOIN workout_presets wp ON wp.id = a.workout_preset_id
               LEFT JOIN exercises e ON e.id = a.exercise_id
              WHERE t.user_id = $1 AND t.is_active AND t.schedule_type = 'weekly'
                AND a.day_of_week = $2
                AND (t.start_date IS NULL OR t.start_date <= $3::date)
                AND (t.end_date IS NULL OR t.end_date >= $3::date)
              ORDER BY a.sort_order LIMIT 1`,
            [userId, dow, day]
          );
          if (planned.rows[0]) {
            const done = await client.query(
              'SELECT 1 FROM exercise_entries WHERE user_id = $1 AND entry_date = $2::date LIMIT 1',
              [userId, day]
            );
            if (
              !done.rowCount &&
              (await claim(client, userId, 'workout', day))
            ) {
              await sendToUser(userId, {
                title: `Bugün ${planned.rows[0].name} 💪`,
                body: `${DAY_NAMES[dow]} antrenmanın seni bekliyor. Salona girince tek dokunuşla başlat.`,
                url: '/antrenman',
                tag: 'workout-reminder',
              });
            }
          }
        }

        if (String(row.food_reminder) === 'true' && due(row.food_time)) {
          const food = await client.query(
            'SELECT 1 FROM food_entries WHERE user_id = $1 AND entry_date = $2::date LIMIT 1',
            [userId, day]
          );
          if (!food.rowCount && (await claim(client, userId, 'food', day))) {
            await sendToUser(userId, {
              title: 'Bugün yemek girmedin 🍽️',
              body: "Yediklerini yaz ya da fotoğrafını PT AI'a at, kalorini hesaplasın.",
              url: '/',
              tag: 'food-reminder',
            });
          }
        }

        if (String(row.water_reminder) === 'true' && due('15:00')) {
          const water = await client
            .query(
              `SELECT COALESCE(SUM(water_ml), 0) AS ml FROM water_intake
              WHERE user_id = $1 AND entry_date = $2::date`,
              [userId, day]
            )
            .catch(() => ({ rows: [{ ml: '0' }], rowCount: 1 }));
          if (
            Number(water.rows[0]?.ml ?? 0) < 1000 &&
            (await claim(client, userId, 'water', day))
          ) {
            await sendToUser(userId, {
              title: 'Su içmeyi unutma 💧',
              body: 'Bugün 1 litreden az su kaydettin.',
              url: '/',
              tag: 'water-reminder',
            });
          }
        }
      });
    } catch (error) {
      log('warn', `[DGFIT] Reminder run failed for ${row.user_id}:`, error);
    }
  }
}
