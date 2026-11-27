-- Owner of record as registered at the county assessor for that property's county.
-- Additive nullable columns on public.listings (the properties table). Nothing existing is changed or deleted.
alter table public.listings add column if not exists owner_of_record text;
alter table public.listings add column if not exists owner_of_record_raw text;
alter table public.listings add column if not exists owner_of_record_source text;
alter table public.listings add column if not exists owner_of_record_checked_at timestamptz;
