-- Harden billing: webhook idempotency, read-only client access, encrypted Stripe refs.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing', 'processed', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;
-- No policies for authenticated/anon — service role only.

revoke all on public.stripe_webhook_events from anon, authenticated;
grant all on public.stripe_webhook_events to service_role;

-- Encrypted Stripe identifiers (AES-GCM via app crypto). Hash enables webhook lookup.
alter table public.user_billing_profiles
  add column if not exists stripe_customer_id_hash text,
  add column if not exists stripe_customer_id_enc text,
  add column if not exists stripe_subscription_id_enc text,
  add column if not exists last_billing_action_at timestamptz;

-- Migrate any plaintext customer ids into hash + encrypted columns (app backfill may also run).
-- Keep legacy stripe_customer_id temporarily for transition; gateway prefers enc/hash.

create unique index if not exists user_billing_profiles_customer_hash_uidx
  on public.user_billing_profiles (stripe_customer_id_hash)
  where stripe_customer_id_hash is not null;

-- Clients may only read their own billing row. All writes go through service role (gateway).
drop policy if exists "Users can insert own billing profile" on public.user_billing_profiles;
drop policy if exists "Users can update own billing profile" on public.user_billing_profiles;
drop policy if exists "Users can delete own billing profile" on public.user_billing_profiles;

revoke insert, update, delete on public.user_billing_profiles from authenticated;
grant select on public.user_billing_profiles to authenticated;
grant all on public.user_billing_profiles to service_role;
