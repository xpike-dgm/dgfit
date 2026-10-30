// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitRecipesSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  kind: z.string(),
  recipe: z.unknown(),
  request: z.unknown().nullable(),
  created_at: z.date(),
});

export type DgfitRecipes = z.infer<typeof dgfitRecipesSchema>;
