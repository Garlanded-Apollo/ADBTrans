# ADBTrans

基于 ADB 协议的跨平台桌面端文件管理工具，提供手机与电脑之间的双向文件传输和手机文件浏览能力。

## 功能特性

### 设备管理
- **ADB 环境检测** — 启动时自动检测系统是否已安装 ADB，未安装则引导安装
- **设备自动发现** — 实时追踪 USB / Wi-Fi 连接的 Android 设备
- **设备列表展示** — 顶部下拉菜单切换设备，显示连接状态和型号
- **无线连接** — 支持输入 IP:Port 进行 `adb connect`

### 文件浏览
- **路径导航栏** — 支持手动输入路径跳转，前进/后退/主页
- **目录列表** — 展示文件名、大小、修改时间、类型、权限
- **列宽调整** — 拖拽调整各列宽度
- **文件搜索** — 当前目录下按文件名搜索
- **多选操作** — 长按或 Shift+click 多选文件
- **路径历史** — 记录访问过的路径，支持前进/后退

### 快捷路径与收藏
- **快捷路径** — 侧边栏预设常用目录（内部存储、Download、DCIM 等）
- **路径收藏** — 工具栏收藏按钮一键收藏当前路径，支持自定义名称
- **管理收藏** — 齿轮图标打开管理对话框，支持添加/编辑/删除快捷路径
- **数据持久化** — 收藏数据保存在 localStorage，重启不丢失

### 文件传输
- **双向传输** — 手机 → 电脑 / 电脑 → 手机
- **文件夹传输** — 支持递归下载整个文件夹
- **传输进度** — 实时显示进度条、速度
- **传输队列** — 多任务排队执行，支持取消，最新任务置顶显示
- **拖拽上传** — 侧边栏拖拽文件上传到手机

### 文件预览
- **图片预览** — 支持 jpg/png/gif/webp/bmp，选中即预览
- **图片缩略图** — 文件列表中图片显示 32x32 缩略图
- **文本预览** — 支持 txt/log/md/json/xml/html/css/js/ts/py 等文本文件
- **文件信息** — 显示文件名、路径、大小、修改时间、权限等详情
- **智能布局** — 图片：预览+信息合并显示；文本：预览/信息分 Tab；其他：仅信息

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
- **ADB** — 已内置在 `resources/adb/` 目录，无需额外安装
- **Android 手机** — 已开启 USB 调试

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 类型检查
npm run typecheck
```

## 打包

```bash
# 打包 macOS 版本（仅包含 mac adb，约 116MB）
npm run dist:mac

# 打包 Windows 版本（仅包含 win adb）
npm run dist:win

# 打包所有平台版本（包含 mac + win adb，约 123MB）
npm run dist
```

打包产物位于 `release/` 目录：
- macOS: `ADBTrans-{version}-arm64.dmg`
- Windows: `ADBTrans-{version}-Setup.exe`

## 项目结构

```
ADBTrans/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 窗口创建、IPC 注册
│   │   └── adb.ts            # ADB 命令封装（ls/pull/push/cat 等）
│   ├── preload/              # 预加载脚本
│   │   ├── index.ts          # API 桥接（contextBridge）
│   │   └── index.d.ts        # 类型声明
│   └── renderer/             # React 前端
│       └── src/
│           ├── App.tsx        # 根组件，布局编排
│           ├── main.tsx       # 入口
│           ├── globals.css    # 全局样式
│           ├── lib/utils.ts   # 工具函数
│           ├── stores/        # Zustand 状态管理
│           │   ├── deviceStore.ts    # 设备连接状态
│           │   ├── fileStore.ts      # 文件列表、选中、历史
│           │   ├── queueStore.ts     # 传输队列
│           │   └── bookmarkStore.ts  # 快捷路径收藏
│           └── components/
│               ├── layout/          # 布局组件
│               │   ├── TitleBar.tsx        # 顶栏（设备选择）
│               │   ├── Sidebar.tsx         # 侧边栏（快捷路径、收藏管理）
│               │   └── Toolbar.tsx         # 工具栏（导航、上传/下载、收藏）
│               ├── device/          # 设备相关
│               │   ├── DeviceCard.tsx      # 设备卡片
│               │   ├── AdbWarning.tsx      # ADB 未安装提示
│               │   └── WirelessConnectDialog.tsx  # 无线连接对话框
│               ├── file/            # 文件浏览
│               │   ├── FileTable.tsx       # 文件列表表格（多选、搜索、列宽调整）
│               │   └── Thumbnail.tsx       # 图片缩略图组件
│               ├── preview/         # 文件预览
│               │   └── PreviewPanel.tsx    # 预览面板（图片/文本/信息）
│               ├── queue/           # 传输队列
│               │   └── TransferQueue.tsx   # 队列面板（进度、状态、操作）
│               ├── bookmark/        # 书签管理
│               │   └── BookmarkDialog.tsx  # 收藏管理对话框
│               └── ui/              # 基础 UI 组件（shadcn/ui）
├── resources/                # 应用图标、ADB 工具等资源
│   ├── icon.icns            # macOS 应用图标
│   ├── icon.png             # 通用应用图标
│   └── adb/                 # 内置 ADB 工具
│       ├── mac/             # macOS 版本
│       └── win/             # Windows 版本
├── scripts/                 # 构建脚本
├── electron.vite.config.ts
├── tailwind.config.js
└── package.json
```

## 界面布局

```
+----------------------------------------------------------+
| [设备下拉]  Pixel 6              已连接         [设置]    |
+----------------------------------------------------------+
| [←] [→] [🏠] [/storage/emulated/0] [🔍] [⭐] [↑] [↓] [🗑] |
+--------------------------+-------------------------------+
| ⚙ 快捷路径              |                               |
|  内部存储                |         图片预览               |
|  Download               |     ┌─────────────┐           |
|  DCIM                   |     │   photo.jpg  │           |
|  Pictures               |     └─────────────┘           |
|  Documents              |  ─────────────────────────     |
|                         |  名称   photo.jpg              |
|  最近访问                |  大小   3.5 MB                 |
|                         |  修改时间 2026-05-07 14:30     |
| [拖拽文件到此处上传]      |                               |
+--------------------------+-------------------------------+
| [传输队列] ↑ 最新在上    ████████░░ 75%  2.6MB/s         |
+----------------------------------------------------------+
```

## 数据流

```
用户操作 → React UI (Zustand Store)
         → Electron IPC (window.api.invoke)
         → Main Process (ipcMain.handle)
         → ADB Service (child_process.spawn/execFile)
         → ADB Daemon (Android 设备)
         → 结果返回 → IPC → UI 更新
```

## 里程碑

| 阶段 | 内容 | 状态 |
|------|------|------|
| M1 | Electron + React 项目搭建，ADB 检测，设备列表 | ✅ |
| M2 | 路径导航、文件列表渲染、adb shell ls 解析 | ✅ |
| M3 | pull / push 实现，进度展示，传输队列 | ✅ |
| M4 | 图片和文本预览，图片缩略图，文件信息面板 | ✅ |
| M5 | 拖拽传输、增删改操作、无线连接、书签收藏 | ✅ |
| M6 | electron-builder 配置，macOS + Windows 安装包 | ✅ |

## License

[GPL v3](LICENSE)
