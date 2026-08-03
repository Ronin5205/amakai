create policy "Users can delete own workflow executions"
  on public.workflow_executions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.workflow_executions to authenticated;
