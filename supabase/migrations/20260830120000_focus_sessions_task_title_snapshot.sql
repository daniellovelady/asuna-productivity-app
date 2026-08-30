-- Preserve historical task labels on focus sessions when tasks are deleted or renamed.

ALTER TABLE public.focus_sessions
  ADD COLUMN task_title_snapshot text;

UPDATE public.focus_sessions AS fs
SET task_title_snapshot = t.title
FROM public.tasks AS t
WHERE fs.task_id = t.id
  AND fs.task_title_snapshot IS NULL;
