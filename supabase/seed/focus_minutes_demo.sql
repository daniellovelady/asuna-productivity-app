-- focus_minutes_demo.sql
-- Run the entire file in the Supabase SQL Editor after applying the initial migration.
--
-- Prerequisites:
--   At least one user must exist in auth.users (register via the app or Supabase Auth UI).
--
-- Re-running is safe: inserts use ON CONFLICT (id) DO NOTHING.
--
-- Expected focus minutes (hand-calculated):
--   Session 1 (task A, day 1): 25 min target, 25 min elapsed, 300 s paused -> 20.00 min
--   Session 2 (task A, day 1): 30 min target, 30 min elapsed, 0 s paused -> 30.00 min
--   Session 3 (task B, day 2): 25 min target, 25 min elapsed, 600 s paused -> 15.00 min
--   Session 4 (task B, day 2): 15 min target, 15 min elapsed, 0 s paused -> 15.00 min
-- Grouped totals:
--   Task A, day 1: 50.00 min
--   Task B, day 2: 30.00 min

DO $$
DECLARE
  demo_user_id uuid;
  task_a_id uuid := '11111111-1111-4111-8111-111111111111';
  task_b_id uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
  SELECT id INTO demo_user_id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row found. Register a test user first.';
  END IF;

  INSERT INTO public.tasks (id, user_id, title, status, priority)
  VALUES
    (task_a_id, demo_user_id, 'Demo task A', 'in_progress', 'high'),
    (task_b_id, demo_user_id, 'Demo task B', 'pending', 'medium')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.focus_sessions (
    id,
    user_id,
    task_id,
    target_duration_minutes,
    started_at,
    ended_at,
    paused_seconds,
    interruption_count,
    status
  ) VALUES
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      demo_user_id,
      task_a_id,
      25,
      '2026-08-27 09:00:00+00',
      '2026-08-27 09:25:00+00',
      300,
      1,
      'completed'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      demo_user_id,
      task_a_id,
      30,
      '2026-08-27 14:00:00+00',
      '2026-08-27 14:30:00+00',
      0,
      0,
      'completed'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      demo_user_id,
      task_b_id,
      25,
      '2026-08-28 10:00:00+00',
      '2026-08-28 10:25:00+00',
      600,
      2,
      'completed'
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      demo_user_id,
      task_b_id,
      15,
      '2026-08-28 15:00:00+00',
      '2026-08-28 15:15:00+00',
      0,
      0,
      'completed'
    )
  ON CONFLICT (id) DO NOTHING;
END $$;

SELECT
  fs.task_id,
  t.title AS task_title,
  (fs.started_at AT TIME ZONE 'UTC')::date AS focus_day,
  ROUND(
    SUM(
      GREATEST(
        0,
        EXTRACT(EPOCH FROM (fs.ended_at - fs.started_at)) - fs.paused_seconds
      ) / 60.0
    ),
    2
  ) AS focus_minutes
FROM public.focus_sessions AS fs
INNER JOIN public.tasks AS t ON t.id = fs.task_id
WHERE fs.status = 'completed'
  AND fs.ended_at IS NOT NULL
  AND t.id IN (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )
GROUP BY fs.task_id, t.title, focus_day
ORDER BY focus_day, task_title;
