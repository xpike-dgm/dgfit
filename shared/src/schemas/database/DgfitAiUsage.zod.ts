// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitAiUsageSchema = z.object({
  user_id: z.string(),
  day: z.date(),
  model: z.string(),
  requests: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_tokens: z.number(),
});

export type DgfitAiUsage = z.infer<typeof dgfitAiUsageSchema>;
