// prisma/seed.ts
//
// Sample seed data for FallDetect.
//
// Run with:  npx prisma db seed
// (add to package.json:  "prisma": { "seed": "tsx prisma/seed.ts" }  — or ts-node)
//
// Covers one facility, two floors, staff (1 admin + 3 nurses), residents,
// rooms with 1:1 resident + sensor assignments, and a spread of incidents
// across every IncidentState so the Live Monitor / Analytics screens have
// something to render: an ACTIVE fall, an ACKNOWLEDGED one, several RESOLVED,
// and a FALSE_ALARM. Passwords are all "password123" (hash below is bcrypt).

import { ActivityType, FalseAlarmReason, IncidentState, InjurySeverity, PrismaClient, RiskLevel, SensorStatus, UserRole } from '@/app/generated/prisma/client';
import { hashPassword } from '@/lib/auth/password';
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

// bcrypt hash of "password123" (cost 10). Replace with your own if hashing live.

// helper: minutes/hours/days ago
const min = (n: number) => new Date(Date.now() - n * 60_000);
const hr = (n: number) => new Date(Date.now() - n * 3_600_000);
const day = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  // wipe existing data (child → parent order) so the seed is idempotent
  await prisma.activityLogEntry.deleteMany();
  await prisma.pinnedRoom.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.room.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.user.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.facility.deleteMany();

  const PW = await hashPassword("password123");

  // ─── Facility + floors ───────────────────────────────────────────────
  const facility = await prisma.facility.create({
    data: {
      name: 'Maplewood Senior Care',
      timezone: 'America/New_York',
      floors: {
        create: [{ label: '2' }, { label: '3' }],
      },
    },
    include: { floors: true },
  });
  const floor2 = facility.floors.find((f) => f.label === '2')!;
  const floor3 = facility.floors.find((f) => f.label === '3')!;

  // ─── Staff ───────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: 'Dana',
      lastName: 'Okafor',
      email: 'dana.okafor@maplewood.example',
      passwordHash: PW,
      role: UserRole.ADMIN,
      emailVerifiedAt: day(120),
      lastLoginAt: min(5),
    },
  });
  const nurseAda = await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: 'Ada',
      lastName: 'Reyes',
      email: 'ada.reyes@maplewood.example',
      passwordHash: PW,
      role: UserRole.NURSE,
      emailVerifiedAt: day(90),
      lastLoginAt: min(2),
    },
  });
  const nurseSam = await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: 'Sam',
      lastName: 'Njoroge',
      email: 'sam.njoroge@maplewood.example',
      passwordHash: PW,
      role: UserRole.NURSE,
      emailVerifiedAt: day(60),
      lastLoginAt: hr(3),
    },
  });
  const nurseLin = await prisma.user.create({
    data: {
      facilityId: facility.id,
      firstName: 'Lin',
      lastName: 'Chen',
      email: 'lin.chen@maplewood.example',
      passwordHash: PW,
      role: UserRole.NURSE,
      emailVerifiedAt: day(45),
      lastLoginAt: hr(20),
    },
  });

  // ─── Residents ───────────────────────────────────────────────────────
  const residentsData = [
    { firstName: 'Eleanor', lastName: 'Whitfield', risk: RiskLevel.HIGH, dob: new Date('1938-04-12'), floor: floor2, room: '201', zone: 'Zone A' },
    { firstName: 'Harold', lastName: 'Baptiste', risk: RiskLevel.MEDIUM, dob: new Date('1942-09-03'), floor: floor2, room: '202', zone: 'Zone A' },
    { firstName: 'Rosa', lastName: 'Delgado', risk: RiskLevel.LOW, dob: new Date('1945-01-27'), floor: floor2, room: '203', zone: 'Zone B' },
    { firstName: 'Walter', lastName: 'Kim', risk: RiskLevel.HIGH, dob: new Date('1936-11-19'), floor: floor3, room: '301', zone: 'Zone A' },
    { firstName: 'Mabel', lastName: 'Ferreira', risk: RiskLevel.MEDIUM, dob: new Date('1940-06-30'), floor: floor3, room: '302', zone: 'Zone B' },
    { firstName: 'Otis', lastName: 'Grant', risk: RiskLevel.LOW, dob: new Date('1948-03-15'), floor: floor3, room: '303', zone: 'Zone B' },
  ];

  const rooms: Record<string, { id: string; residentId: string; sensorId: string }> = {};

  for (const r of residentsData) {
    const resident = await prisma.resident.create({
      data: {
        facilityId: facility.id,
        firstName: r.firstName,
        lastName: r.lastName,
        risk: r.risk,
        dateOfBirth: r.dob,
        admittedAt: day(200 + Math.floor(Math.random() * 100)),
      },
    });

    const room = await prisma.room.create({
      data: {
        floorId: r.floor.id,
        label: r.room,
        zone: r.zone,
        residentId: resident.id,
        sensor: {
          create: {
            status: r.room === '302' ? SensorStatus.DEGRADED : r.room === '303' ? SensorStatus.OFFLINE : SensorStatus.ONLINE,
            deviceLabel: `CAM-${r.room}`,
            lastSeenAt: r.room === '303' ? min(45) : min(1),
            installedAt: day(300),
          },
        },
      },
      include: { sensor: true },
    });

    rooms[r.room] = { id: room.id, residentId: resident.id, sensorId: room.sensor!.id };
  }

  // ─── Incidents (one per state, spread across rooms) ──────────────────
  // ACTIVE — happening now, unacknowledged
  await prisma.incident.create({
    data: {
      residentId: rooms['201'].residentId,
      roomId: rooms['201'].id,
      state: IncidentState.ACTIVE,
      confidence: 98,
      detectedAt: min(2),
    },
  });

  // ACKNOWLEDGED — nurse en route
  await prisma.incident.create({
    data: {
      residentId: rooms['301'].residentId,
      roomId: rooms['301'].id,
      state: IncidentState.ACKNOWLEDGED,
      confidence: 91,
      detectedAt: min(8),
      acknowledgedAt: min(6),
      responderId: nurseSam.id,
    },
  });

  // RESOLVED — minor injury, closed
  await prisma.incident.create({
    data: {
      residentId: rooms['202'].residentId,
      roomId: rooms['202'].id,
      state: IncidentState.RESOLVED,
      confidence: 95,
      detectedAt: hr(4),
      acknowledgedAt: hr(4),
      resolvedAt: hr(3),
      durationSeconds: 3600,
      responderId: nurseAda.id,
      injurySeverity: InjurySeverity.MINOR,
      outcomeNotes: 'Resident assisted back to bed. Bruising on left forearm; vitals stable.',
      notes: 'Family notified. Added extra floor mat.',
    },
  });

  // RESOLVED — no injury
  await prisma.incident.create({
    data: {
      residentId: rooms['302'].residentId,
      roomId: rooms['302'].id,
      state: IncidentState.RESOLVED,
      confidence: 88,
      detectedAt: day(1),
      acknowledgedAt: day(1),
      resolvedAt: day(1),
      durationSeconds: 420,
      responderId: nurseLin.id,
      injurySeverity: InjurySeverity.NONE,
      outcomeNotes: 'Resident lowered self to floor to retrieve item. No injury.',
    },
  });

  // RESOLVED — hospitalized (older, for analytics history)
  await prisma.incident.create({
    data: {
      residentId: rooms['201'].residentId,
      roomId: rooms['201'].id,
      state: IncidentState.RESOLVED,
      confidence: 99,
      detectedAt: day(6),
      acknowledgedAt: day(6),
      resolvedAt: day(6),
      durationSeconds: 900,
      responderId: nurseAda.id,
      injurySeverity: InjurySeverity.HOSPITALIZED,
      outcomeNotes: 'Suspected hip fracture. Transported to St. Mary General.',
      notes: 'Returned after 4 days. Care plan updated to HIGH risk.',
    },
  });

  // FALSE_ALARM — pet/object
  await prisma.incident.create({
    data: {
      residentId: rooms['303'].residentId,
      roomId: rooms['303'].id,
      state: IncidentState.FALSE_ALARM,
      confidence: 62,
      detectedAt: hr(9),
      acknowledgedAt: hr(9),
      resolvedAt: hr(9),
      durationSeconds: 180,
      responderId: nurseSam.id,
      falseAlarmReason: FalseAlarmReason.PET_OR_OBJECT,
    },
  });

  // FALSE_ALARM — other, with note
  await prisma.incident.create({
    data: {
      residentId: rooms['203'].residentId,
      roomId: rooms['203'].id,
      state: IncidentState.FALSE_ALARM,
      confidence: 55,
      detectedAt: day(2),
      acknowledgedAt: day(2),
      resolvedAt: day(2),
      durationSeconds: 240,
      responderId: nurseLin.id,
      falseAlarmReason: FalseAlarmReason.OTHER,
      falseAlarmNote: 'Laundry cart tipped over near sensor field.',
    },
  });

  // ─── Activity feed ───────────────────────────────────────────────────
  await prisma.activityLogEntry.createMany({
    data: [
      { facilityId: facility.id, type: ActivityType.SHIFT_STARTED, message: 'Ada Reyes started shift on Floor 2', actorId: nurseAda.id, createdAt: hr(6) },
      { facilityId: facility.id, type: ActivityType.INCIDENT_DETECTED, message: 'Fall detected in Room 201', roomId: rooms['201'].id, createdAt: min(2) },
      { facilityId: facility.id, type: ActivityType.INCIDENT_ACKNOWLEDGED, message: 'Sam Njoroge acknowledged fall in Room 301', roomId: rooms['301'].id, actorId: nurseSam.id, createdAt: min(6) },
      { facilityId: facility.id, type: ActivityType.INCIDENT_RESOLVED, message: 'Fall in Room 202 resolved by Ada Reyes', roomId: rooms['202'].id, actorId: nurseAda.id, createdAt: hr(3) },
      { facilityId: facility.id, type: ActivityType.INCIDENT_FALSE_ALARM, message: 'Room 303 alert dismissed as false alarm', roomId: rooms['303'].id, actorId: nurseSam.id, createdAt: hr(9) },
      { facilityId: facility.id, type: ActivityType.SENSOR_DEGRADED, message: 'Sensor CAM-302 reporting degraded signal', roomId: rooms['302'].id, createdAt: hr(2) },
      { facilityId: facility.id, type: ActivityType.SENSOR_OFFLINE, message: 'Sensor CAM-303 went offline', roomId: rooms['303'].id, createdAt: min(45) },
    ],
  });

  // ─── Per-nurse preferences ───────────────────────────────────────────
  await prisma.pinnedRoom.createMany({
    data: [
      { userId: nurseAda.id, roomId: rooms['201'].id },
      { userId: nurseAda.id, roomId: rooms['202'].id },
      { userId: nurseSam.id, roomId: rooms['301'].id },
    ],
  });

  await prisma.savedView.create({
    data: {
      userId: nurseAda.id,
      name: 'Floor 2 — High risk',
      filters: { floor: '2', risk: ['HIGH'] },
    },
  });

  // ─── Password reset token (for the "Forgot password?" flow) ──────────
  await prisma.passwordResetToken.create({
    data: {
      userId: nurseLin.id,
      token: 'seed-reset-token-abc123',
      expiresAt: hr(-1), // expires 1h from now
    },
  });

  console.log('Seed complete:');
  console.log(`  facility:  ${facility.name}`);
  console.log(`  floors:    2`);
  console.log(`  users:     4 (1 admin, 3 nurses)`);
  console.log(`  residents: ${residentsData.length}`);
  console.log(`  rooms:     ${residentsData.length} (each with 1 sensor)`);
  console.log(`  incidents: 7 (1 active, 1 acknowledged, 3 resolved, 2 false alarm)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
