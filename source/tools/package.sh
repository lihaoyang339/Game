#!/bin/bash
# Builds dist/ and a source+assets zip (no node_modules, no raw downloads) next to the project.
set -e
cd "$(dirname "$0")/.."
npx vite build > /dev/null
cd ..
mkdir -p the-manor/release && rm -f the-manor/release/the-manor-slice.zip
zip -qr the-manor/release/the-manor-slice.zip the-manor -x "the-manor/node_modules/*" "the-manor/assets_src/*" "the-manor/dist/*" "the-manor/release/*"
ls -la the-manor/release/the-manor-slice.zip
