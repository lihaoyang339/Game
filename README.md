# The Manor — Godot macOS Build

Horror game built with Godot 4.7.2, exported for macOS (Universal: Intel + Apple Silicon).

## Download

Go to **Releases** and download `TheManor-Godot-macOS.zip`.

## Install & Run

```bash
cd ~/Downloads
unzip TheManor-Godot-macOS.zip -d TheManorGodot
xattr -cr TheManorGodot/"The Manor.app"
open TheManorGodot/"The Manor.app"
```

The `xattr -cr` step removes macOS quarantine (required for unsigned apps).

## Controls

| Action | Key |
|--------|-----|
| Move | WASD |
| Look | Mouse |
| Run | Shift |
| Interact | E |
| Flashlight | F |
| Aim | Right Mouse |
| Shoot | Left Mouse (while aiming) |
| Inventory | Tab |
| Pause | Esc |

## Engine

- Godot 4.7.2, Forward+ renderer
- Jolt physics
- Metal driver on macOS
- 38/38 walk-test legs verified in headless mode
