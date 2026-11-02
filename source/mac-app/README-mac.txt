THE MANOR / 风暴宅邸 —— macOS 版（开发版）

需要：macOS 12 或更新。Apple 芯片（M1/M2/M3/M4…）请用 AppleSilicon 包，老的 Intel Mac 请用 Intel 包。
不需要安装 Python、Node 或任何其它软件。游戏所有文件都在 The Manor.app 里，离线可玩。

══════════════════════════════════════════
第一步：解压（重要，双击可能失败）
══════════════════════════════════════════
  macOS 的 Finder 双击解压有时会报"无法展开"或卡住（zip 含 Unix 符号链接时已知问题）。
  请用「终端」解压，打开「终端」，输入以下命令，回车：

    unzip ~/Downloads/TheManor-mac-AppleSilicon.zip -d ~/Downloads/

  Intel Mac 对应：
    unzip ~/Downloads/TheManor-mac-Intel.zip -d ~/Downloads/

  解压后会出现 TheManor 文件夹，里面有 The Manor.app。

══════════════════════════════════════════
第一次打开（只需一次）：
  这个程序没有用付费的 Apple 开发者证书签名/公证，macOS 第一次会拦截。任选一种方法：
  方法 A：双击「Start-First-Time.command」。
          若提示“无法验证开发者”：打开 系统设置 → 隐私与安全性，在页面下方点「仍要打开」，再双击一次。
  方法 B：打开「终端」，输入下面一行（把 The Manor.app 拖进终端窗口可自动填路径），回车：
          xattr -cr "/Applications/The Manor.app"
  之后直接双击 The Manor.app 即可。

游戏内：
  主菜单两个入口：「宅邸美术切片」（前厅/客厅/餐厅/书房/厨房/温室，固定机位）
                  「Wrenfield 地图灰盒」（《空响》MAP V1.0 全部楼层，可走遍整栋宅邸）
  WASD 移动 · Shift 奔跑 · E 开门/调查/攀爬 · 点击画面锁定鼠标 · 手柄可用
  灰盒中：M 楼层俯视图 · K 调试解锁全部门
  菜单栏「游戏」：⌘L 主菜单 · ⌘1 美术切片 · ⌘2 地图灰盒 · 画质：低（卡顿时用）· ⌘R 重新加载
  ⌃⌘F 全屏

说明：这是开发中的版本，不是完整游戏（剧情、怪物、谜题等尚未制作）。
运行时：Electron 44.10.1（MIT 许可），素材来源与授权见源代码包 ASSETS.md（全部 CC0）。
