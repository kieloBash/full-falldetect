@REM Location: full-falldetect/start-falldetect.bat
@echo off
REM Starts FallDetect (web app + detection) in this window and opens the Live Monitor.
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js was not found. Install Node.js LTS from https://nodejs.org & pause & exit /b 1)
node scripts\falldetect.mjs start
