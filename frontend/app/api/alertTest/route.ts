/**
 * app/api/alert/route.ts
 *
 * Receives fall detection alerts from monitor.py
 * and logs them to the console.
 *
 * POST /api/alert
 * Body: { camera_id: string, timestamp: string }
 */

import { NextRequest, NextResponse } from "next/server";


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AlertPayload {
  camera_id : string;
  timestamp : string;
  screenshot: string;
  missing_secs?: number;
}


// ─────────────────────────────────────────────
// POST /api/alert
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: AlertPayload = await req.json();

    // Validate required fields
    if (!body.camera_id || !body.timestamp || !body.screenshot || body.missing_secs === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: camera_id, timestamp, screenshot, missing_secs are required" },
        { status: 400 }
      );
    }

    // Log to console
    console.log("\n" + "=".repeat(50));
    console.log("  FALL ALERT RECEIVED");
    console.log(`  Camera ID  : ${body.camera_id}`);
    console.log(`  Timestamp  : ${body.timestamp}`);
    console.log(`  Screenshot : ${body.screenshot}`);
    console.log(`  Missing Secs: ${body.missing_secs ?? "N/A"}`);
    console.log(`  Received at: ${new Date().toISOString()}`);
    console.log("=".repeat(50) + "\n");

    return NextResponse.json(
      {
        status     : "received",
        camera_id  : body.camera_id,
        timestamp  : body.timestamp,
        screenshot : body.screenshot,
        missing_secs: body.missing_secs ?? null,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[Alert API] Error:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}