#!/usr/bin/env bash
# Build script for No More NA extension
# Creates a distributable ZIP ready for "Load unpacked" installation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=$(grep '"version"' "$ROOT_DIR/manifest.json" | sed 's/.*: *"\(.*\)".*/\1/')
OUT_DIR="$ROOT_DIR/dist"
ZIP_NAME="no-more-na-v${VERSION}.zip"

echo "Building No More NA v${VERSION}..."

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cd "$ROOT_DIR"
zip -r "$OUT_DIR/$ZIP_NAME" \
  manifest.json \
  background.js \
  content.js \
  lib/ \
  popup/ \
  icons/ \
  -x "*.DS_Store" "*.git*"

echo ""
echo "Build complete: dist/$ZIP_NAME"
echo ""
echo "Installation:"
echo "  1. Download and unzip dist/$ZIP_NAME"
echo "  2. Open chrome://extensions (or edge://extensions)"
echo "  3. Enable 'Developer mode'"
echo "  4. Click 'Load unpacked' and select the unzipped folder"
