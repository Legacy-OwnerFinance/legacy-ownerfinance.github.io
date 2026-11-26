alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;
alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status = any (array['REQUESTED'::text, 'CANCELLED'::text, 'DONE'::text]));
