-- Deterministic analytics snapshot RPC.
-- Fixture expected values: src/shared/analytics/fixture.ts
-- (totalFocusMinutes=393, breakCompliance=60.0%, top app youtube=2.5min)

CREATE OR REPLACE FUNCTION public.get_analytics_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_stored_timezone text;
  v_timezone text;
  v_break_minutes integer := 5;
  v_as_of date;
  v_range_start date;
  v_range_end date;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.timezone
  INTO v_stored_timezone
  FROM public.profiles AS p
  WHERE p.id = v_user_id;

  SELECT CASE
    WHEN v_stored_timezone IS NOT NULL
      AND btrim(v_stored_timezone) <> ''
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.pg_timezone_names AS tz
        WHERE tz.name = v_stored_timezone
      )
    THEN v_stored_timezone
    ELSE 'UTC'
  END
  INTO v_timezone;

  SELECT pref.break_minutes
  INTO v_break_minutes
  FROM public.preferences AS pref
  WHERE pref.user_id = v_user_id;

  IF v_break_minutes IS NULL OR v_break_minutes <= 0 THEN
    v_break_minutes := 5;
  END IF;

  v_as_of := (now() AT TIME ZONE v_timezone)::date;
  v_range_end := v_as_of;
  v_range_start := v_as_of - 6;
  v_window_start := (v_range_start::timestamp AT TIME ZONE v_timezone);
  v_window_end := ((v_range_end + 1)::timestamp AT TIME ZONE v_timezone);

  WITH focus_ended AS (
    SELECT
      fs.id,
      fs.task_title_snapshot,
      fs.started_at,
      fs.ended_at,
      fs.paused_seconds,
      fs.interruption_count,
      fs.status,
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (fs.ended_at - fs.started_at)) - fs.paused_seconds
      ) AS actual_focus_seconds
    FROM public.focus_sessions AS fs
    WHERE fs.user_id = v_user_id
      AND fs.ended_at IS NOT NULL
      AND fs.status IN ('completed', 'abandoned')
      AND fs.ended_at >= v_window_start
      AND fs.ended_at < v_window_end
  ),
  focus_totals AS (
    SELECT
      COALESCE(SUM(actual_focus_seconds), 0) AS total_focus_seconds,
      COALESCE(
        SUM(actual_focus_seconds) FILTER (
          WHERE (fe.ended_at AT TIME ZONE v_timezone)::date = v_as_of
        ),
        0
      ) AS focus_today_seconds,
      COUNT(*) FILTER (WHERE fe.status = 'completed') AS completed_sessions,
      COALESCE(SUM(fe.interruption_count), 0) AS interruption_count,
      COUNT(*) AS ended_count
    FROM focus_ended AS fe
  ),
  focus_by_day AS (
    SELECT
      day_series.focus_day::date AS focus_day,
      COALESCE(SUM(fe.actual_focus_seconds), 0) AS focus_seconds
    FROM generate_series(v_range_start, v_range_end, interval '1 day') AS day_series(focus_day)
    LEFT JOIN focus_ended AS fe
      ON (fe.ended_at AT TIME ZONE v_timezone)::date = day_series.focus_day::date
    GROUP BY day_series.focus_day
    ORDER BY day_series.focus_day
  ),
  focus_by_task AS (
    SELECT
      COALESCE(NULLIF(btrim(fe.task_title_snapshot), ''), 'No task') AS task_label,
      SUM(fe.actual_focus_seconds) AS focus_seconds
    FROM focus_ended AS fe
    GROUP BY 1
    ORDER BY focus_seconds DESC, task_label ASC
  ),
  break_pairs AS (
    SELECT
      EXTRACT(EPOCH FROM (next_sess.started_at - prev.ended_at)) AS gap_seconds
    FROM public.focus_sessions AS prev
    CROSS JOIN LATERAL (
      SELECT fs_next.started_at
      FROM public.focus_sessions AS fs_next
      WHERE fs_next.user_id = v_user_id
        AND fs_next.started_at > prev.ended_at
      ORDER BY fs_next.started_at ASC
      LIMIT 1
    ) AS next_sess
    WHERE prev.user_id = v_user_id
      AND prev.status = 'completed'
      AND prev.ended_at IS NOT NULL
      AND prev.ended_at >= v_window_start
      AND prev.ended_at < v_window_end
      AND next_sess.started_at - prev.ended_at <= interval '120 minutes'
  ),
  break_totals AS (
    SELECT
      COUNT(*) AS eligible_count,
      COUNT(*) FILTER (
        WHERE gap_seconds >= (v_break_minutes * 60)
      ) AS compliant_count
    FROM break_pairs
  ),
  ordered_samples AS (
    SELECT
      asample.application_name,
      asample.classification,
      asample.idle_seconds,
      asample.recorded_at,
      LEAD(asample.recorded_at) OVER (
        ORDER BY asample.recorded_at ASC, asample.id ASC
      ) AS next_recorded_at
    FROM public.activity_samples AS asample
    WHERE asample.user_id = v_user_id
      AND asample.recorded_at >= v_window_start
      AND asample.recorded_at < v_window_end
  ),
  distracting_intervals AS (
    SELECT
      os.application_name,
      CASE
        WHEN os.next_recorded_at IS NULL THEN 0
        WHEN os.classification <> 'distracting' THEN 0
        WHEN os.idle_seconds >= 180 THEN 0
        ELSE LEAST(
          60,
          GREATEST(
            0,
            EXTRACT(EPOCH FROM (os.next_recorded_at - os.recorded_at))
          )
        )
      END AS credited_seconds
    FROM ordered_samples AS os
  ),
  distracting_apps AS (
    SELECT
      di.application_name,
      SUM(di.credited_seconds) AS estimated_seconds
    FROM distracting_intervals AS di
    GROUP BY di.application_name
    HAVING SUM(di.credited_seconds) > 0
    ORDER BY estimated_seconds DESC, di.application_name ASC
  ),
  totals AS (
    SELECT * FROM focus_totals
  )
  SELECT jsonb_build_object(
    'range', jsonb_build_object(
      'start', to_char(v_range_start, 'YYYY-MM-DD'),
      'end', to_char(v_range_end, 'YYYY-MM-DD'),
      'timezone', v_timezone
    ),
    'focusTodayMinutes', (SELECT focus_today_seconds / 60.0 FROM totals),
    'totalFocusMinutes', (SELECT total_focus_seconds / 60.0 FROM totals),
    'completedSessions', (SELECT completed_sessions FROM totals),
    'interruptionCount', (SELECT interruption_count FROM totals),
    'averageSessionMinutes', (
      SELECT CASE
        WHEN ended_count = 0 THEN NULL
        ELSE total_focus_seconds / ended_count / 60.0
      END
      FROM totals
    ),
    'breakCompliancePercent', (
      SELECT CASE
        WHEN eligible_count = 0 THEN NULL
        ELSE ROUND((1000.0 * compliant_count / eligible_count)) / 10.0
      END
      FROM break_totals
    ),
    'focusByDay', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', to_char(fbd.focus_day, 'YYYY-MM-DD'),
          'focusMinutes', fbd.focus_seconds / 60.0
        )
        ORDER BY fbd.focus_day
      )
      FROM focus_by_day AS fbd
    ), '[]'::jsonb),
    'focusByTask', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'taskLabel', fbt.task_label,
          'focusMinutes', fbt.focus_seconds / 60.0
        )
        ORDER BY fbt.focus_seconds DESC, fbt.task_label ASC
      )
      FROM focus_by_task AS fbt
    ), '[]'::jsonb),
    'topDistractingApps', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'applicationName', da.application_name,
          'estimatedMinutes', da.estimated_seconds / 60.0
        )
        ORDER BY da.estimated_seconds DESC, da.application_name ASC
      )
      FROM distracting_apps AS da
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_analytics_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_snapshot() TO authenticated;
