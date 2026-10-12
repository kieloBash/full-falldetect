#!/usr/bin/env node
// Location: full-falldetect/scripts/falldetect.mjs
//
// Cross-platform launcher for FallDetect (Windows + macOS).
// No npm packages needed - only Node.js built-ins.
//
//   node scripts/falldetect.mjs setup      one-time install + build
//   node scripts/falldetect.mjs start      start web app + detection, open browser
//   node scripts/falldetect.mjs stop       stop everything
//   node scripts/falldetect.mjs shortcut   desktop shortcut (Windows .lnk / macOS .app)
//
// Normally you double-click the .bat (Windows) or .command (macOS) wrappers.

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

// ---- Settings ---------------------------------------------------------------
const WEB_PORT = 3000;
const STREAM_PORT = 8002;
const WEB_TIMEOUT_SEC = 90; // Next.js start-up
const DETECT_TIMEOUT_SEC = 180; // YOLO model loading (one model per camera)
const MIN_NODE = [20, 9];

// ---- Paths ------------------------------------------------------------------
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");
const VENV = path.join(BACKEND, "venv");
const VENV_PYTHON = IS_WIN
  ? path.join(VENV, "Scripts", "python.exe")
  : path.join(VENV, "bin", "python");
const PID_FILE = path.join(ROOT, ".falldetect.pids");
const LOG_DIR = path.join(ROOT, "logs");
const APP_URL = `http://localhost:${WEB_PORT}/live-monitor`;

// ---- Output helpers ---------------------------------------------------------
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const cyan = paint(36);
const yellow = paint(33);
const red = paint(31);
const green = paint(32);
const magenta = paint(35);
const blue = paint(34);

