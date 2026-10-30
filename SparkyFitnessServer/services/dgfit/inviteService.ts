import crypto from 'node:crypto';
import { getSystemClient } from '../../db/poolManager.js';

// DG FIT signup is invite-only: the Better Auth user.create hook validates the
// code and username sent with /sign-up/email, and the after-hook records them.

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export class SignupRejectedError extends Error {}

export interface InviteCode {
  code: string;
  note: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return code.length > 0 && code.length <= 64 ? code : null;
}

export async function isUsernameTaken(
  username: string,
  exceptUserId?: string
): Promise<boolean> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT 1 FROM profiles WHERE lower(username) = lower($1)
         AND ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1`,
      [username, exceptUserId ?? null]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

/** Throws SignupRejectedError (Turkish message) when the signup may not go ahead. */
export async function assertSignupAllowed(
  rawInvite: unknown,
  rawUsername: unknown
): Promise<{ code: string; username: string }> {
  const username = normalizeUsername(rawUsername);
  if (!username) {
    throw new SignupRejectedError(
      'Geçerli bir kullanıcı adı girin (3-20 karakter: küçük harf, rakam, _ ve .).'
    );
  }
  const code = normalizeInviteCode(rawInvite);
  if (!code) {
    throw new SignupRejectedError('Kayıt için davet kodu gerekli.');
  }
  if (await isUsernameTaken(username)) {
    throw new SignupRejectedError('Bu kullanıcı adı alınmış.');
  }
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT 1 FROM dgfit_invite_codes
        WHERE code = $1 AND used_count < max_uses
          AND (expires_at IS NULL OR expires_at > now())`,
      [code]
    );
    if (!result.rowCount) {
      throw new SignupRejectedError(
        'Davet kodu geçersiz, süresi dolmuş ya da kullanılmış.'
      );
    }
  } finally {
    client.release();
  }
  return { code, username };
}

/** Records the redemption and the username once the user row exists. */
export async function completeSignup(
  userId: string,
  code: string,
  username: string
): Promise<void> {
  const client = await getSystemClient();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE dgfit_invite_codes SET used_count = used_count + 1 WHERE code = $1',
      [code]
    );
    await client.query(
      'INSERT INTO dgfit_invite_redemptions (code, user_id) VALUES ($1, $2)',
      [code, userId]
    );
    await client.query('UPDATE profiles SET username = $2 WHERE id = $1', [
      userId,
      username,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listInviteCodes(): Promise<
  (InviteCode & { used_by: string[] })[]
> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT c.code, c.note, c.max_uses, c.used_count, c.expires_at, c.created_at,
              COALESCE(array_agg(COALESCE(p.username, u.name))
                FILTER (WHERE r.id IS NOT NULL), '{}') AS used_by
         FROM dgfit_invite_codes c
         LEFT JOIN dgfit_invite_redemptions r ON r.code = c.code
         LEFT JOIN "user" u ON u.id = r.user_id
         LEFT JOIN profiles p ON p.id = r.user_id
        GROUP BY c.code
        ORDER BY c.created_at DESC`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function createInviteCode(
  createdBy: string,
  options: { note?: string | null; maxUses?: number; expiresInDays?: number }
): Promise<InviteCode> {
  const code = `DGFIT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `INSERT INTO dgfit_invite_codes (code, note, max_uses, expires_at, created_by)
       VALUES ($1, $2, $3,
               CASE WHEN $4::int IS NULL THEN NULL ELSE now() + make_interval(days => $4::int) END,
               $5)
       RETURNING code, note, max_uses, used_count, expires_at, created_at`,
      [
        code,
        options.note ?? null,
        options.maxUses ?? 1,
        options.expiresInDays ?? null,
        createdBy,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function deleteInviteCode(code: string): Promise<boolean> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      'DELETE FROM dgfit_invite_codes WHERE code = $1',
      [code]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function setUsername(
  userId: string,
  rawUsername: unknown
): Promise<string> {
  const username = normalizeUsername(rawUsername);
  if (!username) {
    throw new SignupRejectedError(
      'Geçerli bir kullanıcı adı girin (3-20 karakter: küçük harf, rakam, _ ve .).'
    );
  }
  if (await isUsernameTaken(username, userId)) {
    throw new SignupRejectedError('Bu kullanıcı adı alınmış.');
  }
  const client = await getSystemClient();
  try {
    await client.query('UPDATE profiles SET username = $2 WHERE id = $1', [
      userId,
      username,
    ]);
  } finally {
    client.release();
  }
  return username;
}

export async function getUsername(userId: string): Promise<string | null> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      'SELECT username FROM profiles WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.username ?? null;
  } finally {
    client.release();
  }
}
