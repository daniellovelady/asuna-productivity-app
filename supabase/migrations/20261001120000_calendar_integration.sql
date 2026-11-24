-- Calendar integration V1: focus context, event-task links, analytics by context.

CREATE TYPE public.focus_context_type AS ENUM (
  'none',
  'task',
  'calendar_event'
);

ALTER TABLE public.focus_sessions
  ADD COLUMN context_type public.focus_context_type NOT NULL DEFAULT 'none',
  ADD COLUMN context_title_snapshot text,
  ADD COLUMN external_calendar_event_id text,
  ADD COLUMN external_calendar_id text,
  ADD COLUMN calendar_provider text CHECK (
    calendar_provider IS NULL OR calendar_provider = 'google'
  );

UPDATE public.focus_sessions AS fs
SET
  context_type = 'task',
  context_title_snapshot = COALESCE(fs.task_title_snapshot, fs.context_title_snapshot)
WHERE fs.task_id IS NOT NULL;

ALTER TABLE public.focus_sessions
  ADD CONSTRAINT focus_sessions_context_calendar_integrity CHECK (
    (
      context_type = 'calendar_event'
      AND external_calendar_event_id IS NOT NULL
      AND btrim(external_calendar_event_id) <> ''
      AND external_calendar_id IS NOT NULL
      AND btrim(external_calendar_id) <> ''
      AND calendar_provider = 'google'
      AND context_title_snapshot IS NOT NULL
      AND btrim(context_title_snapshot) <> ''
    )
    OR (
      context_type IN ('none', 'task')
      AND external_calendar_event_id IS NULL
      AND external_calendar_id IS NULL
      AND calendar_provider IS NULL
    )
  );

CREATE TABLE public.calendar_event_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  calendar_provider text NOT NULL DEFAULT 'google' CHECK (calendar_provider = 'google'),
  external_calendar_id text NOT NULL,
  external_event_id text NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  event_title_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_event_task_links_unique_event
    UNIQUE (user_id, calendar_provider, external_calendar_id, external_event_id)
);

CREATE INDEX calendar_event_task_links_user_id_idx
  ON public.calendar_event_task_links (user_id);

CREATE INDEX calendar_event_task_links_task_id_idx
  ON public.calendar_event_task_links (task_id);

CREATE OR REPLACE FUNCTION public.enforce_calendar_event_task_link_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.tasks AS t
    WHERE t.id = NEW.task_id
      AND t.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'calendar_event_task_links.task_id must reference a task owned by the same user';
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'calendar_event_task_links.user_id must match authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_calendar_event_task_link_owner_trigger
BEFORE INSERT OR UPDATE OF task_id, user_id ON public.calendar_event_task_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_calendar_event_task_link_owner();

CREATE OR REPLACE FUNCTION public.enforce_focus_session_calendar_task_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.context_type = 'calendar_event' AND NEW.task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.calendar_event_task_links AS l
      WHERE l.user_id = NEW.user_id
        AND l.task_id = NEW.task_id
        AND l.calendar_provider = NEW.calendar_provider
        AND l.external_calendar_id = NEW.external_calendar_id
        AND l.external_event_id = NEW.external_calendar_event_id
    ) THEN
      RAISE EXCEPTION 'focus_sessions.task_id requires a matching calendar_event_task_links row for this event';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_focus_session_calendar_task_link_trigger
BEFORE INSERT OR UPDATE OF
  context_type, task_id, user_id, context_title_snapshot,
  external_calendar_event_id, external_calendar_id, calendar_provider
ON public.focus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_focus_session_calendar_task_link();

ALTER TABLE public.calendar_event_task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_event_task_links_select_own
  ON public.calendar_event_task_links
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY calendar_event_task_links_insert_own
  ON public.calendar_event_task_links
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY calendar_event_task_links_update_own
  ON public.calendar_event_task_links
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY calendar_event_task_links_delete_own
  ON public.calendar_event_task_links
  FOR DELETE
  USING (user_id = auth.uid());
