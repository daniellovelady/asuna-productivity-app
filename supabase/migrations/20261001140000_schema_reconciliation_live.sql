-- Schema reconciliation: align repository with validated live security/schema behavior.
-- Safe on databases where these changes were applied manually (idempotent guards).

-- =============================================================================
-- Historical focus session attribution (SECURITY DEFINER RPC + UPDATE revoke)
-- Source: approved session attribution plan (matches live-tested behavior).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_focus_session_task_attribution(
  p_session_id uuid,
  p_task_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_task_title text;
  v_ctx public.focus_context_type;
  v_updated integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.title
  INTO STRICT v_task_title
  FROM public.tasks AS t
  WHERE t.id = p_task_id
    AND t.user_id = v_user_id;

  SELECT fs.context_type
  INTO STRICT v_ctx
  FROM public.focus_sessions AS fs
  WHERE fs.id = p_session_id
    AND fs.user_id = v_user_id
    AND fs.ended_at IS NOT NULL
    AND fs.status IN ('completed', 'abandoned')
  FOR UPDATE;

  IF v_ctx = 'none' THEN
    UPDATE public.focus_sessions AS fs
    SET
      task_id = p_task_id,
      task_title_snapshot = v_task_title,
      context_type = 'task',
      context_title_snapshot = v_task_title
    WHERE fs.id = p_session_id
      AND fs.user_id = v_user_id;
  ELSIF v_ctx = 'task' THEN
    UPDATE public.focus_sessions AS fs
    SET
      task_id = p_task_id,
      task_title_snapshot = v_task_title,
      context_title_snapshot = v_task_title
    WHERE fs.id = p_session_id
      AND fs.user_id = v_user_id;
  ELSIF v_ctx = 'calendar_event' THEN
    UPDATE public.focus_sessions AS fs
    SET
      task_id = p_task_id,
      task_title_snapshot = v_task_title
    WHERE fs.id = p_session_id
      AND fs.user_id = v_user_id
      AND fs.context_type = 'calendar_event';
  ELSE
    RAISE EXCEPTION 'Unsupported session context';
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Session attribution update failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_focus_session_task_attribution(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_focus_session_task_attribution(uuid, uuid) TO authenticated;

REVOKE UPDATE ON TABLE public.focus_sessions FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_focus_session_calendar_task_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.context_type = 'calendar_event' AND NEW.task_id IS NOT NULL THEN
    IF TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.ended_at IS NULL) THEN
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
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- activity_samples.session_id ON DELETE SET NULL (preserve samples on session delete)
-- =============================================================================

DO $$
DECLARE
  v_conname text;
  v_confdeltype "char";
BEGIN
  SELECT c.conname, c.confdeltype
  INTO v_conname, v_confdeltype
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_class AS t ON c.conrelid = t.oid
  JOIN pg_catalog.pg_namespace AS n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'activity_samples'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%focus_sessions%';

  IF v_conname IS NULL THEN
    RAISE NOTICE 'activity_samples focus_sessions FK not found; skipping SET NULL migration';
    RETURN;
  END IF;

  -- confdeltype: 'c' = CASCADE, 'n' = SET NULL
  IF v_confdeltype = 'c' THEN
    EXECUTE format(
      'ALTER TABLE public.activity_samples DROP CONSTRAINT %I',
      v_conname
    );
    ALTER TABLE public.activity_samples
      ADD CONSTRAINT activity_samples_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.focus_sessions (id)
      ON DELETE SET NULL;
  ELSIF v_confdeltype <> 'n' THEN
    RAISE NOTICE 'activity_samples.session_id FK delete action is %; expected CASCADE or SET NULL', v_confdeltype;
  END IF;
END;
$$;

-- =============================================================================
-- Post-condition checks (fail migration if reconciliation did not apply)
-- =============================================================================

DO $$
DECLARE
  v_confdeltype "char";
BEGIN
  IF has_table_privilege('authenticated', 'public.focus_sessions', 'UPDATE') THEN
    RAISE EXCEPTION 'schema_reconciliation_live: authenticated must not have UPDATE on focus_sessions';
  END IF;

  IF to_regprocedure('public.set_focus_session_task_attribution(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'schema_reconciliation_live: set_focus_session_task_attribution must exist';
  END IF;

  SELECT c.confdeltype
  INTO v_confdeltype
  FROM pg_catalog.pg_constraint AS c
  JOIN pg_catalog.pg_class AS t ON c.conrelid = t.oid
  JOIN pg_catalog.pg_namespace AS n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND t.relname = 'activity_samples'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%focus_sessions%';

  IF v_confdeltype IS DISTINCT FROM 'n' THEN
    RAISE EXCEPTION 'schema_reconciliation_live: activity_samples.session_id FK must be ON DELETE SET NULL';
  END IF;
END;
$$;