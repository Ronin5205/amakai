-- Conversation threads + messages for the Assistant Orb.

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'ask' check (mode in ('ask', 'guide', 'build')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_threads_user_updated_idx
  on public.ai_threads (user_id, updated_at desc);

alter table public.ai_threads enable row level security;

create policy "Users can read own ai threads"
  on public.ai_threads for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own ai threads"
  on public.ai_threads for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own ai threads"
  on public.ai_threads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own ai threads"
  on public.ai_threads for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_thread_created_idx
  on public.ai_messages (thread_id, created_at);

alter table public.ai_messages enable row level security;

create policy "Users can read own ai messages"
  on public.ai_messages for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own ai messages"
  on public.ai_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own ai messages"
  on public.ai_messages for delete to authenticated
  using ((select auth.uid()) = user_id);
