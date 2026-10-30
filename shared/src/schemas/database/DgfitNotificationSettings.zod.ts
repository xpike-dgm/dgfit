// DG FIT table (see SparkyFitnessServer/db/migrations/*dgfit*.sql).
import { z } from 'zod';

export const dgfitNotificationSettingsSchema = z.object({
  user_id: z.string(),
  workout_reminder: z.boolean(),
  workout_reminder_time: z.string(),
  food_reminder: z.boolean(),
  food_reminder_time: z.string(),
  water_reminder: z.boolean(),
  friend_activity: z.boolean(),
  updated_at: z.date(),
});

export type DgfitNotificationSettings = z.infer<
  typeof dgfitNotificationSettingsSchema
>;
