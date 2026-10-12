@REM Location: full-falldetect/setup-falldetect.bat
@echo off
REM One-time setup (run again after code changes).
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js was not found. Install Node.js LTS from https://nodejs.org & pause & exit /b 1)
node scripts\falldetect.mjs setup
