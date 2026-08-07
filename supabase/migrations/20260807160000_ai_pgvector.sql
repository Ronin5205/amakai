-- Enable pgvector in the extensions schema (Supabase standard).
-- Migrations run with a restricted search_path, so later SQL must
-- qualify the type as extensions.vector(...).
create extension if not exists vector with schema extensions;
