-- Rollback for 20261126131000_owner_investor_delete_approval. Not applied automatically.
drop index if exists public.account_deletion_requests_one_open_investor_idx;
drop index if exists public.account_deletion_requests_kind_status_idx;
alter table public.account_deletion_requests
  drop column if exists decision_note,
  drop column if exists decided_at,
  drop column if exists requested_by,
  drop column if exists kind;
drop index if exists public.app_users_one_owner_idx;
alter table public.app_users drop column if exists is_owner;
