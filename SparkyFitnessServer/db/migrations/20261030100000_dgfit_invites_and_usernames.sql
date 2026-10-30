-- DG FIT: invite-only signup and public usernames (used to find friends).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format
      CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,20}$');
  END IF;
END $$;

-- Invite codes are only ever read and written through the system client
-- (admin routes and the signup hook); RLS is enabled with no policies.
CREATE TABLE IF NOT EXISTS public.dgfit_invite_codes (
  code text PRIMARY KEY,
  note text,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dgfit_invite_redemptions (
  id bigserial PRIMARY KEY,
  code text NOT NULL REFERENCES public.dgfit_invite_codes(code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);
