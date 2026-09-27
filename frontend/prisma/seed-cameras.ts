// location: frontend/prisma/seed-cameras.ts
//
// Links each camera in config/cameras.json to its room, Sensor ID and patient:
//   npx prisma db seed        # clean DB + admin (first time only)
//   npm run seed:cameras      # this file — safe to run again after editing cameras.json
//   npm run seed:cameras -- --dry-run   # show what would change, write nothing
//
// For each camera it creates the floor and room if missing, sets Sensor.deviceId (the ID
// the camera laptop sends), creates the patient if missing and assigns them to the room.
// It never moves or replaces data an admin entered: conflicts are listed and nothing is
// written until they are fixed. The camera laptop reads the same file (backend/config.py).

import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadCameraSetup, splitName, type CameraEntry } from "./camera-setup";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DRY_RUN = process.argv.includes("--dry-run");

type ResidentRow = {
  id: string;
  firstName: string;
  lastName: string;
  discharged: boolean;
  room: { id: string; label: string; floor: { label: string } } | null;
};

interface Plan {
  cam: CameraEntry;
  floorId: string | null;
  roomId: string | null;
  sensorId: string | null;
  sensorDeviceId: string | null;
  resident: ResidentRow | null;
  steps: string[];
  conflicts: string[];
}

const fullName = (r: { firstName: string; lastName: string }) => `${r.firstName} ${r.lastName}`.trim();

async function plan(facilityId: string, cam: CameraEntry, residents: ResidentRow[]): Promise<Plan> {
  const p: Plan = { cam, floorId: null, roomId: null, sensorId: null, sensorDeviceId: null, resident: null, steps: [], conflicts: [] };

  const floor = await prisma.floor.findUnique({
    where: { facilityId_label: { facilityId, label: cam.floor } },
    select: { id: true },
  });
  p.floorId = floor?.id ?? null;
  if (!floor) p.steps.push(`create floor ${cam.floor}`);

  const room = floor
    ? await prisma.room.findUnique({
        where: { floorId_label: { floorId: floor.id, label: cam.room } },
        select: {
          id: true,
          residentId: true,
          sensor: { select: { id: true, deviceId: true } },
          resident: { select: { firstName: true, lastName: true } },
        },
      })
    : null;
  p.roomId = room?.id ?? null;
  p.sensorId = room?.sensor?.id ?? null;
  p.sensorDeviceId = room?.sensor?.deviceId ?? null;
  if (!room) p.steps.push(`create room ${cam.room}`);

  // Sensor ID must not belong to another room.
  const owner = await prisma.sensor.findUnique({
    where: { deviceId: cam.deviceId },
    select: { roomId: true, room: { select: { label: true, floor: { select: { label: true, facilityId: true } } } } },
  });
  if (owner && owner.roomId !== room?.id) {
    p.conflicts.push(
      `${cam.deviceId} is already the sensor of Floor ${owner.room.floor.label} Room ${owner.room.label}. ` +
        `Change that room's Sensor ID in Admin → Room Management, or fix cameras.json.`
    );
  } else if (p.sensorDeviceId !== cam.deviceId) {
    p.steps.push(p.sensorDeviceId ? `change sensor ${p.sensorDeviceId} → ${cam.deviceId}` : `set sensor ${cam.deviceId}`);
  }

  if (cam.patient) {
    const matches = residents.filter((r) => fullName(r).toLowerCase() === cam.patient.toLowerCase());
    if (matches.length > 1) {
      p.conflicts.push(`There are ${matches.length} patients named "${cam.patient}". Rename one in Patient Management.`);
      return p;
    }
    const match = matches[0] ?? null;
    p.resident = match;

    if (room?.residentId && room.residentId !== match?.id) {
      p.conflicts.push(
        `Room ${cam.room} already has ${room.resident ? fullName(room.resident) : "another patient"}. ` +
          `Move or discharge them in Patient Management, or change the patient in cameras.json.`
      );
    }
    if (match?.room && match.room.id !== room?.id) {
      p.conflicts.push(
        `${cam.patient} is assigned to Floor ${match.room.floor.label} Room ${match.room.label}. Move them in Patient Management first.`
      );
    }
    if (!match) p.steps.push(`create patient ${cam.patient}`);
    if (match?.discharged) p.steps.push(`re-admit ${cam.patient} (was discharged)`);
    if (!room?.residentId || room.residentId !== match?.id) p.steps.push(`assign ${cam.patient} to room ${cam.room}`);
  }

  return p;
}

