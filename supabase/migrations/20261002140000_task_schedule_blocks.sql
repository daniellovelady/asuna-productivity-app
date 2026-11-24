-- ScheduleBlock foundation: task_schedule_blocks, preferences default, lifecycle RPCs.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.schedule_block_status AS ENUM (
  'scheduled',
  'cancelled'
);

CREATE TYPE public.schedule_block_cancel_reason AS ENUM (
  'task_completed',
  'user_unscheduled',
  'task_deleted'
);

CREATE TYPE public.schedule_block_google_sync_state AS ENUM (
  'synced',
  'pending_create',
  'pending_update',
  'pending_delete',
  'error'
);

-- ---------------------------------------------------------------------------
-- Preferences: default schedule block duration
-- ---------------------------------------------------------------------------

ALTER TABLE public.preferences
  ADD COLUMN IF NOT EXISTS default_schedule_block_minutes integer NOT NULL DEFAULT 60;

ALTER TABLE public.preferences
  DROP CONSTRAINT IF EXISTS preferences_default_schedule_block_minutes_check;

ALTER TABLE public.preferences
  ADD CONSTRAINT preferences_default_schedule_block_minutes_check
  CHECK (
    default_schedule_block_minutes >= 15
    AND default_schedule_block_minutes <= 240
    AND default_schedule_block_minutes % 15 = 0
  );

-- ---------------------------------------------------------------------------
-- task_schedule_blocks
-- ---------------------------------------------------------------------------

CREATE TABLE public.task_schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  task_title_snapshot text NOT NULL,

  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  timezone text NOT NULL,

  status public.schedule_block_status NOT NULL DEFAULT 'scheduled',
  cancel_reason public.schedule_block_cancel_reason,
  cancelled_at timestamptz,

  google_calendar_id text,
  google_event_id text,

  google_sync_state public.schedule_block_google_sync_state NOT NULL DEFAULT 'synced',
  google_sync_error text,
  google_sync_next_retry_at timestamptz,
  google_last_synced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT task_schedule_blocks_time_order_check
    CHECK (scheduled_end_at > scheduled_start_at),

  CONSTRAINT task_schedule_blocks_status_cancel_check
    CHECK (
      (
        status = 'scheduled'
        AND cancel_reason IS NULL
        AND cancelled_at IS NULL
      )
      OR (
        status = 'cancelled'
        AND cancel_reason IS NOT NULL
        AND cancelled_at IS NOT NULL
      )
    ),

  CONSTRAINT task_schedule_blocks_timezone_nonempty_check
    CHECK (btrim(timezone) <> '')
);

CREATE INDEX task_schedule_blocks_user_id_idx
  ON public.task_schedule_blocks (user_id);

CREATE INDEX task_schedule_blocks_task_id_idx
  ON public.task_schedule_blocks (task_id)
  WHERE task_id IS NOT NULL;

CREATE INDEX task_schedule_blocks_active_user_end_idx
  ON public.task_schedule_blocks (user_id, scheduled_end_at)
  WHERE status = 'scheduled'::public.schedule_block_status;

CREATE INDEX task_schedule_blocks_user_range_idx
  ON public.task_schedule_blocks (user_id, scheduled_start_at, scheduled_end_at);

CREATE INDEX task_schedule_blocks_google_retry_idx
  ON public.task_schedule_blocks (google_sync_next_retry_at)
  WHERE google_sync_state IN (
    'pending_create'::public.schedule_block_google_sync_state,
    'pending_update'::public.schedule_block_google_sync_state,
    'pending_delete'::public.schedule_block_google_sync_state,
    'error'::public.schedule_block_google_sync_state
  )
    AND google_sync_next_retry_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_task_schedule_blocks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_schedule_blocks_set_updated_at
  BEFORE UPDATE ON public.task_schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_schedule_blocks_updated_at();

