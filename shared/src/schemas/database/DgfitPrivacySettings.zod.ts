// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitPrivacySettingsSchema = z.object({
  user_id: z.string(),
  share_workouts: z.boolean(),
  share_weight: z.boolean(),
  share_nutrition: z.boolean(),
  share_measurements: z.boolean(),
  share_photos: z.boolean(),
  share_programs: z.boolean(),
  updated_at: z.date(),
});

export type DgfitPrivacySettings = z.infer<typeof dgfitPrivacySettingsSchema>;
