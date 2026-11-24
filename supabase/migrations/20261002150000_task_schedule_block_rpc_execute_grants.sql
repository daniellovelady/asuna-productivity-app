-- Harden EXECUTE grants on ScheduleBlock lifecycle RPCs (Supabase direct anon grants).

REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_and_cancel_future_blocks(uuid, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task_with_schedule_block_cleanup(uuid, timestamptz) TO authenticated;