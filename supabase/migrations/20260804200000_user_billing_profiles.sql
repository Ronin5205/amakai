-- Billing plan + Stripe customer linkage for portal accounts.
create table if not exists public.user_billing_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_billing_profiles_plan_check check (plan in ('free', 'pro'))
);

create index if not exists user_billing_profiles_plan_idx
  on public.user_billing_profiles (plan);

create unique index if not exists user_billing_profiles_stripe_customer_id_uidx
  on public.user_billing_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists user_billing_profiles_stripe_subscription_id_idx
  on public.user_billing_profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.user_billing_profiles enable row level security;

create policy "Users can read own billing profile"
  on public.user_billing_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own billing profile"
  on public.user_billing_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own billing profile"
  on public.user_billing_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own billing profile"
  on public.user_billing_profiles
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_billing_profiles to authenticated;
