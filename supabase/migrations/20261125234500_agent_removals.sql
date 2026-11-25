-- Client can remove their connected agent with a written reason. Admin (Fernando) can read the reasons.
-- API uses the service role; RLS is on with no policies, so the anon key cannot read them.
create table if not exists public.agent_removals (
  id text primary key,
  client_user_id text not null references public.app_users(id) on delete cascade,
  agent_user_id text references public.app_users(id) on delete set null,
  agent_profile_id text,
  agent_name text,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists agent_removals_created_idx on public.agent_removals (created_at desc);
create index if not exists agent_removals_client_idx on public.agent_removals (client_user_id, created_at desc);
alter table public.agent_removals enable row level security;
revoke all on public.agent_removals from anon, authenticated;
