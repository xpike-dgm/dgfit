// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitFriendshipsSchema = z.object({
  id: z.number(),
  requester_id: z.string(),
  addressee_id: z.string(),
  status: z.string(),
  created_at: z.date(),
  responded_at: z.date().nullable(),
});

export type DgfitFriendships = z.infer<typeof dgfitFriendshipsSchema>;
