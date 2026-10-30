-- DG FIT push notifications: browser subscriptions, per-person reminder
-- settings, a once-per-day log so a reminder is never sent twice, and the
-- server's VAPID key pair (generated on first start). System client only.

CREATE TABLE IF NOT EXISTS public.dgfit_push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dgfit_push_subscriptions_user_idx
  ON public.dgfit_push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS public.dgfit_notification_settings (
  user_id uuid PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  workout_reminder boolean NOT NULL DEFAULT TRUE,
  workout_reminder_time time NOT NULL DEFAULT '17:00',
  food_reminder boolean NOT NULL DEFAULT TRUE,
  food_reminder_time time NOT NULL DEFAULT '20:30',
  water_reminder boolean NOT NULL DEFAULT FALSE,
  friend_activity boolean NOT NULL DEFAULT TRUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dgfit_push_log (
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  day date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, day)
);

CREATE TABLE IF NOT EXISTS public.dgfit_kv (
  key text PRIMARY KEY,
  value text NOT NULL
);
