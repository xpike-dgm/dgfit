import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';

// DG FIT keeps photos sent to PT AI (food photos) for 14 days. After that the
// image is removed from the chat history; the text of the conversation and
// anything that was logged from the photo stay.

const RETENTION_DAYS = 14;
const REMOVED_NOTE = '[Fotoğraf 14 günden eski olduğu için silindi]';

type ChatPart = Record<string, unknown>;

const isImagePart = (part: ChatPart) => {
  const text = JSON.stringify(part);
  return (
    part.type === 'image' ||
    part.type === 'image_url' ||
    (part.type === 'file' && text.includes('image/')) ||
    text.includes('data:image/')
  );
};

export async function purgeOldChatPhotos(): Promise<number> {
  const client = await getSystemClient();
  let cleaned = 0;
  try {
    const result = await client.query(
      `SELECT id, parts FROM sparky_chat_history
        WHERE created_at < now() - make_interval(days => $1)
          AND (image_url IS NOT NULL OR parts::text LIKE '%data:image/%')
        LIMIT 1000`,
      [RETENTION_DAYS]
    );
    for (const row of result.rows as { id: string; parts: unknown }[]) {
      const parts = Array.isArray(row.parts)
        ? (row.parts as ChatPart[]).map((part) =>
            isImagePart(part) ? { type: 'text', text: REMOVED_NOTE } : part
          )
        : row.parts;
      await client.query(
        'UPDATE sparky_chat_history SET image_url = NULL, parts = $2::jsonb WHERE id = $1',
        [row.id, JSON.stringify(parts)]
      );
      cleaned++;
    }
  } finally {
    client.release();
  }
  if (cleaned > 0) {
    log('info', `[DGFIT] Removed photos from ${cleaned} old chat message(s).`);
  }
  return cleaned;
}
