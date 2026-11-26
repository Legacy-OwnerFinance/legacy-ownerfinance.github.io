-- v52: Familia (clients searching together). Additive only. RLS on with no policies: only the api (service role) reads or writes.
create table if not exists public.families (
  id text primary key,
  created_by text references public.app_users(id) on delete set null,
  test boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  user_id text primary key references public.app_users(id) on delete cascade, -- one Family per client
  family_id text not null references public.families(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('CREATOR','MEMBER')),
  joined_at timestamptz not null default now()
);
create index if not exists family_members_family_idx on public.family_members (family_id);
create table if not exists public.family_invites (
  id text primary key,
  family_id text not null references public.families(id) on delete cascade,
  email text not null,
  user_id text references public.app_users(id) on delete set null,
  token_hash text not null unique,
  invited_by text references public.app_users(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
  lang text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  email_sent_at timestamptz
);
create index if not exists family_invites_family_idx on public.family_invites (family_id, status);
create index if not exists family_invites_email_idx on public.family_invites (email, status);
create index if not exists family_invites_inviter_idx on public.family_invites (invited_by, created_at);
create table if not exists public.family_offer_exclusions (
  offer_id text not null,
  user_id text not null references public.app_users(id) on delete cascade,
  excluded_by text,
  created_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);
alter table public.offer_clients add column if not exists via_family text;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.family_offer_exclusions enable row level security;
revoke all on public.families, public.family_members, public.family_invites, public.family_offer_exclusions from anon, authenticated;
