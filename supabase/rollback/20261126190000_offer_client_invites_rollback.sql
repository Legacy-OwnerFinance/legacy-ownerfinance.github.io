-- Rollback for 20261126190000_offer_client_invites (api v49 keeps working without it: email invitations report offer_invites_off).
drop table if exists public.offer_client_invites;
