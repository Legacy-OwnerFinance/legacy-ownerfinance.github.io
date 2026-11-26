-- v47: clients that follow an offer read-only.
-- The agent who made the offer, or an Admin, links an existing client account to the offer through the api
-- (offer_clients_add / offer_clients_remove). The linked client then sees only the offers they are linked to
-- (tour_list.followedOffers / offer_followed), read-only, and gets the buyer-side in-app/push notices.
-- Like the other app tables, only the api (service role) reads or writes this table: RLS is on with no policies
-- and anon/authenticated have no grants, so nobody can read the links with the public key.
create table if not exists public.offer_clients (
  offer_id text not null,
  client_user_id text not null references public.app_users(id) on delete cascade,
  added_by text references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (offer_id, client_user_id)
);
create index if not exists offer_clients_client_idx on public.offer_clients (client_user_id, created_at desc);
alter table public.offer_clients enable row level security;
revoke all on public.offer_clients from anon, authenticated;
