alter table public.listings drop constraint if exists listings_pin_precision_known;
alter table public.listings drop constraint if exists listings_pin_lng_range;
alter table public.listings drop constraint if exists listings_pin_lat_range;
alter table public.listings drop column if exists pin_source;
alter table public.listings drop column if exists pin_precision;
alter table public.listings drop column if exists pin_lng;
alter table public.listings drop column if exists pin_lat;
