/*
# Enable live land registry updates

1. Realtime Tables
- Add `land_registry_lands` to the Supabase realtime publication.
- Add `land_registry_transfers` to the Supabase realtime publication.

2. User Experience
- Dashboard maps and registry views can refresh when another user registers, transfers, or lists a parcel.

3. Safety
- This is an additive publication change. Existing table data and access policies are unchanged.
*/

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.land_registry_lands;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.land_registry_transfers;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;