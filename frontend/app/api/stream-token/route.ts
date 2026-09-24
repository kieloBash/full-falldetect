// location: frontend/app/api/stream-token/route.ts
// GET /api/stream-token?deviceId=CAM-201
// Returns the camera laptop's MJPEG URL for this camera, with a 5-minute signed token.
// The token is checked when the stream connects; an open stream keeps playing after it expires.
// Session required; the camera must belong to the user's facility.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/api/errors";
import { requireUser } from "@/lib/auth/guards";
import { effectiveSensorStatus, isNodeOnline } from "@/lib/detection-node-server/status";
import { signStreamToken } from "@/lib/detection-node-server/stream-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const deviceId = new URL(req.url).searchParams.get("deviceId");
  if (!deviceId) return jsonError(400, "deviceId is required");

  const sensor = await prisma.sensor.findFirst({
    where: { deviceId, room: { floor: { facilityId: user.facilityId } } },
    include: { node: true },
  });
  if (!sensor) return jsonError(404, "Camera not found");

  const node = sensor.node;
  if (!node?.streamBaseUrl) {
    return NextResponse.json(
      { deviceId, online: false, reason: "no_node", lastHeartbeatAt: null },
      { headers: NO_STORE },
    );
  }
  const lastHeartbeatAt = node.lastHeartbeatAt?.toISOString() ?? null;
  if (!isNodeOnline(node.lastHeartbeatAt)) {
    return NextResponse.json(
      { deviceId, online: false, reason: "node_offline", lastHeartbeatAt },
      { headers: NO_STORE },
    );
  }
  if (effectiveSensorStatus(sensor) === "offline") {
    return NextResponse.json(
      { deviceId, online: false, reason: "camera_offline", lastHeartbeatAt },
      { headers: NO_STORE },
    );
  }

  let signed: { token: string; expiresAt: string };
  try {
    signed = await signStreamToken({ deviceId, userId: user.userId, facilityId: user.facilityId });
  } catch (err) {
    console.error("[stream-token]", err);
    return jsonError(500, "Video streaming is not configured on the server (STREAM_TOKEN_SECRET)");
  }

  const cam = encodeURIComponent(deviceId);
  const qs = `token=${encodeURIComponent(signed.token)}`;
  return NextResponse.json(
    {
      deviceId,
      online: true,
      streamUrl: `${node.streamBaseUrl}/stream/${cam}?${qs}`,
      expiresAt: signed.expiresAt,
    },
    { headers: NO_STORE },
  );
}
