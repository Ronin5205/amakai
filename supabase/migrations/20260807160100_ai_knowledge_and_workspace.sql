-- Global product knowledge chunks (docs + generated catalog facts).
-- Write via service role only (knowledge index script). Authenticated users may read.
-- Note: qualify pgvector types as extensions.vector — migration search_path is empty.

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  heading text not null default '',
  content text not null,
  content_hash text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_knowledge_chunks_content_hash_key unique (content_hash)
);

create index if not exists ai_knowledge_chunks_source_idx
  on public.ai_knowledge_chunks (source);

create index if not exists ai_knowledge_chunks_embedding_hnsw_idx
  on public.ai_knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.ai_knowledge_chunks enable row level security;

create policy "Authenticated users can read knowledge chunks"
  on public.ai_knowledge_chunks
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.ai_knowledge_chunks from authenticated;
grant select on public.ai_knowledge_chunks to authenticated;
grant all on public.ai_knowledge_chunks to service_role;

-- Per-user workspace index (workflow names/labels, table schemas).

create table if not exists public.ai_workspace_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_kind text not null check (source_kind in ('workflow', 'data_table')),
  source_id uuid not null,
  heading text not null default '',
  content text not null,
  content_hash text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_workspace_chunks_user_hash_key unique (user_id, content_hash)
);

create index if not exists ai_workspace_chunks_user_id_idx
  on public.ai_workspace_chunks (user_id);

create index if not exists ai_workspace_chunks_source_idx
  on public.ai_workspace_chunks (user_id, source_kind, source_id);

create index if not exists ai_workspace_chunks_embedding_hnsw_idx
  on public.ai_workspace_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.ai_workspace_chunks enable row level security;

create policy "Users can read own workspace chunks"
  on public.ai_workspace_chunks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own workspace chunks"
  on public.ai_workspace_chunks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own workspace chunks"
  on public.ai_workspace_chunks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own workspace chunks"
  on public.ai_workspace_chunks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Cosine similarity search helpers (1 - distance = similarity).

create or replace function public.match_ai_knowledge(
  query_embedding extensions.vector(1536),
  match_count integer default 8
)
returns table (
  id uuid,
  source text,
  heading text,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.source,
    c.heading,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.ai_knowledge_chunks c
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.match_ai_workspace(
  query_embedding extensions.vector(1536),
  match_count integer default 8,
  filter_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  source_kind text,
  source_id uuid,
  heading text,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.source_kind,
    c.source_id,
    c.heading,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.ai_workspace_chunks c
  where c.user_id = coalesce(filter_user_id, auth.uid())
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

revoke all on function public.match_ai_knowledge(extensions.vector, integer) from public;
revoke all on function public.match_ai_workspace(extensions.vector, integer, uuid) from public;
grant execute on function public.match_ai_knowledge(extensions.vector, integer) to authenticated, service_role;
grant execute on function public.match_ai_workspace(extensions.vector, integer, uuid) to authenticated, service_role;
