-- Rollback for 20261126030000_admin_invites.sql (do not apply unless asked).
drop index if exists public.admin_invites_open_idx;
drop index if exists public.admin_invites_email_idx;
drop table if exists public.admin_invites;
