#!/bin/bash
# Run the Godot project from the command line (CI/cloud): re-scan scripts/assets, then run.
# Usage: tools/run.sh [--headless|--render] -- --test=walk --out=DIR
# --render uses Xvfb + the Vulkan software rasteriser (lavapipe) when no GPU is present.
G=${GODOT:-/home/user/godot-dl/Godot_v4.7.2-stable_linux.x86_64}
cd "$(dirname "$0")/.."
"$G" --headless --path . --import >/dev/null 2>&1
MODE=$1; shift
if [ "$MODE" = "--render" ]; then
  exec xvfb-run -a -s "-screen 0 1600x1000x24" "$G" --path . --resolution 1600x1000 "$@"
else
  exec "$G" --headless --path . "$@"
fi
