-- Collapse Ask/Guide/Build into a single auto assistant mode.
alter table public.ai_threads
  drop constraint if exists ai_threads_mode_check;

alter table public.ai_threads
  alter column mode set default 'auto';

update public.ai_threads
set mode = 'auto'
where mode in ('ask', 'guide', 'build');

alter table public.ai_threads
  add constraint ai_threads_mode_check check (mode in ('auto', 'ask', 'guide', 'build'));
