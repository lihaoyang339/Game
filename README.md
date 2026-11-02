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

## Source

`source/` 是完整工程源码：
- `source/godot/` — Godot 4.7.2 工程（用 Godot 打开 `project.godot`；首次打开会重新导入资产，`.godot/` 缓存未上传）
- `source/src/`, `public/`, `tools/`, `tests/` — 原 Three.js 版本及导出/验证工具（`npm install` 后可运行）
- `source/docs/` — 设计、地图、测试报告；`source/ASSETS.md` — 资产来源、作者与许可

未上传：`assets_src/`（原始下载素材，459 MB，来源记录在 ASSETS.md，可用 tools 重新获取）、构建产物与 node_modules。
