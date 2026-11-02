#!/bin/bash
# Packs dist/ + launchers into release/the-manor-game.zip (run `npx vite build` first).
set -e
cd "$(dirname "$0")/.."
G=release/game/TheManor
find $G -mindepth 1 -maxdepth 1 ! -name '*.bat' ! -name '*.sh' ! -name 'README.txt' -exec rm -rf {} +
cp -r dist/* $G/
sed 's#index.html#wrenfield.html#g; s#Starting The Manor#Starting Wrenfield greybox#' "$G/启动游戏-Windows.bat" > "$G/启动地图灰盒-Windows.bat"
sed 's#index.html#wrenfield.html#' $G/start-mac-linux.sh > $G/start-greybox-mac-linux.sh; chmod +x $G/*.sh
cd release/game && rm -f ../the-manor-game.zip && zip -qr ../the-manor-game.zip TheManor && ls -la ../the-manor-game.zip