async function apply(facilityId: string, p: Plan): Promise<void> {
  const { cam } = p;
  await prisma.$transaction(async (tx) => {
    const floorId =
      p.floorId ?? (await tx.floor.upsert({
        where: { facilityId_label: { facilityId, label: cam.floor } },
        update: {},
        create: { facilityId, label: cam.floor },
        select: { id: true },
      })).id;

    let roomId = p.roomId;
    if (!roomId) {
      const created = await tx.room.create({
        data: {
          floorId,
          label: cam.room,
          zone: "Zone A",
          sensor: { create: { deviceId: cam.deviceId, deviceLabel: cam.deviceId, status: "ONLINE" } },
        },
        select: { id: true },
      });
      roomId = created.id;
    } else if (!p.sensorId) {
      await tx.sensor.create({ data: { roomId, deviceId: cam.deviceId, deviceLabel: cam.deviceId, status: "ONLINE" } });
    } else if (p.sensorDeviceId !== cam.deviceId) {
      await tx.sensor.update({ where: { id: p.sensorId }, data: { deviceId: cam.deviceId, deviceLabel: cam.deviceId } });
    }

    if (cam.patient) {
      let residentId = p.resident?.id;
      if (!residentId) {
        const { firstName, lastName } = splitName(cam.patient);
        residentId = (await tx.resident.create({ data: { facilityId, firstName, lastName }, select: { id: true } })).id;
      } else if (p.resident?.discharged) {
        await tx.resident.update({ where: { id: residentId }, data: { discharged: false } });
      }
      await tx.room.update({ where: { id: roomId }, data: { residentId } });
    }
  });
}

async function main() {
  const setup = loadCameraSetup();
  console.log(`Camera setup: ${setup.file}${DRY_RUN ? "  (dry run — nothing will be written)" : ""}\n`);

  const facility = await prisma.facility.findFirst({ where: { name: setup.facility }, select: { id: true } });
  if (!facility) throw new Error(`Facility "${setup.facility}" not found. Run \`npx prisma db seed\` first.`);

  const residents: ResidentRow[] = await prisma.resident.findMany({
    where: { facilityId: facility.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      discharged: true,
      room: { select: { id: true, label: true, floor: { select: { label: true } } } },
    },
  });

  const plans: Plan[] = [];
  for (const cam of setup.cameras) plans.push(await plan(facility.id, cam, residents));

  const conflicts = plans.flatMap((p) => p.conflicts.map((c) => `  ✗ camera ${p.cam.cameraIndex} (${p.cam.deviceId}): ${c}`));
  if (conflicts.length > 0) {
    console.error("Nothing was changed. Fix these first:\n");
    console.error(conflicts.join("\n"));
    process.exitCode = 1;
    return;
  }

  if (!DRY_RUN) for (const p of plans) if (p.steps.length > 0) await apply(facility.id, p);

  console.log("  Camera  Sensor ID    Floor  Room   Patient               Changes");
  for (const p of plans) {
    const c = p.cam;
    console.log(
      `  ${String(c.cameraIndex).padEnd(6)}  ${c.deviceId.padEnd(11)}  ${c.floor.padEnd(5)}  ${c.room.padEnd(5)}  ` +
        `${(c.patient || "(none)").padEnd(20)}  ${p.steps.length ? p.steps.join(", ") : "already up to date"}`
    );
  }
  console.log(
    DRY_RUN
      ? "\nDry run only. Run `npm run seed:cameras` to apply."
      : "\nDone. On the camera laptop, keep the same config/cameras.json and start main.py."
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
