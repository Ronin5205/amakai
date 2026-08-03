-- Allow redeploy to replace the live workflow version snapshot
create policy "Users can delete own workflow versions"
  on public.workflow_versions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant delete on public.workflow_versions to authenticated;
