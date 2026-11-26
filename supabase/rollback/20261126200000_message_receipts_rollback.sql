drop index if exists public.messages_undelivered_idx;
drop index if exists public.messages_sender_receiver_created_idx;
alter table public.messages drop column if exists seen_at;
alter table public.messages drop column if exists delivered_at;
