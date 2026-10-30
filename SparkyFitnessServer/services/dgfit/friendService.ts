import { getSystemClient } from '../../db/poolManager.js';

// DG FIT friends. Everything here runs on the system client, so every read of
// another person's data goes through assertFriends() and their privacy
// settings first.

export class FriendError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export interface PrivacySettings {
  share_workouts: boolean;
  share_weight: boolean;
  share_nutrition: boolean;
  share_measurements: boolean;
  share_photos: boolean;
  share_programs: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  share_workouts: true,
  share_weight: true,
  share_nutrition: true,
  share_measurements: true,
  share_photos: true,
  share_programs: true,
};

export interface PublicUser {
  id: string;
  username: string | null;
  name: string;
  avatar_url: string | null;
}

// Columns come back as strings (numeric, date) or booleans/arrays; callers
// convert numbers explicitly.
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

const PUBLIC_USER_SQL =
  "u.id, p.username, COALESCE(NULLIF(p.full_name, ''), u.name) AS name, p.avatar_url";

export async function getPrivacy(userId: string): Promise<PrivacySettings> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT share_workouts, share_weight, share_nutrition, share_measurements,
              share_photos, share_programs
         FROM dgfit_privacy_settings WHERE user_id = $1`,
      [userId]
    );
    return (
      (result.rows[0] as unknown as PrivacySettings | undefined) ?? {
        ...DEFAULT_PRIVACY,
      }
    );
  });
}

export async function updatePrivacy(
  userId: string,
  changes: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const next = { ...(await getPrivacy(userId)), ...changes };
  await withClient((client) =>
    client.query(
      `INSERT INTO dgfit_privacy_settings (user_id, share_workouts, share_weight,
         share_nutrition, share_measurements, share_photos, share_programs, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         share_workouts = EXCLUDED.share_workouts,
         share_weight = EXCLUDED.share_weight,
         share_nutrition = EXCLUDED.share_nutrition,
         share_measurements = EXCLUDED.share_measurements,
         share_photos = EXCLUDED.share_photos,
         share_programs = EXCLUDED.share_programs,
         updated_at = now()`,
      [
        userId,
        next.share_workouts,
        next.share_weight,
        next.share_nutrition,
        next.share_measurements,
        next.share_photos,
        next.share_programs,
      ]
    )
  );
  return next;
}

export async function getFriendIds(userId: string): Promise<string[]> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS id
         FROM dgfit_friendships
        WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)`,
      [userId]
    );
    return result.rows.map((row) => row.id);
  });
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT 1 FROM dgfit_friendships
        WHERE status = 'accepted'
          AND LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
          AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
      [a, b]
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function assertFriends(viewerId: string, ownerId: string) {
  if (!(await areFriends(viewerId, ownerId))) {
    throw new FriendError('Bu kişi arkadaş listende değil.', 403);
  }
}

export async function listFriends(userId: string) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT f.id AS friendship_id, f.status, f.created_at, f.responded_at,
              (f.requester_id = $1) AS outgoing, ${PUBLIC_USER_SQL}
         FROM dgfit_friendships f
         JOIN "user" u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         LEFT JOIN profiles p ON p.id = u.id
        WHERE f.requester_id = $1 OR f.addressee_id = $1
        ORDER BY f.status, COALESCE(f.responded_at, f.created_at) DESC`,
      [userId]
    );
    const toUser = (row: Row) => ({
      friendship_id: row.friendship_id,
      id: row.id,
      username: row.username,
      name: row.name,
      avatar_url: row.avatar_url,
      since: row.responded_at ?? row.created_at,
    });
    return {
      friends: result.rows.filter((r) => r.status === 'accepted').map(toUser),
      incoming: result.rows
        .filter((r) => r.status === 'pending' && !r.outgoing)
        .map(toUser),
      outgoing: result.rows
        .filter((r) => r.status === 'pending' && r.outgoing)
        .map(toUser),
    };
  });
}

export async function searchUsers(userId: string, query: string) {
  const term = query.trim().toLowerCase().replace(/^@/, '');
  if (term.length < 2) return [];
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT ${PUBLIC_USER_SQL},
              f.status AS friendship_status,
              (f.requester_id = $1) AS outgoing
         FROM profiles p
         JOIN "user" u ON u.id = p.id
         LEFT JOIN dgfit_friendships f
           ON LEAST(f.requester_id, f.addressee_id) = LEAST(u.id, $1::uuid)
          AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(u.id, $1::uuid)
        WHERE u.id <> $1 AND p.username IS NOT NULL
          AND (p.username ILIKE $2 || '%' OR p.full_name ILIKE '%' || $2 || '%')
        ORDER BY (p.username = $2) DESC, p.username
        LIMIT 10`,
      [userId, term]
    );
    return result.rows;
  });
}

