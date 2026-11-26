-- v54 (2026-11-26): per-buyer offer documents — audit columns on documents. Additive only; nothing existing changes.
-- uploaded_by: who uploaded the file (the buyer, the offer's agent, or Admin).
-- on_behalf_of: the buyer whose slot the file was filed in, when someone else (agent/Admin) uploaded it for them.
-- deleted_at / deleted_by: soft delete by the offer's agent or Admin. The row and the storage object are kept so it can be restored.
alter table public.documents add column if not exists uploaded_by text;
alter table public.documents add column if not exists on_behalf_of text;
alter table public.documents add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists deleted_by text;
create index if not exists documents_deleted_at_idx on public.documents (deleted_at) where deleted_at is not null;
