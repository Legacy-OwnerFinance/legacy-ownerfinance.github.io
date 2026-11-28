-- Optional cache for a parcel-level map pin.
-- Do NOT apply this until the owner says so. The app already works without these columns:
-- latitude/longitude stay the street-level coordinates, and the browser moves the pin onto
-- the county parcel when a free public layer matches the address (cached in the browser).
-- pin_lat/pin_lng are as sensitive as latitude/longitude. This migration does not change
-- grants or row level security; it only adds nullable columns.

alter table public.listings add column if not exists pin_lat double precision;
alter table public.listings add column if not exists pin_lng double precision;
alter table public.listings add column if not exists pin_precision text;
alter table public.listings add column if not exists pin_source text;

alter table public.listings drop constraint if exists listings_pin_lat_range;
alter table public.listings add constraint listings_pin_lat_range
  check (pin_lat is null or (pin_lat >= -90 and pin_lat <= 90));

alter table public.listings drop constraint if exists listings_pin_lng_range;
alter table public.listings add constraint listings_pin_lng_range
  check (pin_lng is null or (pin_lng >= -180 and pin_lng <= 180));

alter table public.listings drop constraint if exists listings_pin_precision_known;
alter table public.listings add constraint listings_pin_precision_known
  check (pin_precision is null or pin_precision in ('parcel', 'parcel-front'));

comment on column public.listings.pin_lat is 'Optional parcel latitude. Null until an owner-approved backfill. Not the public approximate pin.';
comment on column public.listings.pin_lng is 'Optional parcel longitude paired with pin_lat.';
comment on column public.listings.pin_precision is 'parcel (lot centroid) or parcel-front (short step off the street on a deep lot).';
comment on column public.listings.pin_source is 'Which free county parcel layer produced the pin, if one is stored later.';
