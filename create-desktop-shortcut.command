#!/bin/bash
# Location: full-falldetect/create-desktop-shortcut.command
# Creates "FallDetect.app" and "Stop FallDetect.app" on the Desktop.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node.js LTS from https://nodejs.org or with: brew install node"
  read -r -p "Press Enter to close this window..."
  exit 1
fi
node scripts/falldetect.mjs shortcut
