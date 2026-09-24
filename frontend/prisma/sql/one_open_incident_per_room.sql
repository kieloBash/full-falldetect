-- location: frontend/prisma/migrations/<timestamp>_one_open_incident_per_room/migration.sql
-- Create with:  npx prisma migrate dev --create-only --name one_open_incident_per_room
-- then paste this file's contents into the generated migration.sql and run:
--               npx prisma migrate dev
--
-- Enforces "at most one ACTIVE/ACKNOWLEDGED incident per room" in the database (TDS §5.3),
-- so two alerts arriving at the same moment can't both create an incident.
-- Prisma's schema language can't express partial indexes, which is why this is raw SQL.

-- Fails if a room already has two open incidents. Find them first with:
--   SELECT "roomId", COUNT(*) FROM "incidents"
--   WHERE "state" IN ('ACTIVE', 'ACKNOWLEDGED') GROUP BY "roomId" HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS "incidents_one_open_per_room"
  ON "incidents" ("roomId")
  WHERE "state" IN ('ACTIVE', 'ACKNOWLEDGED');
