-- Undo v39 showing tours (drops only the 3 new tables and the flag).
drop table if exists public.offer_doc_deadlines;
drop table if exists public.showing_tour_feedback;
drop table if exists public.showing_tours;
delete from public.app_private_config where key = 'showing_tours_mode';