-- ---------------------------------------------------------------------------
-- Trusted snapshot + insert validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_task_schedule_block_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.task_id IS NULL THEN
    RAISE EXCEPTION 'task_id is required when creating a schedule block';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS tz
    WHERE tz.name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'invalid IANA timezone';
  END IF;

  SELECT t.title
  INTO STRICT v_title
  FROM public.tasks AS t
  WHERE t.id = NEW.task_id
    AND t.user_id = NEW.user_id;

  NEW.task_title_snapshot := v_title;

  IF NEW.status = 'scheduled' THEN
    NEW.cancel_reason := NULL;
    NEW.cancelled_at := NULL;
  END IF;

  IF NEW.google_event_id IS NULL AND NEW.google_calendar_id IS NULL THEN
    NEW.google_sync_state := 'synced';
    NEW.google_sync_error := NULL;
    NEW.google_sync_next_retry_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_schedule_block_on_insert_trigger
  BEFORE INSERT ON public.task_schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_schedule_block_on_insert();

-- ---------------------------------------------------------------------------
-- Update validation (immutable snapshot, time order, cancellation invariants)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_task_schedule_block_on_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.task_title_snapshot IS DISTINCT FROM OLD.task_title_snapshot THEN
    RAISE EXCEPTION 'task_title_snapshot is immutable';
  END IF;

  IF NEW.scheduled_end_at <= NEW.scheduled_start_at THEN
    RAISE EXCEPTION 'scheduled_end_at must be after scheduled_start_at';
  END IF;

  IF NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_timezone_names AS tz
      WHERE tz.name = NEW.timezone
    ) THEN
      RAISE EXCEPTION 'invalid IANA timezone';
    END IF;
  END IF;

  IF NEW.status = 'scheduled' THEN
    NEW.cancel_reason := NULL;
    NEW.cancelled_at := NULL;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancel_reason IS NULL OR NEW.cancelled_at IS NULL THEN
      RAISE EXCEPTION 'cancelled blocks require cancel_reason and cancelled_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_task_schedule_block_on_update_trigger
  BEFORE UPDATE ON public.task_schedule_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_schedule_block_on_update();

-- ---------------------------------------------------------------------------
-- RLS (soft-cancel lifecycle — no authenticated DELETE)
-- ---------------------------------------------------------------------------

ALTER TABLE public.task_schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_schedule_blocks_select_own ON public.task_schedule_blocks
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY task_schedule_blocks_insert_own ON public.task_schedule_blocks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY task_schedule_blocks_update_own ON public.task_schedule_blocks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE DELETE ON TABLE public.task_schedule_blocks FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.task_schedule_blocks TO authenticated;

-- ---------------------------------------------------------------------------
-- Task completion + delete RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_task_and_cancel_future_blocks(
  p_task_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_task public.tasks;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.tasks AS t
  SET
    status = 'completed',
    completed_at = now()
  WHERE t.id = p_task_id
    AND t.user_id = v_user_id
    AND t.updated_at = p_expected_updated_at
  RETURNING t.* INTO v_task;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task update conflict or not found';
  END IF;

  UPDATE public.task_schedule_blocks AS b
  SET
    status = 'cancelled',
    cancel_reason = 'task_completed',
    cancelled_at = now()
  WHERE b.user_id = v_user_id
    AND b.task_id = p_task_id
    AND b.status = 'scheduled'
    AND b.scheduled_start_at > now();

  RETURN v_task;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_task_with_schedule_block_cleanup(
  p_task_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_task public.tasks;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.*
  INTO STRICT v_task
  FROM public.tasks AS t
  WHERE t.id = p_task_id
    AND t.user_id = v_user_id
    AND t.updated_at = p_expected_updated_at;

  UPDATE public.task_schedule_blocks AS b
  SET
    status = 'cancelled',
    cancel_reason = 'task_deleted',
    cancelled_at = now()
  WHERE b.user_id = v_user_id
    AND b.task_id = p_task_id
    AND b.status = 'scheduled'
    AND b.scheduled_end_at > now();

  DELETE FROM public.tasks AS t
  WHERE t.id = p_task_id
    AND t.user_id = v_user_id
    AND t.updated_at = p_expected_updated_at;

  RETURN v_task;
END;
$$;

-- Supabase may GRANT EXECUTE directly to anon/authenticated; REVOKE FROM PUBLIC is not sufficient.
REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) TO authenticated;