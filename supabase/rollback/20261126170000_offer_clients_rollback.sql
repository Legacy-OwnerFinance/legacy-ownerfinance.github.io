-- Rollback for 20261126170000_offer_clients.sql (removes every offer-follower link).
drop table if exists public.offer_clients;
