// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitInviteRedemptionsSchema = z.object({
  id: z.number(),
  code: z.string(),
  user_id: z.string(),
  redeemed_at: z.date(),
});

export type DgfitInviteRedemptions = z.infer<
  typeof dgfitInviteRedemptionsSchema
>;
