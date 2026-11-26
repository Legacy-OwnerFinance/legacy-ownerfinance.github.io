-- v49: invite a co-buyer to an offer by email.
-- The agent who made the offer (or an Admin) invites any email through the api (offer_clients_add with an email).
-- Existing client account: email + in-app invitation to Accept / Decline. No account yet: email invitation to create one;
-- the verified account joins the offer automatically. Only the SHA-256 of the opaque link token is stored.
-- Like the other app tables, only the api (service role) reads or writes this table: RLS on, no policies, no grants.
create table if not exists public.offer_client_invites (
  id text primary key,
  offer_id text not null,
  email text not null,
  user_id text references public.app_users(id) on delete set null,
  token_hash text not null unique,
  invited_by text references public.app_users(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  lang text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  email_sent_at timestamptz
);
create index if not exists offer_client_invites_offer_idx on public.offer_client_invites (offer_id, status);
create index if not exists offer_client_invites_email_idx on public.offer_client_invites (email, status);
create index if not exists offer_client_invites_by_idx on public.offer_client_invites (invited_by, created_at desc);
alter table public.offer_client_invites enable row level security;
revoke all on public.offer_client_invites from anon, authenticated;
