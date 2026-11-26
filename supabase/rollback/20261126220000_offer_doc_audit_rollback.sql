-- Rollback for 20261126220000_offer_doc_audit. Run only after redeploying api v53 (or any version that does not write these columns).
-- api v54 writes these columns best-effort (errors ignored), so uploads keep working even if they are dropped; soft deletes are also recorded in the offer step log (messages, action_type OFFER_STEP, step DOC_SLOT_REMOVE).
-- Dropping deleted_at loses only the per-row flag; no file or document row is removed.
drop index if exists public.documents_deleted_at_idx;
alter table public.documents drop column if exists deleted_by;
alter table public.documents drop column if exists deleted_at;
alter table public.documents drop column if exists on_behalf_of;
alter table public.documents drop column if exists uploaded_by;
