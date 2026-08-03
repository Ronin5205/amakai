-- Production workflow execution history
create table if not exists public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  workflow_name text not null,
  status text not null check (
    status in ('running', 'queued', 'completed', 'failed', 'pending_approval')
  ),
  trigger text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  result jsonb not null default '{}'::jsonb
);

create index if not exists workflow_executions_user_id_idx
  on public.workflow_executions (user_id);

create index if not exists workflow_executions_workflow_id_idx
  on public.workflow_executions (workflow_id);

create index if not exists workflow_executions_started_at_idx
  on public.workflow_executions (started_at desc);

alter table public.workflow_executions enable row level security;

create policy "Users can read own workflow executions"
  on public.workflow_executions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own workflow executions"
  on public.workflow_executions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own workflow executions"
  on public.workflow_executions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.workflow_executions to authenticated;
