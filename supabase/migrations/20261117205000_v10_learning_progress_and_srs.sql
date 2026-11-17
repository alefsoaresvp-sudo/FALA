-- FALA V10 — synchronized guided-course state and shared spaced-repetition queue.
-- Additive only: existing sessions, attempts and vocabulary rows remain intact.

create table if not exists public.course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null default 'core-english' check (char_length(course_id) between 1 and 80),
  completed_lesson_ids text[] not null default '{}',
  xp integer not null default 0 check (xp >= 0),
  intro_done boolean not null default false,
  active_lesson_id text,
  streak_days integer not null default 0 check (streak_days >= 0),
  last_study_date date,
  adaptive_retry_count integer not null default 0 check (adaptive_retry_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index if not exists course_progress_user_updated_idx
  on public.course_progress (user_id, updated_at desc);

alter table public.course_progress enable row level security;
drop policy if exists "Learners can manage their own course progress" on public.course_progress;
create policy "Learners can manage their own course progress"
  on public.course_progress for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- New public tables must have explicit Data API grants as well as RLS.
grant select, insert, update, delete on public.course_progress to authenticated;

create table if not exists public.learning_review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('vocabulary', 'grammar', 'phrase', 'error')),
  prompt text not null check (char_length(prompt) between 1 and 500),
  expected_answer text not null default '' check (char_length(expected_answer) <= 1000),
  explanation text not null default '' check (char_length(explanation) <= 1200),
  context text not null default '' check (char_length(context) <= 500),
  skill text not null default 'grammar' check (skill in ('listening', 'speaking', 'reading', 'writing', 'grammar', 'vocabulary')),
  source_attempt_id uuid references public.activity_attempts(id) on delete set null,
  interval_days integer not null default 1 check (interval_days in (1, 3, 7, 15, 30)),
  repetition_count integer not null default 0 check (repetition_count >= 0),
  lapse_count integer not null default 0 check (lapse_count >= 0),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'mastered', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_review_items_due_idx
  on public.learning_review_items (user_id, status, next_review_at);
create index if not exists learning_review_items_kind_idx
  on public.learning_review_items (user_id, item_type, created_at desc);

alter table public.learning_review_items enable row level security;
drop policy if exists "Learners can manage their own review items" on public.learning_review_items;
create policy "Learners can manage their own review items"
  on public.learning_review_items for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.learning_review_items to authenticated;

drop trigger if exists course_progress_set_updated_at on public.course_progress;
create trigger course_progress_set_updated_at
before update on public.course_progress
for each row execute function public.set_updated_at();

drop trigger if exists learning_review_items_set_updated_at on public.learning_review_items;
create trigger learning_review_items_set_updated_at
before update on public.learning_review_items
for each row execute function public.set_updated_at();
