-- Owner-admin flag and extra audit columns for investor account deletion approvals.
-- Additive only. The API uses the service role; these tables already have RLS on
-- with no anon/authenticated grants, so the new columns stay off the Data API.

alter table public.app_users
  add column if not exists is_owner boolean not null default false;

-- At most one owner-admin. Identified by this flag (not by display name).
create unique index if not exists app_users_one_owner_idx
  on public.app_users (is_owner)
  where is_owner;

-- Seed the existing primary administrator already treated as protected on the server.
update public.app_users
  set is_owner = true
  where lower(email) = 'fer.okc94@gmail.com'
    and role = 'ADMIN'
    and not exists (select 1 from public.app_users u where u.is_owner);

comment on column public.app_users.is_owner is
  'Primary owner-admin. Only this account may delete investor accounts immediately or approve another admin''s deletion request.';

alter table public.account_deletion_requests
  add column if not exists kind text not null default 'SELF',
  add column if not exists requested_by text,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_note text;

comment on column public.account_deletion_requests.kind is
  'SELF = account holder request; ADMIN_INVESTOR = pending or decided admin request; ADMIN_INVESTOR_DIRECT = owner-admin deleted immediately.';

create index if not exists account_deletion_requests_kind_status_idx
  on public.account_deletion_requests (kind, status, requested_at desc);

-- One open admin-investor request per target account.
create unique index if not exists account_deletion_requests_one_open_investor_idx
  on public.account_deletion_requests (user_id)
  where status = 'REQUESTED' and kind = 'ADMIN_INVESTOR';