export async function sendRequest(userId: string, username: string) {
  const term = username.trim().toLowerCase().replace(/^@/, '');
  return withClient(async (client) => {
    const target = await client.query(
      'SELECT id FROM profiles WHERE lower(username) = $1',
      [term]
    );
    const targetId: string | undefined = target.rows[0]?.id;
    if (!targetId) throw new FriendError('Bu kullanıcı adı bulunamadı.', 404);
    if (targetId === userId) {
      throw new FriendError('Kendine arkadaşlık isteği gönderemezsin.');
    }
    const existing = await client.query(
      `SELECT id, status, requester_id FROM dgfit_friendships
        WHERE LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
          AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
      [userId, targetId]
    );
    const row = existing.rows[0];
    if (row?.status === 'accepted') {
      throw new FriendError('Zaten arkadaşsınız.');
    }
    if (row && row.requester_id === userId) {
      throw new FriendError('İstek zaten gönderildi.');
    }
    if (row) {
      // They already asked us: sending back means accepting.
      await client.query(
        "UPDATE dgfit_friendships SET status = 'accepted', responded_at = now() WHERE id = $1",
        [row.id]
      );
      return { status: 'accepted' as const };
    }
    await client.query(
      'INSERT INTO dgfit_friendships (requester_id, addressee_id) VALUES ($1, $2)',
      [userId, targetId]
    );
    return { status: 'pending' as const };
  });
}

export async function acceptRequest(userId: string, friendshipId: number) {
  return withClient(async (client) => {
    const result = await client.query(
      `UPDATE dgfit_friendships SET status = 'accepted', responded_at = now()
        WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [friendshipId, userId]
    );
    if (!result.rowCount) throw new FriendError('İstek bulunamadı.', 404);
  });
}

/** Declines/cancels a request or removes a friend. */
export async function removeFriendship(userId: string, friendshipId: number) {
  return withClient(async (client) => {
    const result = await client.query(
      `DELETE FROM dgfit_friendships
        WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)`,
      [friendshipId, userId]
    );
    if (!result.rowCount) throw new FriendError('Kayıt bulunamadı.', 404);
  });
}

