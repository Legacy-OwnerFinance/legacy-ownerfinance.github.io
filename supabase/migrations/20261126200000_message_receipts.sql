-- v51: chat receipts (additive). delivered_at = the recipient's app received the message; seen_at = the recipient opened the conversation.
-- read_at keeps its meaning (badge/notice read). RLS stays on with no policies: only the api (service role) reads or writes these rows.
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists seen_at timestamptz;
create index if not exists messages_sender_receiver_created_idx on public.messages (sender_id, receiver_id, created_at desc);
create index if not exists messages_undelivered_idx on public.messages (receiver_id) where delivered_at is null;
