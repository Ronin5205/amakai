-- Track cancel-at-period-end so the portal can show Canceling vs Active.
alter table public.user_billing_profiles
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_end timestamptz;