async function getPublicUser(userId: string): Promise<PublicUser> {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT ${PUBLIC_USER_SQL} FROM "user" u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1`,
      [userId]
    );
    if (!result.rows[0]) throw new FriendError('Kullanıcı bulunamadı.', 404);
    return result.rows[0] as unknown as PublicUser;
  });
}

async function privacyFor(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, PrivacySettings>();
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT user_id, share_workouts, share_weight, share_nutrition,
              share_measurements, share_photos, share_programs
         FROM dgfit_privacy_settings WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    );
    const map = new Map<string, PrivacySettings>();
    for (const id of userIds) map.set(id, { ...DEFAULT_PRIVACY });
    for (const row of result.rows) {
      const { user_id, ...settings } = row;
      map.set(user_id, settings as unknown as PrivacySettings);
    }
    return map;
  });
}

// Workout sessions: preset sessions grouped by exercise_preset_entry_id,
// single exercises by entry.
const SESSION_SQL = `
  WITH sets AS (
    SELECT ee.user_id, ee.entry_date, ee.exercise_preset_entry_id, ee.id AS entry_id,
           ee.exercise_name, ee.created_at,
           COUNT(s.id) FILTER (WHERE s.set_type IS NULL OR s.set_type NOT ILIKE 'warm%') AS set_count,
           COALESCE(SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)), 0) AS volume,
           BOOL_OR(COALESCE(s.is_pr, FALSE)) AS has_pr
      FROM exercise_entries ee
      LEFT JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
     WHERE ee.user_id = ANY($1::uuid[]) AND ee.entry_date >= $2::date
     GROUP BY ee.id
  )
  SELECT s.user_id, s.entry_date,
         COALESCE(pe.name, MIN(s.exercise_name)) AS name,
         COUNT(*) AS exercise_count,
         SUM(s.set_count) AS set_count,
         SUM(s.volume) AS volume,
         BOOL_OR(s.has_pr) AS has_pr,
         MAX(s.created_at) AS logged_at,
         ARRAY_AGG(s.exercise_name ORDER BY s.created_at) AS exercises
    FROM sets s
    LEFT JOIN exercise_preset_entries pe ON pe.id = s.exercise_preset_entry_id
   GROUP BY s.user_id, s.entry_date, COALESCE(s.exercise_preset_entry_id::text, s.entry_id::text), pe.name`;

export async function getFeed(userId: string, days = 14) {
  const friendIds = await getFriendIds(userId);
  const ids = [userId, ...friendIds];
  const privacy = await privacyFor(ids);
  const since = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const workoutIds = ids.filter((id) => privacy.get(id)?.share_workouts);
  const weightIds = ids.filter((id) => privacy.get(id)?.share_weight);

  return withClient(async (client) => {
    const users = await client.query(
      `SELECT ${PUBLIC_USER_SQL} FROM "user" u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = ANY($1::uuid[])`,
      [ids]
    );
    const workouts = workoutIds.length
      ? await client.query(SESSION_SQL, [workoutIds, since])
      : { rows: [] as Row[] };
    const weights = weightIds.length
      ? await client.query(
          `SELECT user_id, entry_date, weight, updated_at,
                  LAG(weight) OVER (PARTITION BY user_id ORDER BY entry_date) AS previous
             FROM check_in_measurements
            WHERE user_id = ANY($1::uuid[]) AND weight IS NOT NULL`,
          [weightIds]
        )
      : { rows: [] as Row[] };

    const items = [
      ...workouts.rows.map((w) => ({
        type: 'workout' as const,
        user_id: w.user_id,
        date: w.entry_date,
        at: w.logged_at,
        name: w.name,
        exercise_count: Number(w.exercise_count),
        set_count: Number(w.set_count),
        volume_kg: Math.round(Number(w.volume)),
        has_pr: w.has_pr,
        exercises: w.exercises,
      })),
      ...weights.rows.map((w) => ({
        type: 'weight' as const,
        user_id: w.user_id,
        date: w.entry_date,
        at: w.updated_at,
        weight_kg: Number(w.weight),
        change_kg:
          w.previous !== null && w.previous !== undefined
            ? Math.round((Number(w.weight) - Number(w.previous)) * 10) / 10
            : null,
      })),
    ]
      .filter((item) => new Date(item.date) >= new Date(since))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 60);

    return { users: users.rows, items };
  });
}

export async function getFriendProfile(viewerId: string, ownerId: string) {
  await assertFriends(viewerId, ownerId);
  const user = await getPublicUser(ownerId);
  const privacy = (await privacyFor([ownerId])).get(ownerId)!;
  const since = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return withClient(async (client) => {
    const profile: Record<string, unknown> = { user, privacy };

    if (privacy.share_weight) {
      const weights = await client.query(
        `SELECT entry_date, weight FROM check_in_measurements
          WHERE user_id = $1 AND weight IS NOT NULL AND entry_date >= $2::date
          ORDER BY entry_date`,
        [ownerId, since]
      );
      profile.weights = weights.rows.map((r) => ({
        date: r.entry_date,
        weight_kg: Number(r.weight),
      }));
    }

    if (privacy.share_measurements) {
      const latest = await client.query(
        `SELECT entry_date, waist, neck, hips, body_fat_percentage, muscle_mass_kg
           FROM check_in_measurements
          WHERE user_id = $1 AND (waist IS NOT NULL OR body_fat_percentage IS NOT NULL OR neck IS NOT NULL OR hips IS NOT NULL)
          ORDER BY entry_date DESC LIMIT 1`,
        [ownerId]
      );
      profile.measurements = latest.rows[0] ?? null;
    }

    if (privacy.share_nutrition) {
      const nutrition = await client.query(
        `SELECT entry_date,
                ROUND(SUM(calories * quantity / NULLIF(serving_size, 0))) AS calories,
                ROUND(SUM(protein * quantity / NULLIF(serving_size, 0))) AS protein,
                ROUND(SUM(carbs * quantity / NULLIF(serving_size, 0))) AS carbs,
                ROUND(SUM(fat * quantity / NULLIF(serving_size, 0))) AS fat
           FROM food_entries
          WHERE user_id = $1 AND entry_date >= CURRENT_DATE - 13
          GROUP BY entry_date ORDER BY entry_date DESC`,
        [ownerId]
      );
      profile.nutrition = nutrition.rows.map((r) => ({
        date: r.entry_date,
        calories: Number(r.calories),
        protein: Number(r.protein),
        carbs: Number(r.carbs),
        fat: Number(r.fat),
      }));
    }

    if (privacy.share_workouts) {
      const sessions = await client.query(
        `${SESSION_SQL} ORDER BY logged_at DESC LIMIT 10`,
        [[ownerId], since]
      );
      profile.workouts = sessions.rows.map((w) => ({
        date: w.entry_date,
        name: w.name,
        set_count: Number(w.set_count),
        volume_kg: Math.round(Number(w.volume)),
        has_pr: w.has_pr,
        exercises: w.exercises,
      }));
      const bests = await client.query(
        `SELECT DISTINCT ON (ee.exercise_id) ee.exercise_id, ee.exercise_name,
                s.weight, s.reps, ee.entry_date,
                s.weight * (1 + s.reps / 30.0) AS e1rm
           FROM exercise_entries ee
           JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
          WHERE ee.user_id = $1 AND s.weight > 0 AND s.reps > 0
            AND (s.set_type IS NULL OR s.set_type NOT ILIKE 'warm%')
          ORDER BY ee.exercise_id, e1rm DESC`,
        [ownerId]
      );
      profile.best_lifts = bests.rows
        .map((r) => ({
          exercise_id: r.exercise_id,
          exercise_name: r.exercise_name,
          weight_kg: Number(r.weight),
          reps: r.reps,
          e1rm_kg: Math.round(Number(r.e1rm)),
          date: r.entry_date,
        }))
        .sort((a, b) => b.e1rm_kg - a.e1rm_kg)
        .slice(0, 8);
    }

    if (privacy.share_programs) {
      const plans = await client.query(
        `SELECT t.id, t.plan_name, t.is_active,
                COALESCE(json_agg(json_build_object(
                  'day_of_week', a.day_of_week,
                  'name', COALESCE(a.session_name, wp.name, e.name)
                ) ORDER BY a.day_of_week, a.sort_order) FILTER (WHERE a.id IS NOT NULL), '[]') AS days
           FROM workout_plan_templates t
           LEFT JOIN workout_plan_template_assignments a ON a.template_id = t.id
           LEFT JOIN workout_presets wp ON wp.id = a.workout_preset_id
           LEFT JOIN exercises e ON e.id = a.exercise_id
          WHERE t.user_id = $1 AND t.schedule_type = 'weekly'
          GROUP BY t.id ORDER BY t.is_active DESC, t.updated_at DESC`,
        [ownerId]
      );
      profile.programs = plans.rows;
    }

    return profile;
  });
}

/** One friend's (or your own) history for an exercise: best set per day. */
export async function getExerciseHistory(
  viewerId: string,
  ownerId: string,
  exerciseId: string
) {
  await assertFriends(viewerId, ownerId);
  const privacy = (await privacyFor([ownerId])).get(ownerId)!;
  if (!privacy.share_workouts) return [];
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT DISTINCT ON (ee.entry_date) ee.entry_date, s.weight, s.reps,
              s.weight * (1 + s.reps / 30.0) AS e1rm
         FROM exercise_entries ee
         JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
        WHERE ee.user_id = $1 AND ee.exercise_id = $2 AND s.weight > 0 AND s.reps > 0
          AND (s.set_type IS NULL OR s.set_type NOT ILIKE 'warm%')
        ORDER BY ee.entry_date, e1rm DESC`,
      [ownerId, exerciseId]
    );
    return result.rows.map((r) => ({
      date: r.entry_date,
      weight_kg: Number(r.weight),
      reps: r.reps,
      e1rm_kg: Math.round(Number(r.e1rm) * 10) / 10,
    }));
  });
}

