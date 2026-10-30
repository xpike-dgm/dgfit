-- DG FIT: PT AI usage per person, day and model, for the admin usage panel.
-- Written and read only through the system client (RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.dgfit_ai_usage (
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  day date NOT NULL,
  model text NOT NULL,
  requests integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cache_read_tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, model)
);