const step = (msg) => console.log(cyan(`[FallDetect] ${msg}`));
const warn = (msg) => console.log(yellow(`[FallDetect] WARNING: ${msg}`));
const ok = (msg) => console.log(green(`[FallDetect] ${msg}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pause() {
  if (!process.stdin.isTTY) return;
  process.stdout.write("\nPress Enter to close this window...");
  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });
  process.stdin.pause();
}

async function fail(msg) {
  console.log("");
  console.log(red(`[FallDetect] ERROR: ${msg}`));
  await pause();
  process.exit(1);
}

// ---- Process helpers --------------------------------------------------------
function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

// Kills a process and everything it started.
// Windows: taskkill /T. macOS: children are started in their own process group.
function killTree(pid, signal = "SIGKILL") {
  if (!pid) return;
  try {
    if (IS_WIN) {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-pid, signal);
    }
  } catch {
    // already gone
  }
}

function processName(pid) {
  if (IS_WIN) {
    const r = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      encoding: "utf8",
    });
    const m = /^"([^"]+)"/.exec((r.stdout || "").trim());
    return m ? m[1] : "";
  }
  // "command=" shows the launcher as "FallDetect" because start() sets process.title.
  const r = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
  return (r.stdout || "").trim();
}

// PIDs listening on a TCP port (used by "stop" as a fallback).
function pidsOnPort(port) {
  const pids = new Set();
  if (IS_WIN) {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
    for (const line of (r.stdout || "").split(/\r?\n/)) {
      const m = /^\s*TCP\s+\S*:(\d+)\s+\S+\s+LISTENING\s+(\d+)/i.exec(line);
      if (m && Number(m[1]) === port && Number(m[2]) > 4) pids.add(Number(m[2]));
    }
  } else {
    const r = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    for (const line of (r.stdout || "").split("\n")) {
      if (/^\d+$/.test(line.trim())) pids.add(Number(line.trim()));
    }
  }
  return [...pids];
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

// Any HTTP response (200, 307, 404...) means the server is up.
async function waitForUrl(url, timeoutSec, child) {
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    if (child && (child.exitCode !== null || child.signalCode)) return false;
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "manual" });
      return true;
    } catch {
      await sleep(2000);
    }
  }
  return false;
}

function openBrowser(url) {
  const opts = { stdio: "ignore", detached: true };
  if (IS_WIN) spawn("explorer.exe", [url], opts).unref();
  else if (IS_MAC) spawn("open", [url], opts).unref();
  else spawn("xdg-open", [url], opts).unref();
}

function readEnvValue(file, key) {
  if (!fs.existsSync(file)) return null;
  const m = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "m").exec(fs.readFileSync(file, "utf8"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const [needMajor, needMinor] = MIN_NODE;
  return major > needMajor || (major === needMajor && minor >= needMinor);
}

// ---- Checks shared by start ------------------------------------------------
async function preflight() {
  step("Checking requirements...");

  if (!checkNodeVersion()) {
    await fail(`Node.js ${MIN_NODE.join(".")} or newer is required (found ${process.versions.node}).`);
  }
  if (!fs.existsSync(VENV_PYTHON)) {
    await fail("Python virtual environment not found (backend/venv). Run setup first.");
  }
  if (!fs.existsSync(path.join(FRONTEND, ".next", "BUILD_ID"))) {
    await fail("The web app has not been built yet. Run setup first.");
  }
  const backendEnv = path.join(BACKEND, ".env");
  if (!fs.existsSync(backendEnv)) {
    await fail("backend/.env is missing. Copy backend/.env.local.example to backend/.env and fill it in.");
  }
  const frontendEnv = [".env", ".env.local"]
    .map((f) => path.join(FRONTEND, f))
    .find((f) => fs.existsSync(f));
  if (!frontendEnv) {
    await fail("frontend/.env is missing. Copy frontend/.env.local.example to frontend/.env and fill it in.");
  }

  // main.py must have the launcher edits (see docs/launcher/MAIN_PY_CHANGES.md).
  const mainPyPath = path.join(BACKEND, "main.py");
  if (!fs.existsSync(mainPyPath)) await fail("backend/main.py was not found.");
  const mainPy = fs.readFileSync(mainPyPath, "utf8");
  if (!/launcher_args|--all/.test(mainPy)) {
    await fail(
      "backend/main.py does not support --all yet, so it would wait at the camera prompt. " +
        "Apply edit 1 in docs/launcher/MAIN_PY_CHANGES.md.",
    );
  }
  const weights = /WEIGHTS_PATH\s*=\s*r?["']([A-Za-z]:\\[^"']+)["']/.exec(mainPy);
  if (weights && (!IS_WIN || !fs.existsSync(weights[1]))) {
    await fail(
      `WEIGHTS_PATH in main.py is a fixed path that does not exist here (${weights[1]}). ` +
        "Apply edit 2 in docs/launcher/MAIN_PY_CHANGES.md.",
    );
  }

  // Falls must be sent to this computer, not the old Vercel URL.
  const ingestUrl = readEnvValue(backendEnv, "FRONTEND_INGEST_URL");
  if (ingestUrl && !/localhost|127\.0\.0\.1/.test(ingestUrl)) {
    warn("FRONTEND_INGEST_URL in backend/.env does not point to this computer.");
    warn(`Fall alerts will be sent to: ${ingestUrl}`);
  }
  const backSecret = readEnvValue(backendEnv, "MONITOR_INGEST_SECRET");
  const frontSecret = readEnvValue(frontendEnv, "MONITOR_INGEST_SECRET");
  if (backSecret && frontSecret && backSecret !== frontSecret) {
    warn("MONITOR_INGEST_SECRET is different in backend/.env and frontend/.env. Ingest will return 401.");
  }
}

// ---- start ------------------------------------------------------------------
const children = {};
let phase = "starting";
let shuttingDown = false;

function pipeOutput(child, label, color, logFile) {
  const log = fs.createWriteStream(logFile, { flags: "a" });
  log.write(`\n===== ${new Date().toISOString()} =====\n`);
  for (const stream of [child.stdout, child.stderr]) {
    readline.createInterface({ input: stream }).on("line", (line) => {
      console.log(`${color(`[${label}]`)} ${line}`);
      log.write(`${line}\n`);
    });
  }
}

function waitForExit(child, ms) {
  if (child.exitCode !== null || child.signalCode) return Promise.resolve(true);
  return Promise.race([
    new Promise((r) => child.once("exit", () => r(true))),
    sleep(ms).then(() => false),
  ]);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  if (IS_WIN) {
    killTree(child.pid);
    return;
  }
  killTree(child.pid, "SIGTERM");
  if (!(await waitForExit(child, 5000))) killTree(child.pid, "SIGKILL");
}

async function stopAll() {
  await stopChild(children.detect);
  await stopChild(children.web);
  fs.rmSync(PID_FILE, { force: true });
}

async function shutdown(code, reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("");
  if (reason) console.log(red(`[FallDetect] ${reason}`));
  step("Stopping FallDetect...");
  await stopAll();
  ok("FallDetect stopped.");
  if (code !== 0) await pause();
  process.exit(code);
}

async function startFail(msg) {
  shuttingDown = true;
  console.log("");
  console.log(red(`[FallDetect] ERROR: ${msg}`));
  step("Stopping anything that already started...");
  await stopAll();
  await pause();
  process.exit(1);
}

function watchChild(child, label) {
  child.on("exit", (code, signal) => {
    if (shuttingDown || phase !== "running") return;
    shutdown(1, `The ${label} stopped unexpectedly (${signal ?? `exit code ${code}`}). See logs/ for details.`);
  });
}

async function start() {
  process.title = "FallDetect";
  await preflight();

  const webUp = await isPortInUse(WEB_PORT);
  const streamUp = await isPortInUse(STREAM_PORT);
  if (webUp && streamUp) {
    ok("FallDetect is already running. Opening the Live Monitor...");
    openBrowser(APP_URL);
    await sleep(1500);
    return;
  }
  if (webUp || streamUp) {
    await fail(
      `Port ${WEB_PORT} or ${STREAM_PORT} is already in use (FallDetect is half-running or another app uses it). ` +
        "Run stop, then try again.",
    );
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
    process.on(sig, () => shutdown(0, null));
  }

  // 1. Web app. On macOS, detached = own process group so it can be stopped as a tree.
  step(`Starting the web app on port ${WEB_PORT}...`);
  children.web = IS_WIN
    ? spawn("npm run start", { cwd: FRONTEND, shell: true, stdio: ["ignore", "pipe", "pipe"] })
    : spawn("npm", ["run", "start"], { cwd: FRONTEND, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  pipeOutput(children.web, "web", blue, path.join(LOG_DIR, "web.log"));
  watchChild(children.web, "web app");

  if (!(await waitForUrl(`http://127.0.0.1:${WEB_PORT}/`, WEB_TIMEOUT_SEC, children.web))) {
    await startFail(`The web app did not start within ${WEB_TIMEOUT_SEC} seconds. Check the [web] lines above.`);
  }
  ok("Web app is up.");

  // 2. Detection service, started after the web app so the first alert has somewhere to go.
  //    cwd must be backend/ because SCREENSHOT_FOLDER is a relative path.
  step(`Starting the detection service on port ${STREAM_PORT} (loading YOLO models)...`);
  children.detect = spawn(VENV_PYTHON, ["main.py", "--all"], {
    cwd: BACKEND,
    detached: !IS_WIN,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
  });
  pipeOutput(children.detect, "detect", magenta, path.join(LOG_DIR, "detect.log"));
  watchChild(children.detect, "detection service");

  if (!(await waitForUrl(`http://127.0.0.1:${STREAM_PORT}/health`, DETECT_TIMEOUT_SEC, children.detect))) {
    const hint = IS_MAC ? " On macOS, also check that Terminal is allowed to use the camera." : "";
    await startFail(
      `The detection service did not start within ${DETECT_TIMEOUT_SEC} seconds. Check the [detect] lines above.${hint}`,
    );
  }
  ok("Detection service is up.");

  fs.writeFileSync(
    PID_FILE,
    JSON.stringify(
      { launcher: process.pid, web: children.web.pid, detect: children.detect.pid, startedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  phase = "running";

  openBrowser(APP_URL);
  console.log("");
  console.log(green(`  Live Monitor : ${APP_URL}`));
  console.log(green(`  Camera health: http://localhost:${STREAM_PORT}/health`));
  console.log(green(`  Logs         : ${LOG_DIR}`));
  console.log("");
  console.log(cyan("  Keep this window open. Press Ctrl+C or close the window to stop FallDetect."));
  console.log("");
}

// ---- stop -------------------------------------------------------------------
async function stop() {
  let stopped = false;

  if (fs.existsSync(PID_FILE)) {
    let info = {};
    try {
      info = JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    } catch {
      // corrupt file - fall through to the port fallback
    }
    const launcher = info.launcher;
    // Only signal the launcher if that PID is still a Node process (PID reuse safety).
    if (launcher && isAlive(launcher) && /node|falldetect/i.test(processName(launcher))) {
      step(`Stopping FallDetect (launcher PID ${launcher})...`);
      if (IS_WIN) {
        killTree(launcher); // closes the launcher window and its children
      } else {
        try {
          process.kill(launcher, "SIGTERM"); // launcher stops its children cleanly
        } catch {
          // already gone
        }
        for (let i = 0; i < 20 && isAlive(launcher); i++) await sleep(500);
      }
      stopped = true;
    }
    if (!IS_WIN) {
      for (const pid of [info.detect, info.web]) {
        if (pid && isAlive(pid)) {
          killTree(pid);
          stopped = true;
        }
      }
    }
    fs.rmSync(PID_FILE, { force: true });
  }

  // Fallback: anything still listening on the FallDetect ports (e.g. started by hand).
  for (const port of [WEB_PORT, STREAM_PORT]) {
    for (const pid of pidsOnPort(port)) {
      const label = (processName(pid) || "process").split(/[\\/ ]/).filter(Boolean).pop();
      step(`Stopping ${label} on port ${port} (PID ${pid})...`);
      if (IS_WIN) killTree(pid);
      else {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // already gone
        }
      }
      stopped = true;
    }
  }

  ok(stopped ? "FallDetect stopped." : "FallDetect was not running.");
  await sleep(1500);
}

// ---- setup ------------------------------------------------------------------
function runChecked(description, command, args, cwd) {
  step(description);
  const r = spawnSync(command, args, { cwd, stdio: "inherit" });
  return r.status === 0;
}

// npm / npx are .cmd files on Windows, so they need a shell there.
function runShell(description, commandLine, cwd) {
  step(description);
  const r = spawnSync(commandLine, { cwd, stdio: "inherit", shell: true });
  return r.status === 0;
}

function findPython() {
  const candidates = IS_WIN
    ? [["py", ["-3"]], ["python", []]]
    : [["python3.13", []], ["python3.12", []], ["python3.11", []], ["python3", []]];
  for (const [cmd, args] of candidates) {
    const r = spawnSync(cmd, [...args, "-c", "import sys;print('%d.%d' % sys.version_info[:2])"], {
      encoding: "utf8",
    });
    if (r.status === 0 && r.stdout) return { cmd, args, version: r.stdout.trim() };
  }
  return null;
}

async function setup() {
  step("Checking installed tools...");
  if (!checkNodeVersion()) {
    await fail(`Node.js ${MIN_NODE.join(".")} or newer is required (found ${process.versions.node}).`);
  }
  const py = findPython();
  if (!py) {
    await fail(
      IS_WIN
        ? 'Python was not found. Install Python 3.13 from python.org and tick "Add python.exe to PATH".'
        : "Python 3 was not found. Install Python 3.13 from python.org or with: brew install python@3.13",
    );
  }
  console.log(`  Python: ${py.version} (${py.cmd})`);
  console.log(`  Node  : ${process.versions.node}`);
  const [pyMajor, pyMinor] = py.version.split(".").map(Number);
  if (pyMajor === 3 && pyMinor < 10) {
    warn(`Python ${py.version} is too old for the pinned PyTorch. Install Python 3.11-3.13.`);
  }

  // macOS: make the .command files runnable and clear the "downloaded" flag.
  if (IS_MAC) {
    for (const f of fs.readdirSync(ROOT).filter((f) => f.endsWith(".command"))) {
      fs.chmodSync(path.join(ROOT, f), 0o755);
    }
    spawnSync("xattr", ["-dr", "com.apple.quarantine", ROOT], { stdio: "ignore" });
  }

  // Env files. The build needs DATABASE_URL, so stop if they were just created.
  let needsEdit = false;
  const backendEnv = path.join(BACKEND, ".env");
  if (!fs.existsSync(backendEnv)) {
    fs.copyFileSync(path.join(BACKEND, ".env.local.example"), backendEnv);
    warn("Created backend/.env from the example. Fill in MONITOR_INGEST_SECRET.");
    needsEdit = true;
  }
  const hasFrontendEnv = [".env", ".env.local"].some((f) => fs.existsSync(path.join(FRONTEND, f)));
  if (!hasFrontendEnv) {
    fs.copyFileSync(path.join(FRONTEND, ".env.local.example"), path.join(FRONTEND, ".env"));
    warn("Created frontend/.env from the example. Fill in DATABASE_URL, AUTH_JWT_SECRET and MONITOR_INGEST_SECRET.");
    needsEdit = true;
  }
  if (needsEdit) {
    console.log(yellow("\nEdit the .env file(s) above, then run setup again."));
    await pause();
    return;
  }

  if (!fs.existsSync(path.join(BACKEND, "model", "best_v2.pt"))) {
    warn("backend/model/best_v2.pt was not found. The detection service will not start without it.");
  }

  // Python packages.
  if (!fs.existsSync(VENV_PYTHON)) {
    if (!runChecked("Creating Python virtual environment (backend/venv)...", py.cmd, [...py.args, "-m", "venv", VENV], BACKEND)) {
      await fail("Could not create the virtual environment.");
    }
  }
  if (!runChecked("Upgrading pip...", VENV_PYTHON, ["-m", "pip", "install", "--upgrade", "pip"], BACKEND)) {
    await fail("pip upgrade failed. Scroll up for details.");
  }
  const reqFile = fs.existsSync(path.join(BACKEND, "requirements-launcher.txt"))
    ? "requirements-launcher.txt"
    : "requirements.txt";
  if (
    !runChecked(
      `Installing Python packages from ${reqFile} (PyTorch is large, this can take a while)...`,
      VENV_PYTHON,
      ["-m", "pip", "install", "-r", reqFile],
      BACKEND,
    )
  ) {
    await fail("Python package install failed. Scroll up for details.");
  }

  // Web app.
  const npmInstall = fs.existsSync(path.join(FRONTEND, "package-lock.json")) ? "npm ci" : "npm install";
  if (!runShell(`Installing npm packages (${npmInstall})...`, npmInstall, FRONTEND)) {
    await fail("npm install failed. Scroll up for details.");
  }
  if (!runShell("Generating Prisma client...", "npx prisma generate", FRONTEND)) {
    await fail("prisma generate failed. Check DATABASE_URL in frontend/.env.");
  }
  if (!runShell("Building the web app (npm run build)...", "npm run build", FRONTEND)) {
    await fail("The build failed. Scroll up for details.");
  }

  fs.mkdirSync(path.join(FRONTEND, "public", "screenshots"), { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  console.log("");
  ok("Setup complete.");
  console.log("");
  console.log("  Next steps:");
  console.log('   - New database only: run "npx prisma migrate deploy" inside frontend/.');
  console.log('   - "npx prisma db seed" WIPES EVERY TABLE. Only use it on a test database.');
  console.log("   - Optional: run create-desktop-shortcut for a desktop icon.");
  console.log("   - Start the app with start-falldetect.");
  if (IS_MAC) {
    console.log("   - macOS: allow Terminal in System Settings > Privacy & Security > Camera.");
  }
  await pause();
}

// ---- shortcut ---------------------------------------------------------------
function windowsShortcuts() {
  const q = (s) => s.replace(/'/g, "''");
  const ico = path.join(ROOT, "scripts", "falldetect.ico");
  const ps = [
    "$s = New-Object -ComObject WScript.Shell",
    "$d = [Environment]::GetFolderPath('Desktop')",
    "$l = $s.CreateShortcut((Join-Path $d 'FallDetect.lnk'))",
    `$l.TargetPath = '${q(path.join(ROOT, "start-falldetect.bat"))}'`,
    `$l.WorkingDirectory = '${q(ROOT)}'`,
    `$l.IconLocation = '${q(ico)},0'`,
    "$l.Description = 'Start FallDetect'",
    "$l.Save()",
    "$l = $s.CreateShortcut((Join-Path $d 'Stop FallDetect.lnk'))",
    `$l.TargetPath = '${q(path.join(ROOT, "stop-falldetect.bat"))}'`,
    `$l.WorkingDirectory = '${q(ROOT)}'`,
    "$l.IconLocation = \"$env:SystemRoot\\System32\\shell32.dll,27\"",
    "$l.WindowStyle = 7",
    "$l.Description = 'Stop FallDetect'",
    "$l.Save()",
  ].join("; ");
  const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], {
    stdio: "inherit",
  });
  return r.status === 0;
}

// Builds a tiny AppleScript app that opens the .command file in Terminal.
function macApp(name, commandFile, icns) {
  const appPath = path.join(os.homedir(), "Desktop", `${name}.app`);
  fs.rmSync(appPath, { recursive: true, force: true });
  const escaped = commandFile.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `do shell script "open " & quoted form of "${escaped}"`;
  const r = spawnSync("osacompile", ["-o", appPath, "-e", script], { stdio: "inherit" });
  if (r.status !== 0) return false;
  if (icns && fs.existsSync(icns)) {
    fs.copyFileSync(icns, path.join(appPath, "Contents", "Resources", "applet.icns"));
    spawnSync("touch", [appPath]);
  }
  step(`Created ${appPath}`);
  return true;
}

async function shortcut() {
  let done = false;
  if (IS_WIN) {
    done = windowsShortcuts();
    if (done) step('Created "FallDetect" and "Stop FallDetect" on the desktop.');
  } else if (IS_MAC) {
    const icns = path.join(ROOT, "scripts", "falldetect.icns");
    done =
      macApp("FallDetect", path.join(ROOT, "start-falldetect.command"), icns) &&
      macApp("Stop FallDetect", path.join(ROOT, "stop-falldetect.command"), null);
  } else {
    await fail("Desktop shortcuts are only supported on Windows and macOS.");
  }
  if (!done) await fail("Could not create the desktop shortcut.");
  await sleep(1500);
}

// ---- main -------------------------------------------------------------------
const commands = { setup, start, stop, shortcut };
const name = process.argv[2];

if (!commands[name]) {
  console.log("Usage: node scripts/falldetect.mjs <setup|start|stop|shortcut>");
  process.exit(1);
}

commands[name]().catch(async (error) => {
  console.error(error);
  await fail(`Unexpected error in "${name}".`);
});
