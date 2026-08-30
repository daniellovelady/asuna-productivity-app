-- Initial A.S.U.N.A. schema: profiles, tasks, focus_sessions, activity_samples,
-- preferences, insights with RLS and ownership enforcement.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'archived'
);

CREATE TYPE public.task_priority AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE public.focus_session_status AS ENUM (
  'running',
  'paused',
  'completed',
  'abandoned'
);

CREATE TYPE public.activity_classification AS ENUM (
  'productive',
  'neutral',
  'distracting'
);

CREATE TYPE public.encouragement_level AS ENUM (
  'low',
  'medium',
  'high'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  target_duration_minutes integer NOT NULL CHECK (
    target_duration_minutes >= 5
    AND target_duration_minutes <= 60
    AND target_duration_minutes % 5 = 0
  ),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  paused_seconds integer NOT NULL DEFAULT 0 CHECK (paused_seconds >= 0),
  interruption_count integer NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
  status public.focus_session_status NOT NULL DEFAULT 'running'
);

CREATE TABLE public.activity_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.focus_sessions (id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  application_name text NOT NULL,
  idle_seconds integer NOT NULL DEFAULT 0 CHECK (idle_seconds >= 0),
  classification public.activity_classification NOT NULL DEFAULT 'neutral'
);

CREATE TABLE public.preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  focus_minutes integer NOT NULL DEFAULT 25 CHECK (focus_minutes > 0),
  break_minutes integer NOT NULL DEFAULT 5 CHECK (break_minutes > 0),
  tracking_enabled boolean NOT NULL DEFAULT false,
  distraction_threshold_minutes integer NOT NULL DEFAULT 5,
  encouragement_level public.encouragement_level NOT NULL DEFAULT 'medium',
  avatar_style text NOT NULL DEFAULT 'default'
);

CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX tasks_user_id_idx ON public.tasks (user_id);
CREATE INDEX focus_sessions_user_id_idx ON public.focus_sessions (user_id);
CREATE INDEX focus_sessions_task_id_idx ON public.focus_sessions (task_id);
CREATE INDEX activity_samples_session_id_idx ON public.activity_samples (session_id);
CREATE INDEX insights_user_id_idx ON public.insights (user_id);

-- ---------------------------------------------------------------------------
-- Cross-user ownership triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_focus_session_task_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tasks AS t
      WHERE t.id = NEW.task_id
        AND t.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'focus_sessions.task_id must reference a task owned by the same user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_focus_session_task_owner_trigger
BEFORE INSERT OR UPDATE OF task_id, user_id ON public.focus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_focus_session_task_owner();

CREATE OR REPLACE FUNCTION public.enforce_activity_sample_session_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.focus_sessions AS fs
    WHERE fs.id = NEW.session_id
      AND fs.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'activity_samples.session_id must reference a focus session owned by the same user';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_activity_sample_session_owner_trigger
BEFORE INSERT OR UPDATE OF session_id, user_id ON public.activity_samples
FOR EACH ROW
EXECUTE FUNCTION public.enforce_activity_sample_session_owner();

-- ---------------------------------------------------------------------------
-- Signup bootstrap trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, timezone, created_at)
  VALUES (NEW.id, 'UTC', now());

  INSERT INTO public.preferences (user_id, avatar_style)
  VALUES (NEW.id, 'default');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY preferences_select_own ON public.preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY preferences_update_own ON public.preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_select_own ON public.tasks
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY tasks_insert_own ON public.tasks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_update_own ON public.tasks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tasks_delete_own ON public.tasks
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY focus_sessions_select_own ON public.focus_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY focus_sessions_insert_own ON public.focus_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY focus_sessions_update_own ON public.focus_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY focus_sessions_delete_own ON public.focus_sessions
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY activity_samples_select_own ON public.activity_samples
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY activity_samples_insert_own ON public.activity_samples
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY activity_samples_update_own ON public.activity_samples
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY activity_samples_delete_own ON public.activity_samples
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY insights_select_own ON public.insights
  FOR SELECT
  USING (user_id = auth.uid());
