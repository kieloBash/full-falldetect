@REM Location: full-falldetect/stop-falldetect.bat
@echo off
REM Stops FallDetect.
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js was not found. Install Node.js LTS from https://nodejs.org & pause & exit /b 1)
node scripts\falldetect.mjs stop
