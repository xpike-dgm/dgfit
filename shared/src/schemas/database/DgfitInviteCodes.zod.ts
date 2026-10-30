// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitInviteCodesSchema = z.object({
  code: z.string(),
  note: z.string().nullable(),
  max_uses: z.number(),
  used_count: z.number(),
  expires_at: z.date().nullable(),
  created_by: z.string().nullable(),
  created_at: z.date(),
});

export type DgfitInviteCodes = z.infer<typeof dgfitInviteCodesSchema>;
