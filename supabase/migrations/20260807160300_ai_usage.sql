-- AI usage metering: per-turn ledger + monthly rollup.

create table if not exists public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chat', 'embedding')),
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  billable_tokens integer not null default 0 check (billable_tokens >= 0),
  thread_id uuid references public.ai_threads (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_ledger_user_created_idx
  on public.ai_usage_ledger (user_id, created_at desc);

alter table public.ai_usage_ledger enable row level security;

create policy "Users can read own ai usage ledger"
  on public.ai_usage_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.ai_usage_ledger from authenticated;
grant select on public.ai_usage_ledger to authenticated;
grant all on public.ai_usage_ledger to service_role;

create table if not exists public.ai_usage_monthly (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  billable_tokens bigint not null default 0 check (billable_tokens >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.ai_usage_monthly enable row level security;

create policy "Users can read own ai usage monthly"
  on public.ai_usage_monthly
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.ai_usage_monthly from authenticated;
grant select on public.ai_usage_monthly to authenticated;
grant all on public.ai_usage_monthly to service_role;

-- Atomic increment used by the chat/embedding gateways (service role).
create or replace function public.increment_ai_usage_monthly(
  p_user_id uuid,
  p_period_start date,
  p_billable_tokens integer,
  p_kind text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_thread_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total bigint;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  if p_billable_tokens < 0 or p_input_tokens < 0 or p_output_tokens < 0 then
    raise exception 'token counts must be non-negative';
  end if;

  insert into public.ai_usage_ledger (
    user_id, kind, model, input_tokens, output_tokens, billable_tokens, thread_id
  ) values (
    p_user_id, p_kind, p_model, p_input_tokens, p_output_tokens, p_billable_tokens, p_thread_id
  );

  insert into public.ai_usage_monthly (user_id, period_start, billable_tokens, updated_at)
  values (p_user_id, p_period_start, p_billable_tokens, now())
  on conflict (user_id, period_start)
  do update set
    billable_tokens = public.ai_usage_monthly.billable_tokens + excluded.billable_tokens,
    updated_at = now()
  returning billable_tokens into new_total;

  return new_total;
end;
$$;

revoke all on function public.increment_ai_usage_monthly(
  uuid, date, integer, text, text, integer, integer, uuid
) from public;
grant execute on function public.increment_ai_usage_monthly(
  uuid, date, integer, text, text, integer, integer, uuid
) to service_role;
