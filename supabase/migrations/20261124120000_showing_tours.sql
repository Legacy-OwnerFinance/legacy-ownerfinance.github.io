-- v39: showing cart ("carrito") + agent-claimed tours. NEEDS FERNANDO'S OK BEFORE IT IS APPLIED.
-- Adds 3 new tables only. Does not change or drop any existing table, column, row or policy.
-- The API reads/writes them with the service role; RLS is on with no policies, so the anon key cannot read them.

create table if not exists public.showing_tours (
  id text primary key,
  client_user_id text not null references public.app_users(id) on delete cascade,
  agent_user_id text references public.app_users(id) on delete set null, -- null = open to all agents; set + direct = sent only to the client's connected agent
  direct boolean not null default false,        -- true: client already has a connected agent, who approves or declines
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED','ACCEPTED','DECLINED','COMPLETED','CANCELLED','EXPIRED')),
  decline_reason text,
  starts_at timestamptz not null,
  tour_day date not null,                       -- America/Chicago calendar day
  listing_ids jsonb not null default '[]'::jsonb, -- route order, edited by client or agent
  notes text,
  accepted_at timestamptz,
  reminder_sent_at timestamptz,                 -- 30 min before
  feedback_prompt_sent_at timestamptz,          -- 30 min after start
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(listing_ids) = 'array' and jsonb_array_length(listing_ids) between 1 and 30)
  -- 5 per showing for clients without a connected agent is enforced by the API (connected clients: up to 30).
);
create index if not exists showing_tours_client_day_idx on public.showing_tours (client_user_id, tour_day);
create index if not exists showing_tours_agent_idx on public.showing_tours (agent_user_id, starts_at desc);
create index if not exists showing_tours_open_idx on public.showing_tours (status, starts_at);

create table if not exists public.showing_tour_feedback (
  id text primary key,
  tour_id text not null references public.showing_tours(id) on delete cascade,
  listing_id text not null,
  author_user_id text not null references public.app_users(id) on delete cascade,
  author_role text not null check (author_role in ('CLIENT','AGENT')),
  rating smallint check (rating between 1 and 5),
  interest text,
  comments text,
  routed_to jsonb not null default '[]'::jsonb,  -- 'admin' + 'user:<company member id>'
  seller_flag text,                              -- 'NO_SELLER_CONTACT' when the home has no owning company
  created_at timestamptz not null default now(),
  unique (tour_id, listing_id, author_user_id)
);
create index if not exists showing_tour_feedback_listing_idx on public.showing_tour_feedback (listing_id, created_at desc);

create table if not exists public.offer_doc_deadlines (
  offer_id text primary key,
  tour_id text references public.showing_tours(id) on delete set null,
  listing_id text not null,
  agent_user_id text references public.app_users(id) on delete set null,
  client_user_id text references public.app_users(id) on delete set null,
  due_at timestamptz not null,                   -- offer time + 12 hours
  docs_uploaded_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists offer_doc_deadlines_due_idx on public.offer_doc_deadlines (due_at) where docs_uploaded_at is null and invalidated_at is null;

alter table public.showing_tours enable row level security;
alter table public.showing_tour_feedback enable row level security;
alter table public.offer_doc_deadlines enable row level security;
revoke all on public.showing_tours, public.showing_tour_feedback, public.offer_doc_deadlines from anon, authenticated;

-- Rollout gate read by the API. 'test_only' = only fer.okc94+legacytest-* accounts can use it / get pushes.
insert into public.app_private_config (key, value) values ('showing_tours_mode', 'test_only')
on conflict (key) do nothing;
-- Reminders, feedback prompts, expiry and the 12-hour offer clock run inside the existing
-- legacy-dispatch-alerts cron (every 5 min, action dispatch_alerts). No new cron job is needed.
