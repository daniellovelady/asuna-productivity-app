-- Allow general desktop activity without a focus session.
ALTER TABLE public.activity_samples
  ALTER COLUMN session_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS activity_samples_user_recorded_idx
  ON public.activity_samples (user_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_activity_sample_session_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.focus_sessions AS fs
      WHERE fs.id = NEW.session_id
        AND fs.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'activity_samples.session_id must reference a focus session owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
