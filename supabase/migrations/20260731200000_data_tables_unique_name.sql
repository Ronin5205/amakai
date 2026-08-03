-- Enforce unique table names per user (case-insensitive)
create unique index if not exists data_tables_user_name_unique_idx
  on public.data_tables (user_id, lower(trim(name)));
