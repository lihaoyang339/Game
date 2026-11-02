#!/bin/bash
# 第一次运行前双击这个文件：去掉 macOS 给网上下载文件加的“隔离”标记，然后打开游戏。
cd "$(dirname "$0")"
echo "正在准备 The Manor ..."
xattr -cr "The Manor.app" 2>/dev/null
open "The Manor.app"
echo "完成。以后直接双击 The Manor.app 即可（也可以把它拖进「应用程序」文件夹）。"
sleep 2
