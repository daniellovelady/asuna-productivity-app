-- Assistant and settings preference columns for Structured Insights & Avatar Experience.
-- Apply manually in Supabase SQL Editor after review.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type AS t
    JOIN pg_catalog.pg_namespace AS n
      ON n.oid = t.typnamespace
    WHERE t.typname = 'reminder_tone'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.reminder_tone
      AS ENUM ('gentle', 'neutral', 'direct');
  END IF;
END
$$;

ALTER TABLE public.preferences
  ADD COLUMN IF NOT EXISTS quiet_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_tone public.reminder_tone NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS ai_message_variation_enabled boolean NOT NULL DEFAULT false;

-- Align duration constraints with application validation:
-- focus 5-60 minutes in increments of 5; break 1-30 minutes.

ALTER TABLE public.preferences
  DROP CONSTRAINT IF EXISTS preferences_focus_minutes_check;

ALTER TABLE public.preferences
  ADD CONSTRAINT preferences_focus_minutes_check
  CHECK (
    focus_minutes >= 5
    AND focus_minutes <= 60
    AND focus_minutes % 5 = 0
  );

ALTER TABLE public.preferences
  DROP CONSTRAINT IF EXISTS preferences_break_minutes_check;

ALTER TABLE public.preferences
  ADD CONSTRAINT preferences_break_minutes_check
  CHECK (
    break_minutes >= 1
    AND break_minutes <= 30
  );

COMMIT;