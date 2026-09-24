// location: frontend/scripts/simulate-node.mjs
// Pretends to be a camera laptop, so you can test heartbeat + ingest without YOLO or a webcam.
// Node 20.6+ (uses --env-file). Run from frontend/ (laptop 1 or any machine on the Wi-Fi):
//   node --env-file=.env scripts/simulate-node.mjs heartbeat
//   node --env-file=.env scripts/simulate-node.mjs heartbeat --offline CAM-202
//   node --env-file=.env scripts/simulate-node.mjs ingest CAM-201     (uploads a test screenshot if configured)
//   node --env-file=.env scripts/simulate-node.mjs race CAM-201       (3 alerts at once)
//   node --env-file=.env scripts/simulate-node.mjs bad-secret
//   node --env-file=.env scripts/simulate-node.mjs bad-path CAM-201   (screenshot path of another camera)
// Env: FRONTEND_BASE_URL (default http://localhost:3000), MONITOR_INGEST_SECRET,
//      SIM_NODE_KEY (default sim-node), SIM_STREAM_BASE_URL (e.g. http://192.168.1.50:8002),
//      SIM_DEVICE_IDS (default CAM-201,CAM-202),
//      SUPABASE_URL + SIM_SUPABASE_UPLOAD_KEY (publishable key) to upload a real test screenshot.

const BASE = (process.env.FRONTEND_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SECRET = process.env.MONITOR_INGEST_SECRET;
const NODE_KEY = process.env.SIM_NODE_KEY ?? "sim-node";
const STREAM_BASE_URL = process.env.SIM_STREAM_BASE_URL || null;
const DEVICE_IDS = (process.env.SIM_DEVICE_IDS ?? "CAM-201,CAM-202").split(",").map((s) => s.trim()).filter(Boolean);
const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const UPLOAD_KEY = process.env.SIM_SUPABASE_UPLOAD_KEY ?? "";
const BUCKET = process.env.SUPABASE_BUCKET ?? "fall-screenshots";

// 320x180 grey JPEG with the text "SIMULATED FALL"
const TEST_JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAC0AUADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDlaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA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CNMvNV+HWmQWEPmyrcM5XcF43SDPJHqKAOHrrfGH/Iv+Gv8Ar1/9kjrOk8IeII42dtOYhQSdsiMfwAOT9BXQa7o2oav4f8P/ANn2/neVajf86rjKJjqR6GgDg6K2bvwtrdnayXNxYMsUY3OVkRsD1wCTWNQAUUUUAFFFFABRRRQAUUUUAFFFFABVuDVNRtoVht9Quool+6iTMqjv0BqpRQA6R3lkaSR2d3JZmY5JJ6kmhnd1RXdmCDaoJztGScD05JP402igBzu8jBpHZiAFyxzwBgD8AAKd5832j7R5r+dv3+ZuO7dnOc9c571HRQAVattRvrSMx2l7cwITuKxSsoJ9cA+1VaKACrcGqajbQrDb6hdRRL91EmZVHfoDVSigC6+sapIoWTUrxgCGw07HkHIPXsQDVKiigByu6K6o7KHG1gDjcMg4PryAfwoV3RXVHZQ42sAcbhkHB9eQD+FNooAKv/23q/8A0Fb7/wACH/xqhRQBaudRvruMR3d7czoDuCyyswB9cE+9Pj1jVIo1jj1K8REAVVWdgAB0AGapUUASTzzXMzTXEryyt953Ysx7dTUdFFABTmd3VFd2YINqgnO0ZJwPTkk/jTaKACnSO8sjSSOzu5LMzHJJPUk02igByO8bFo3ZSQVypxwRgj8QSKsW2o31pGY7S9uYEJ3FYpWUE+uAfaqtFAF2TWNUljaOTUrx0cFWVp2IIPUEZpsGqajbQrDb6hdRRL91EmZVHfoDVSigC3Pqmo3MLQ3GoXUsTfeR5mZT36E1UoooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=";

if (!SECRET) {
  console.error("MONITOR_INGEST_SECRET is not set. Run with: node --env-file=.env scripts/simulate-node.mjs ...");
  process.exit(1);
}

async function show(label, res) {
  console.log(`${label} → ${res.status}`, await res.text());
}

async function heartbeat(offline = []) {
  const res = await fetch(`${BASE}/api/monitor/heartbeat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      nodeKey: NODE_KEY,
      name: "Simulated camera laptop",
      streamBaseUrl: STREAM_BASE_URL,
      cameras: DEVICE_IDS.map((deviceId) => ({ deviceId, status: offline.includes(deviceId) ? "offline" : "online" })),
    }),
  });
  await show("heartbeat", res);
}

/** Same upload the Python service does. Returns the object path, or null if not configured. */
async function uploadScreenshot(deviceId) {
  if (!SUPABASE_URL || !UPLOAD_KEY) {
    console.log("(no SUPABASE_URL / SIM_SUPABASE_UPLOAD_KEY: sending the alert without a screenshot)");
    return null;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${deviceId}/${stamp}_sim${Math.random().toString(16).slice(2, 10)}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: UPLOAD_KEY, Authorization: `Bearer ${UPLOAD_KEY}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
    body: Buffer.from(TEST_JPEG_BASE64, "base64"),
  });
  if (!res.ok) {
    await show("supabase upload FAILED", res);
    return null;
  }
  console.log(`supabase upload → ${res.status} ${path}`);
  return path;
}

async function ingest(deviceId, { secret = SECRET, screenshotPath } = {}) {
  const res = await fetch(`${BASE}/api/monitor/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      confidence: 87.5,
      detectedAt: new Date().toISOString(),
      eventType: "fall",
      screenshotPath: screenshotPath ?? null,
    }),
  });
  await show(`ingest ${deviceId}`, res);
}

const [command, arg, extra] = process.argv.slice(2);
const device = arg && !arg.startsWith("--") ? arg : DEVICE_IDS[0];
switch (command) {
  case "heartbeat":
    await heartbeat(arg === "--offline" && extra ? [extra] : []);
    break;
  case "ingest":
    await ingest(device, { screenshotPath: await uploadScreenshot(device) });
    break;
  case "race":
    await Promise.all([1, 2, 3].map(() => ingest(device)));
    break;
  case "bad-secret":
    await ingest(device, { secret: "wrong-secret" });
    break;
  case "bad-path":
    await ingest(device, { screenshotPath: "CAM-999/../../other.jpg" });
    break;
  default:
    console.log("Commands: heartbeat [--offline CAM-ID] | ingest CAM-ID | race CAM-ID | bad-secret | bad-path CAM-ID");
}
