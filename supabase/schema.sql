-- FALA English · personalized learner data model
-- Run this only in the dedicated FALA Supabase project.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  goal text not null default 'conversation',
  estimated_level text not null default 'unsure',
  focus_areas text[] not null default '{speaking,listening}',
  daily_minutes integer not null default 10 check (daily_minutes between 5 and 60),
  accent text not null default 'us' check (accent in ('us', 'uk')),
  learning_style text not null default 'mixed' check (learning_style in ('conversation', 'guided', 'mixed')),
  interests text[] not null default '{}',
  custom_interest text not null default '',
  barriers text[] not null default '{}',
  learning_context text not null default 'daily',
  time_horizon text not null default 'flexible',
  feedback_style text not null default 'balanced' check (feedback_style in ('gentle', 'balanced', 'direct')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists custom_interest text not null default '';
alter table public.profiles add column if not exists barriers text[] not null default '{}';
alter table public.profiles add column if not exists learning_context text not null default 'daily';
alter table public.profiles add column if not exists time_horizon text not null default 'flexible';
alter table public.profiles add column if not exists feedback_style text not null default 'balanced';

create table if not exists public.learning_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('lesson', 'speaking', 'listening', 'writing', 'vocabulary', 'conversation')),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 7200),
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null check (char_length(term) between 1 and 120),
  meaning text not null default '',
  example_sentence text,
  next_review_at timestamptz,
  review_interval_days integer not null default 1 check (review_interval_days between 1 and 365),
  created_at timestamptz not null default now(),
  unique (user_id, term)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 5000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  skill text not null,
  interest_context text,
  prompt text not null,
  learner_answer text,
  correction jsonb not null default '{}'::jsonb,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  attempted_at timestamptz not null default now()
);

create index if not exists learning_sessions_user_completed_idx on public.learning_sessions(user_id, completed_at desc);
create index if not exists vocabulary_items_user_review_idx on public.vocabulary_items(user_id, next_review_at);
create index if not exists chat_messages_user_created_idx on public.chat_messages(user_id, created_at desc);
create index if not exists activity_attempts_user_attempted_idx on public.activity_attempts(user_id, attempted_at desc);

alter table public.profiles enable row level security;
alter table public.learning_plans enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_attempts enable row level security;

drop policy if exists "Learners can read their own profile" on public.profiles;
drop policy if exists "Learners can create their own profile" on public.profiles;
drop policy if exists "Learners can update their own profile" on public.profiles;
create policy "Learners can read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "Learners can create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Learners can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can manage their own plans" on public.learning_plans;
create policy "Learners can manage their own plans" on public.learning_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can manage their own sessions" on public.learning_sessions;
create policy "Learners can manage their own sessions" on public.learning_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can manage their own vocabulary" on public.vocabulary_items;
create policy "Learners can manage their own vocabulary" on public.vocabulary_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can manage their own chat" on public.chat_messages;
create policy "Learners can manage their own chat" on public.chat_messages for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can manage their own activity attempts" on public.activity_attempts;
create policy "Learners can manage their own activity attempts" on public.activity_attempts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- New projects require explicit Data API grants; RLS above remains the row-level security boundary.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.learning_plans to authenticated;
grant select, insert, update, delete on public.learning_sessions to authenticated;
grant select, insert, update, delete on public.vocabulary_items to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.activity_attempts to authenticated;

create table if not exists public.learner_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  observation text not null check (char_length(observation) between 1 and 500),
  recommendation text not null check (char_length(recommendation) between 1 and 500),
  confidence numeric(3,2) not null default 0.50 check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learner_insights_user_created_idx on public.learner_insights(user_id, created_at desc);
alter table public.learner_insights enable row level security;
drop policy if exists "Learners can manage their own insights" on public.learner_insights;
create policy "Learners can manage their own insights" on public.learner_insights for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.learner_insights to authenticated;
