// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitPushLogSchema = z.object({
  user_id: z.string(),
  kind: z.string(),
  day: z.date(),
  sent_at: z.date(),
});

export type DgfitPushLog = z.infer<typeof dgfitPushLogSchema>;
