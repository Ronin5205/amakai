-- Replace local billing address fields with Stripe customer / subscription ids.
alter table public.user_billing_profiles
  drop column if exists address_line1,
  drop column if exists address_line2,
  drop column if exists address_city,
  drop column if exists address_state,
  drop column if exists address_postal_code,
  drop column if exists address_country;

alter table public.user_billing_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text;

create unique index if not exists user_billing_profiles_stripe_customer_id_uidx
  on public.user_billing_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists user_billing_profiles_stripe_subscription_id_idx
  on public.user_billing_profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;
