-- Encrypted secrets vault for workflow integrations (OAuth tokens, API keys, etc.)
create table if not exists public.secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null,
  encrypted_payload text not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint secrets_name_not_blank check (char_length(trim(name)) > 0),
  constraint secrets_kind_not_blank check (char_length(trim(kind)) > 0)
);

create unique index if not exists secrets_user_id_name_lower_idx
  on public.secrets (user_id, lower(trim(name)));

create index if not exists secrets_user_id_idx on public.secrets (user_id);
create index if not exists secrets_user_id_kind_idx on public.secrets (user_id, kind);

alter table public.secrets enable row level security;

create policy "Users can read own secrets"
  on public.secrets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own secrets"
  on public.secrets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own secrets"
  on public.secrets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own secrets"
  on public.secrets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.secrets to authenticated;

-- CSRF-safe OAuth handshake state for Connect Gmail / Outlook flows
create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  state text not null unique,
  secret_name text,
  redirect_path text not null default '/resources/secrets',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists oauth_states_state_idx on public.oauth_states (state);
create index if not exists oauth_states_user_id_idx on public.oauth_states (user_id);

alter table public.oauth_states enable row level security;

create policy "Users can read own oauth states"
  on public.oauth_states
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own oauth states"
  on public.oauth_states
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own oauth states"
  on public.oauth_states
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.oauth_states to authenticated;

-- Inbound trigger subscriptions (Gmail watch, Graph change notifications, webhooks)
create table if not exists public.workflow_trigger_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  trigger_node_id text not null,
  provider text not null,
  operation text not null,
  subscription_ref text,
  account_email text,
  webhook_token text unique,
  status text not null default 'active',
  expires_at timestamptz,
  last_history_id text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists workflow_trigger_subscriptions_user_id_idx
  on public.workflow_trigger_subscriptions (user_id);

create index if not exists workflow_trigger_subscriptions_workflow_id_idx
  on public.workflow_trigger_subscriptions (workflow_id);

create index if not exists workflow_trigger_subscriptions_account_email_idx
  on public.workflow_trigger_subscriptions (account_email);

create index if not exists workflow_trigger_subscriptions_webhook_token_idx
  on public.workflow_trigger_subscriptions (webhook_token);

alter table public.workflow_trigger_subscriptions enable row level security;

create policy "Users can read own trigger subscriptions"
  on public.workflow_trigger_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own trigger subscriptions"
  on public.workflow_trigger_subscriptions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own trigger subscriptions"
  on public.workflow_trigger_subscriptions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own trigger subscriptions"
  on public.workflow_trigger_subscriptions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.workflow_trigger_subscriptions to authenticated;

-- Idempotency keys for inbound email / webhook events
create table if not exists public.workflow_trigger_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  event_key text not null,
  execution_id uuid references public.workflow_executions (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint workflow_trigger_events_unique unique (workflow_id, event_key)
);

create index if not exists workflow_trigger_events_user_id_idx
  on public.workflow_trigger_events (user_id);

alter table public.workflow_trigger_events enable row level security;

create policy "Users can read own trigger events"
  on public.workflow_trigger_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.workflow_trigger_events to authenticated;