/** Exercises any of you and your friends logged (for the leaderboard picker). */
export async function getLeaderboardExercises(userId: string) {
  const ids = [userId, ...(await getFriendIds(userId))];
  const privacy = await privacyFor(ids);
  const shared = ids.filter((id) => privacy.get(id)?.share_workouts);
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT ee.exercise_id, MIN(ee.exercise_name) AS name,
              COUNT(DISTINCT ee.user_id) AS people
         FROM exercise_entries ee
         JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
        WHERE ee.user_id = ANY($1::uuid[]) AND ee.exercise_id IS NOT NULL
          AND s.weight > 0 AND s.reps > 0
        GROUP BY ee.exercise_id
        ORDER BY people DESC, name`,
      [shared]
    );
    return result.rows;
  });
}

export async function getLeaderboard(
  userId: string,
  metric: 'exercise' | 'weekly_volume' | 'weekly_workouts',
  exerciseId?: string
) {
  const ids = [userId, ...(await getFriendIds(userId))];
  const privacy = await privacyFor(ids);
  const shared = ids.filter((id) => privacy.get(id)?.share_workouts);
  return withClient(async (client) => {
    const users = await client.query(
      `SELECT ${PUBLIC_USER_SQL} FROM "user" u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = ANY($1::uuid[])`,
      [shared]
    );
    let rows: { user_id: string; value: number; detail?: string }[];
    if (metric === 'exercise' && exerciseId) {
      const result = await client.query(
        `SELECT DISTINCT ON (ee.user_id) ee.user_id, s.weight, s.reps, ee.entry_date,
                s.weight * (1 + s.reps / 30.0) AS e1rm
           FROM exercise_entries ee
           JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
          WHERE ee.user_id = ANY($1::uuid[]) AND ee.exercise_id = $2
            AND s.weight > 0 AND s.reps > 0
            AND (s.set_type IS NULL OR s.set_type NOT ILIKE 'warm%')
          ORDER BY ee.user_id, e1rm DESC`,
        [shared, exerciseId]
      );
      rows = result.rows.map((r) => ({
        user_id: r.user_id,
        value: Math.round(Number(r.e1rm)),
        detail: `${Number(r.weight)} kg × ${r.reps}`,
      }));
    } else {
      const result = await client.query(
        `SELECT ee.user_id,
                COUNT(DISTINCT COALESCE(ee.exercise_preset_entry_id::text, ee.entry_date::text)) AS workouts,
                COALESCE(SUM(COALESCE(s.weight, 0) * COALESCE(s.reps, 0)), 0) AS volume
           FROM exercise_entries ee
           LEFT JOIN exercise_entry_sets s ON s.exercise_entry_id = ee.id
          WHERE ee.user_id = ANY($1::uuid[])
            AND ee.entry_date >= date_trunc('week', CURRENT_DATE)::date
          GROUP BY ee.user_id`,
        [shared]
      );
      rows = result.rows.map((r) => ({
        user_id: r.user_id,
        value:
          metric === 'weekly_volume'
            ? Math.round(Number(r.volume))
            : Number(r.workouts),
      }));
    }
    rows.sort((a, b) => b.value - a.value);
    return { users: users.rows, rows };
  });
}

export async function getFriendProgramForCopy(
  viewerId: string,
  ownerId: string,
  _templateId: number
) {
  await assertFriends(viewerId, ownerId);
  const privacy = (await privacyFor([ownerId])).get(ownerId)!;
  if (!privacy.share_programs) {
    throw new FriendError('Bu kişi programlarını paylaşmıyor.', 403);
  }
}
