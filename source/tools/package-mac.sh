#!/bin/bash
# Builds the macOS apps (Apple Silicon + Intel) from dist/ + mac-app/ around the official, unmodified
# Electron runtime (SHA256-verified against Electron's SHASUMS256.txt). Output: release/mac/*.zip
# Usage: tools/package-mac.sh <dir with electron-v$V-darwin-{arm64,x64}.zip>
set -e
cd "$(dirname "$0")/.."
V=44.10.1; DL=${1:-/home/user/macbuild/dl}; OUT=release/mac; W=$OUT/work
( cd $DL && grep -E " \*?electron-v$V-darwin-(arm64|x64)\.zip$" SHASUMS256.txt | sed 's/ \*/  /' | sha256sum -c - )
rm -rf $W && mkdir -p $W
for ARCH in arm64 x64; do
  LABEL=$([ $ARCH = arm64 ] && echo AppleSilicon || echo Intel)
  D=$W/$LABEL/TheManor; mkdir -p $D
  unzip -q $DL/electron-v$V-darwin-$ARCH.zip -d $W/$LABEL/tmp
  mv "$W/$LABEL/tmp/Electron.app" "$D/The Manor.app"; mkdir -p "$D/licenses"; mv $W/$LABEL/tmp/LICENSE "$D/licenses/LICENSE-electron.txt"; mv $W/$LABEL/tmp/LICENSES.chromium.html "$D/licenses/"; rm -rf $W/$LABEL/tmp
  R="$D/The Manor.app/Contents/Resources"
  rm -f "$R/default_app.asar"; cp mac-app/TheManor.icns "$R/electron.icns"
  mkdir -p "$R/app" && cp mac-app/main.cjs mac-app/package.json "$R/app/" && cp -r dist "$R/app/game" && cp mac-app/launcher.html "$R/app/game/"
  cp mac-app/Start-First-Time.command "$D/"; cp mac-app/README-mac.txt "$D/README.txt"; chmod +x "$D/Start-First-Time.command"
  cp node_modules/three/LICENSE "$D/licenses/LICENSE-three.txt"
  ( cd $W/$LABEL && rm -f ../../TheManor-mac-$LABEL.zip && zip -qry ../../TheManor-mac-$LABEL.zip TheManor )
  ls -la $OUT/TheManor-mac-$LABEL.zip
done
