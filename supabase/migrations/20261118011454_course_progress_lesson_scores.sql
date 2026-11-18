-- FALA V10 · persist adaptive lesson mastery between devices.
-- Additive only: existing progress rows receive an empty score map.

alter table public.course_progress
  add column if not exists lesson_scores jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_progress_lesson_scores_object_check'
      and conrelid = 'public.course_progress'::regclass
  ) then
    alter table public.course_progress
      add constraint course_progress_lesson_scores_object_check
      check (jsonb_typeof(lesson_scores) = 'object');
  end if;
end $$;
