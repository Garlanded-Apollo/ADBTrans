# ADBTrans

基于 ADB 协议的跨平台桌面端文件管理工具，提供手机与电脑之间的双向文件传输和手机文件浏览能力。

## 功能特性

### 设备管理
- **ADB 环境检测** — 启动时自动检测系统是否已安装 ADB，未安装则引导安装
- **设备自动发现** — 实时追踪 USB / Wi-Fi 连接的 Android 设备
- **设备列表展示** — 顶部下拉菜单切换设备，显示连接状态
- **无线连接** — 支持输入 IP:Port 进行 `adb connect`

### 文件浏览
- **路径导航栏** — 支持手动输入路径跳转，前进/后退/主页
- **目录列表** — 展示文件名、大小、修改时间、类型、权限
- **快捷路径** — 侧边栏预设内部存储、Download、DCIM 等常用目录
- **路径历史** — 记录访问过的路径，支持前进/后退

### 文件传输（开发中）
- 手机 → 电脑 / 电脑 → 手机双向传输
- 传输进度展示、传输队列管理

### 文件预览（开发中）
- 图片预览（jpg/png/gif/webp）
- 文本预览 + 语法高亮
- 文件信息面板

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite + electron-vite |
| 样式方案 | TailwindCSS 3 |
| UI 组件 | shadcn/ui (Radix UI) |
| 状态管理 | Zustand |
| ADB 通信 | Node.js child_process |

## 环境要求

- **Node.js** >= 18
- **ADB** (Android Debug Bridge) — 需已安装并添加到系统 PATH
  - macOS: `brew install android-platform-tools`
  - Windows: 下载 [Google Platform Tools](https://developer.android.com/tools/releases/platform-tools) 并添加到 PATH
- **Android 手机** — 已开启 USB 调试

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run typecheck
```

## 项目结构

```
ADBTrans/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 窗口创建、IPC 注册
│   │   └── adb.ts            # ADB 命令封装
│   ├── preload/              # 预加载脚本
│   │   ├── index.ts          # API 桥接
│   │   └── index.d.ts        # 类型声明
│   └── renderer/             # React 前端
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── globals.css
│           ├── lib/utils.ts
│           ├── stores/       # Zustand 状态管理
│           │   ├── deviceStore.ts
│           │   ├── fileStore.ts
│           │   └── queueStore.ts
│           └── components/
│               ├── layout/   # 布局组件
│               │   ├── TitleBar.tsx
│               │   ├── Sidebar.tsx
│               │   └── Toolbar.tsx
│               ├── device/   # 设备相关
│               │   ├── DeviceCard.tsx
│               │   ├── AdbWarning.tsx
│               │   └── WirelessConnectDialog.tsx
│               ├── file/     # 文件列表
│               │   └── FileTable.tsx
│               ├── preview/  # 文件预览
│               │   └── PreviewPanel.tsx
│               ├── queue/    # 传输队列
│               │   └── TransferQueue.tsx
│               └── ui/       # 基础 UI 组件
├── resources/                # 应用图标等资源
├── electron.vite.config.ts
├── tailwind.config.js
└── package.json
```

## 界面布局

```
+----------------------------------------------------------+
| [设备下拉]  Pixel 6              已连接         [设置]    |
+----------------------------------------------------------+
| 手机路径: [/storage/emulated/0/Download]  [跳转] [书签]  |
+--------------------------+-------------------------------+
|  DCIM/                   |  文件预览 / 信息面板          |
|  Documents/              |                               |
|  Download/               |  [图片预览]                   |
|  README.md        12KB   |  或                           |
|  photo.jpg        3.5MB  |  [文本预览 + 语法高亮]        |
|                           |                               |
|  [上传到手机]             |  名称: photo.jpg              |
|  [下载到电脑]             |  大小: 3.5 MB                 |
|  [删除]  [重命名]         |  修改时间: 2026-05-07 14:30   |
+--------------------------+-------------------------------+
| [传输队列] ████████░░ 75%   photo.jpg  2.6MB/s           |
+----------------------------------------------------------+
```

## 数据流

```
用户操作 → React UI
         → Electron IPC (invoke)
         → Main Process (Node.js)
         → child_process.exec(`adb -s <serial> <command>`)
         → ADB Daemon (手机端)
         → 结果返回 → IPC → UI 更新
```

## 里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| M1 | Electron + React 项目搭建，ADB 检测，设备列表 | ✅ |
| M2 | 路径导航、文件列表渲染、adb shell ls 解析 | ✅ |
| M3 | pull / push 实现，进度展示，传输队列 | 🔲 |
| M4 | 图片和文本预览，语法高亮 | 🔲 |
| M5 | 拖拽传输、增删改操作、无线连接、书签 | 🔲 |
| M6 | electron-builder 配置，macOS + Windows 安装包 | 🔲 |

## License

[GPL v3](LICENSE)
