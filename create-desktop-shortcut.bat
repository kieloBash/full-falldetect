@REM Location: full-falldetect/create-desktop-shortcut.bat
@echo off
REM Creates "FallDetect" and "Stop FallDetect" shortcuts on the desktop.
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js was not found. Install Node.js LTS from https://nodejs.org & pause & exit /b 1)
node scripts\falldetect.mjs shortcut
