-- Persistent data tables for workflow Data Table nodes
create table if not exists public.data_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  columns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists data_tables_user_id_idx on public.data_tables (user_id);

alter table public.data_tables enable row level security;

create policy "Users can read own data tables"
  on public.data_tables
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own data tables"
  on public.data_tables
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own data tables"
  on public.data_tables
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own data tables"
  on public.data_tables
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Row storage for data tables
create table if not exists public.data_table_rows (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.data_tables (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  row_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists data_table_rows_table_id_idx
  on public.data_table_rows (table_id);

create index if not exists data_table_rows_user_id_idx
  on public.data_table_rows (user_id);

alter table public.data_table_rows enable row level security;

create policy "Users can read own data table rows"
  on public.data_table_rows
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own data table rows"
  on public.data_table_rows
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own data table rows"
  on public.data_table_rows
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own data table rows"
  on public.data_table_rows
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.data_tables to authenticated;
grant select, insert, update, delete on public.data_table_rows to authenticated;
