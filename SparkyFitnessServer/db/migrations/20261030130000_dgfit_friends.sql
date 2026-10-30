-- DG FIT: friends (requests by username), what each person shares with
-- friends, and nothing else: feed and leaderboards are read from the
-- existing diary tables. Accessed only through the system client after an
-- explicit friendship check (services/dgfit/friendService.ts); RLS is enabled
-- with no policies so the app role cannot read these tables directly.

CREATE TABLE IF NOT EXISTS public.dgfit_friendships (
  id bigserial PRIMARY KEY,
  requester_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (requester_id <> addressee_id)
);

-- One row per pair, whichever direction it was sent in.
CREATE UNIQUE INDEX IF NOT EXISTS dgfit_friendships_pair_key
  ON public.dgfit_friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS dgfit_friendships_addressee_idx
  ON public.dgfit_friendships (addressee_id, status);

-- Everything is shared with friends by default; a missing row means "all on".
CREATE TABLE IF NOT EXISTS public.dgfit_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  share_workouts boolean NOT NULL DEFAULT TRUE,
  share_weight boolean NOT NULL DEFAULT TRUE,
  share_nutrition boolean NOT NULL DEFAULT TRUE,
  share_measurements boolean NOT NULL DEFAULT TRUE,
  share_photos boolean NOT NULL DEFAULT TRUE,
  share_programs boolean NOT NULL DEFAULT TRUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
