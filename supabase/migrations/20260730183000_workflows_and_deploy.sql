-- Workflows: draft graph storage with auto-save
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Untitled workflow',
  status text not null default 'draft' check (status in ('draft', 'published')),
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists workflows_user_id_idx on public.workflows (user_id);
create index if not exists workflows_user_status_idx on public.workflows (user_id, status);

alter table public.workflows enable row level security;

create policy "Users can read own workflows"
  on public.workflows
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own workflows"
  on public.workflows
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own workflows"
  on public.workflows
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own workflows"
  on public.workflows
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Immutable snapshots for deployment
create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  graph jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists workflow_versions_workflow_id_idx
  on public.workflow_versions (workflow_id);

alter table public.workflow_versions enable row level security;

create policy "Users can read own workflow versions"
  on public.workflow_versions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own workflow versions"
  on public.workflow_versions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Deployment targets
create table if not exists public.environments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('development', 'staging', 'production')),
  status text not null default 'active' check (status in ('active', 'inactive', 'deploying')),
  deployed_version text not null default '—',
  health text not null default 'healthy' check (health in ('healthy', 'degraded', 'down')),
  workflow_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists environments_user_id_idx on public.environments (user_id);

alter table public.environments enable row level security;

create policy "Users can read own environments"
  on public.environments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own environments"
  on public.environments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own environments"
  on public.environments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Deployment history
create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.environments (id) on delete cascade,
  workflow_version_id uuid not null references public.workflow_versions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  environment_name text not null,
  version text not null,
  status text not null default 'deployed' check (
    status in ('deployed', 'rolling_back', 'failed', 'pending')
  ),
  deployed_at timestamptz not null default now()
);

create index if not exists releases_user_id_idx on public.releases (user_id);

alter table public.releases enable row level security;

create policy "Users can read own releases"
  on public.releases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own releases"
  on public.releases
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workflows to authenticated;
grant select, insert on public.workflow_versions to authenticated;
grant select, insert, update on public.environments to authenticated;
grant select, insert on public.releases to authenticated;
