// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitPushSubscriptionsSchema = z.object({
  endpoint: z.string(),
  user_id: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  user_agent: z.string().nullable(),
  created_at: z.date(),
});

export type DgfitPushSubscriptions = z.infer<
  typeof dgfitPushSubscriptionsSchema
>;
