/*
# Add geographic coordinates to land registry

1. Modified Tables
- `land_registry_lands` gains `latitude` and `longitude` columns (double precision, nullable) so each parcel can be placed on an interactive map.

2. Security
- No policy changes; existing public CRUD policies already cover the new columns.

3. Important Notes
- Columns are nullable so existing rows remain valid; new registrations can include coordinates.
- No data is lost — this is an additive change only.
*/

ALTER TABLE public.land_registry_lands
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;