-- Single-use, expiring admin invite links. The API uses the service role;
-- RLS is on with no policies, so the anon key cannot read or write them.
-- The raw invite token is never stored; only a SHA-256 hash of it.
create table if not exists public.admin_invites (
  id text primary key,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists admin_invites_email_idx on public.admin_invites (email, created_at desc);
create index if not exists admin_invites_open_idx on public.admin_invites (email) where used_at is null;
alter table public.admin_invites enable row level security;
revoke all on public.admin_invites from anon, authenticated;
