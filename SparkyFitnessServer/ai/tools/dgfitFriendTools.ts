import { tool } from 'ai';
import { z } from 'zod';
import { getSystemClient } from '../../db/poolManager.js';
import {
  FriendError,
  getExerciseHistory,
  getFriendProfile,
  getLeaderboard,
  listFriends,
} from '../../services/dgfit/friendService.js';
import { formatZodError } from './errors.js';

// DG FIT: lets PT AI answer questions about the user's friends ("what does
// @ahmet bench?", "who trained most this week?"). Read-only, and every read
// goes through the friendship and privacy checks in friendService.

export const DGFIT_FRIENDS_TOOL_NAME = 'dgfit_friends';

const FriendsSchema = z.object({
  action: z
    .enum(['list_friends', 'friend_summary', 'friend_exercise', 'leaderboard'])
    .describe(
      "list_friends: the user's friends. friend_summary: a friend's weight trend, recent nutrition, best lifts, recent workouts and programs. friend_exercise: a friend's history on one exercise. leaderboard: ranking of the user and friends."
    ),
  username: z
    .string()
    .optional()
    .describe(
      'Friend username (without @) for friend_summary / friend_exercise.'
    ),
  exercise_name: z
    .string()
    .optional()
    .describe(
      'Exercise name as logged (Turkish or English, partial is fine) for friend_exercise or an exercise leaderboard.'
    ),
  metric: z
    .enum(['weekly_workouts', 'weekly_volume', 'exercise'])
    .optional()
    .describe('Leaderboard metric. exercise needs exercise_name.'),
});

async function findUserId(username: string): Promise<string | null> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      'SELECT id FROM profiles WHERE lower(username) = lower($1)',
      [username.replace(/^@/, '').trim()]
    );
    return (result.rows[0] as { id: string } | undefined)?.id ?? null;
  } finally {
    client.release();
  }
}

async function findExerciseId(
  userIds: string[],
  name: string
): Promise<{ id: string; name: string } | null> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT ee.exercise_id AS id, MIN(ee.exercise_name) AS name, COUNT(*) AS uses
         FROM exercise_entries ee
         LEFT JOIN exercises e ON e.id = ee.exercise_id
        WHERE ee.user_id = ANY($1::uuid[]) AND ee.exercise_id IS NOT NULL
          AND (ee.exercise_name ILIKE '%' || $2 || '%'
               OR e.description ILIKE '%' || $2 || '%'
               OR replace(coalesce(e.source_id, ''), '_', ' ') ILIKE '%' || $2 || '%')
        GROUP BY ee.exercise_id
        ORDER BY uses DESC
        LIMIT 1`,
      [userIds, name.trim()]
    );
    return (result.rows[0] as { id: string; name: string } | undefined) ?? null;
  } finally {
    client.release();
  }
}

export function buildDgfitFriendTools(userId: string) {
  return {
    [DGFIT_FRIENDS_TOOL_NAME]: tool({
      description:
        "Reads what the user's DG FIT friends share: friend list, a friend's weight/nutrition/lifts/workouts/programs, a friend's history on one exercise, and leaderboards. Read-only.",
      inputSchema: FriendsSchema,
      execute: async (rawArgs) => {
        const parsed = FriendsSchema.safeParse(rawArgs);
        if (!parsed.success) return formatZodError(parsed.error);
        const args = parsed.data;
        try {
          if (args.action === 'list_friends') {
            const list = await listFriends(userId);
            return JSON.stringify({
              friends: list.friends.map((f) => ({
                username: f.username,
                name: f.name,
              })),
              incoming_requests: list.incoming.map((f) => f.username),
            });
          }
          if (args.action === 'leaderboard') {
            const metric = args.metric ?? 'weekly_workouts';
            const friendIds = (await listFriends(userId)).friends.map(
              (f) => f.id as string
            );
            let exerciseId: string | undefined;
            if (metric === 'exercise') {
              if (!args.exercise_name) return 'exercise_name is required.';
              const exercise = await findExerciseId(
                [userId, ...friendIds],
                args.exercise_name
              );
              if (!exercise) return 'No one has logged that exercise.';
              exerciseId = exercise.id;
            }
            const board = await getLeaderboard(userId, metric, exerciseId);
            const names = new Map(
              board.users.map((u) => [u.id, u.username ?? u.name])
            );
            return JSON.stringify({
              metric,
              unit:
                metric === 'weekly_workouts'
                  ? 'workouts this week'
                  : metric === 'weekly_volume'
                    ? 'kg volume this week'
                    : 'kg estimated 1RM',
              ranking: board.rows.map((r, i) => ({
                rank: i + 1,
                user: names.get(r.user_id),
                is_me: r.user_id === userId,
                value: r.value,
                best_set: r.detail,
              })),
            });
          }
          if (!args.username) return 'username is required.';
          const friendId = await findUserId(args.username);
          if (!friendId) return `No user named @${args.username}.`;
          if (args.action === 'friend_summary') {
            return JSON.stringify(await getFriendProfile(userId, friendId));
          }
          if (!args.exercise_name) return 'exercise_name is required.';
          const exercise = await findExerciseId([friendId], args.exercise_name);
          if (!exercise) {
            return `@${args.username} has not logged "${args.exercise_name}".`;
          }
          const history = await getExerciseHistory(
            userId,
            friendId,
            exercise.id
          );
          return JSON.stringify({ exercise: exercise.name, history });
        } catch (error) {
          if (error instanceof FriendError) return error.message;
          throw error;
        }
      },
    }),
  };
}
