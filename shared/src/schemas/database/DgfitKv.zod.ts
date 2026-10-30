// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitKvSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type DgfitKv = z.infer<typeof dgfitKvSchema>;
