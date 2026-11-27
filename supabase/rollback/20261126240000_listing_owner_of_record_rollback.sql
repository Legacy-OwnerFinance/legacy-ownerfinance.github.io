-- Rollback for 20261126240000_listing_owner_of_record. Run only after redeploying an api that does not read these columns.
-- Drops only the additive owner-of-record columns. No listing rows, files, or other columns are removed.
alter table public.listings drop column if exists owner_of_record_checked_at;
alter table public.listings drop column if exists owner_of_record_source;
alter table public.listings drop column if exists owner_of_record_raw;
alter table public.listings drop column if exists owner_of_record;
