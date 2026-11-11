/**
 * 中文 → English 界面文案。
 * key 是界面里实际渲染出来的中文（不含首尾空白），由自动翻译层在 DOM 中替换。
 */
export const EN: Record<string, string> = {
  // 通用 / 弹窗
  '取消': 'Cancel',
  '关闭': 'Close',
  '确定': 'OK',
  '保存': 'Save',
  '添加': 'Add',
  '删除': 'Delete',
  '编辑': 'Edit',
  '应用': 'Apply',
  '刷新': 'Refresh',
  '重试': 'Retry',
  '知道了': 'Got it',
  '加载中...': 'Loading...',
  '读取中...': 'Loading...',
  '加载失败': 'Failed to load',
  '加载脚本失败': 'Failed to load script',
  '保存脚本失败': 'Failed to save script',
  '读取脚本失败': 'Failed to read script',
  '新建脚本失败': 'Failed to create script',
  '导入脚本失败': 'Failed to import script',
  '启动脚本失败': 'Failed to start script',
  '删除脚本失败': 'Failed to delete script',
  '请先选择设备': 'Select a device first',
  '尚未选择设备': 'No device selected',
  '设备未连接或离线': 'Device disconnected or offline',
  '权限不足，已尝试 root 但失败': 'Permission denied; root attempt failed',
  '搜索超时，请修改关键词后重试': 'Search timed out; adjust the keywords and try again',
  '设备已断开，请重新连接后重试': 'Device disconnected; reconnect and try again',
  '搜索失败，请修改关键词后重试': 'Search failed; adjust the keywords and try again',
  '该文件不是有效的图片，无法预览': 'This file is not a valid image and cannot be previewed',
  '无法加载图片': 'Unable to load image',
  '无法加载文本': 'Unable to load text',
  '无法创建图像画布': 'Unable to create image canvas',
  'NV21 的宽和高必须是正偶数': 'NV21 width and height must be positive even numbers',
  '选择文件以预览': 'Select a file to preview',
  '文件详情': 'File Details',
  '权限': 'Permissions',
  '宽度': 'Width',
  '高度': 'Height',
  '已从文件名识别': 'Detected from filename',
  '已根据文件大小推测': 'Inferred from file size',
  '，但该尺寸与文件大小不匹配': ", but this size doesn't match the file size",

  // 侧边栏 / 布局
  '设备': 'Devices',
  '未检测到设备': 'No device detected',
  '未检测到ADB': 'ADB not found',
  '未检测到 ADB': 'ADB not found',
  '无线连接': 'Wireless Connect',
  '快捷路径': 'Quick Paths',
  '最近访问': 'Recent',
  '暂无记录': 'No records',
  '内部存储': 'Internal Storage',
  '收藏路径': 'Bookmark Path',
  '收藏': 'Bookmark',
  '管理快捷路径': 'Manage Quick Paths',
  '添加快捷路径': 'Add Quick Path',
  '显示名称': 'Display name',
  'ADB 脚本': 'ADB Scripts',
  '设置': 'Settings',
  '关于与更新': 'About & Updates',
  '返回文件管理': 'Back to Files',
  '返回设置': 'Back to Settings',
  '发现新版本，点击查看': 'New version available, click to view',
  '刷新设备': 'Refresh devices',
  '已连接': 'Connected',
  '离线': 'Offline',
  '未授权': 'Unauthorized',
  '未知': 'Unknown',

  // 工具栏 / 文件列表
  '输入路径回车跳转...': 'Enter a path and press Enter...',
  '全盘搜索，多个关键词用 ; 或 ；分隔...': 'Search all storage; separate keywords with ;...',
  '搜索当前目录，多个关键词用 ; 或 ；分隔...': 'Search this folder; separate keywords with ;...',
  '全盘搜索': 'Global Search',
  '全盘': 'All Storage',
  '搜索中...': 'Searching...',
  '没有匹配的文件': 'No matching files',
  '此目录为空': 'This folder is empty',
  '新建文件夹': 'New Folder',
  '重命名': 'Rename',
  '文件夹名称': 'Folder name',
  '新名称': 'New name',
  '上传到手机': 'Upload to Phone',
  '上传文件': 'Upload Files',
  '上传文件夹': 'Upload Folder',
  '下载到电脑': 'Download to Computer',
  '收藏当前路径': 'Bookmark Current Path',
  '打开预览': 'Open Preview',
  '关闭预览': 'Close Preview',
  '打开所在目录': 'Open Containing Folder',
  '名称': 'Name',
  '大小': 'Size',
  '修改时间': 'Modified',
  '类型': 'Type',
  '文件夹': 'Folder',
  '链接': 'Link',
  '释放文件以上传到当前目录': 'Drop files to upload to the current folder',
  '请检查设备连接状态或路径权限': 'Check the device connection or folder permissions',
  '复制到...': 'Copy to...',
  '移动到...': 'Move to...',
  '加载更多': 'Load more',
  '加载更多（已显示': 'Load more (showing',
  '已显示': 'Showing',
  '已选': 'Selected',
  '项': 'items',
  '共': 'Total',
  '个结果': 'results',
  '）': ')',
  '可使用环境变量': 'Environment variables available:',

  // 复制 / 移动 / 删除
  '复制到': 'Copy to',
  '移动到': 'Move to',
  '目标目录（手机上的绝对路径）': 'Destination folder (absolute path on the phone)',
  '目标路径必须是手机上的绝对路径（以 / 开头）': 'The destination must be an absolute path on the phone (starting with /)',
  '目标目录不能是当前目录': 'The destination cannot be the current folder',
  '目标存在同名文件': 'Same-name files exist',
  '目标目录中已存在同名文件/文件夹，继续将覆盖它们：': 'The destination already contains files or folders with the same names. Continuing will overwrite them:',
  '覆盖并移动': 'Overwrite & Move',
  '覆盖并复制': 'Overwrite & Copy',
  '移动结果': 'Move Result',
  '复制结果': 'Copy Result',
  '确认删除': 'Confirm Delete',
  '删除脚本': 'Delete Script',
  '确定要删除这个脚本吗？': 'Delete this script?',
  '首次运行导入脚本': 'First Run of Imported Script',
  '导入脚本可以执行任意本机命令。请确认你信任该脚本的来源并已检查其内容。': 'Imported scripts can run any command on this computer. Make sure you trust the source and have reviewed the contents.',
  '确认运行': 'Run Anyway',
  '正在删除': 'Deleting',
  '正在复制到目标目录': 'Copying to destination',
  '正在移动到目标目录': 'Moving to destination',
  '复制': 'Copy',
  '移动': 'Move',
  '手机→电脑': 'Phone → Computer',
  '电脑→手机': 'Computer → Phone',

  // 设置 / 更新
  '开机自启动': 'Launch at Login',
  '打开后检测到设备连接自动显示窗口': 'Show the window automatically when a device connects',
  '运行日志': 'Logs',
  '打开目录': 'Open Folder',
  '清空': 'Clear',
  '当前版本': 'Current Version',
  '运行平台': 'Platform',
  '界面语言': 'Language',
  '切换界面显示语言': 'Switch the interface language',
  '简体中文': 'Simplified Chinese',
  '中文': 'Chinese',
  '正在检查GitHubRelease...': 'Checking GitHub Release...',
  '正在检查 GitHub Release...': 'Checking GitHub Release...',
  'GitHub 暂无已发布的正式版本。': 'GitHub has no published releases yet.',
  '版本说明': 'Release Notes',
  '查看 Release': 'View Release',
  '重新检查': 'Check Again',
  '清空运行日志': 'Clear Logs',
  '确定要清空运行日志吗？': 'Clear the logs?',
  '检查更新超时，请检查网络连接后重试': 'Update check timed out; check your network and try again',
  '检查更新失败，请检查网络连接后重试': 'Update check failed; check your network and try again',
  'GitHub 暂时限制了更新检查，请稍后重试': 'GitHub temporarily limited update checks; try again later',
  'GitHub 返回的数据格式异常，请稍后重试': 'GitHub returned an unexpected response; try again later',
  'Release 版本号格式不正确': 'Invalid release version format',
  '无法打开GitHubRelease页面': 'Unable to open the GitHub Release page',
  '无法打开 GitHub Release 页面': 'Unable to open the GitHub Release page',
  '切换开机自启动': 'Toggle launch at login',
  'GitHub 拒绝了更新请求（403），请稍后重试': 'GitHub rejected the update request (403); try again later',

  // 脚本
  '脚本在电脑端运行，并绑定当前 Android 设备': 'Scripts run on this computer and target the current Android device',
  '新建': 'New',
  '导入': 'Import',
  '暂无脚本': 'No scripts',
  '可以新建或导入一个脚本': 'Create or import a script',
  '选择、新建或导入脚本': 'Select, create, or import a script',
  '未保存': 'Unsaved',
  '停止': 'Stop',
  '运行': 'Run',
  '该脚本与当前系统不兼容': 'This script is not compatible with the current OS',
  '运行输出将显示在这里': 'Script output will appear here',
  '运行参数（可选，带空格的参数请使用引号）': 'Arguments (optional; quote arguments containing spaces)',
  '已导入': 'Imported',
  '自定义': 'Custom',

  // 传输队列
  '传输队列': 'Transfer Queue',
  '清除已完成': 'Clear Completed',
  '暂无传输任务': 'No transfers',
  '准备中...': 'Preparing...',

  // 预览
  'NV21 文件不记录宽高，尺寸会保存并应用到同后缀文件。': "NV21 files don't store dimensions; the size is saved and applied to files with the same extension.",
  '修改尺寸': 'Edit Size',
  '预览': 'Preview',
  '信息': 'Info',
  '文本': 'Text',
  '图片': 'Image',
  '仅信息': 'Info Only',
  '路径': 'Path',
  '例如: 192.168.1.100:5555': 'e.g. 192.168.1.100:5555',
  '设置 .': 'Set .',
  '的 NV21 尺寸': 'NV21 size',
  '为': 'as',
  '选择后会自动应用到所有同后缀文件，可在右键菜单中更改。': 'This applies to all files with the same extension and can be changed from the context menu.',

  // ADB 提示 / 无线连接
  'ADBTrans 需要 ADB (Android Debug Bridge) 才能与手机通信。': 'ADBTrans needs ADB (Android Debug Bridge) to communicate with your phone.',
  'ADBTrans 需要 ADB (Android Debug Bridge) 才能与手机通信。 请确保已安装 ADB 并添加到系统 PATH 中。': 'ADBTrans needs ADB (Android Debug Bridge) to communicate with your phone. Make sure ADB is installed and added to your system PATH.',
  '请确保已安装 ADB 并添加到系统 PATH 中。': 'Make sure ADB is installed and added to your system PATH.',
  '安装方式：': 'Installation:',
  '• Windows: 下载 Google 官方 Platform Tools 并添加到 PATH': '• Windows: download the official Google Platform Tools and add them to PATH',
  '• 或安装 Android Studio（自带 ADB）': '• Or install Android Studio (includes ADB)',
  '只能浏览 /sdcard 下的目录': 'You can only browse folders under /sdcard',
  '当前日志及其备份文件将被删除，此操作不可恢复。': 'The current log and its backup will be deleted. This cannot be undone.',
  '重新检测': 'Check Again',
  '下载 Platform Tools': 'Download Platform Tools',
  '输入手机的 IP 地址和端口号进行无线 ADB 连接': "Enter your phone's IP address and port for wireless ADB",
  'IP 地址:端口': 'IP address:port',
  '默认端口为 5555，可省略。需先在手机上开启无线调试。': 'The default port is 5555 and can be omitted. Enable wireless debugging on the phone first.',
  '连接': 'Connect',

  // 目录选择器
  '选择目标文件夹': 'Select Destination Folder',
  '浏览': 'Browse',
  '上一级': 'Up',
  '使用此文件夹': 'Use This Folder',
  '复制到这里': 'Copy Here',
  '移动到这里': 'Move Here',
  '该目录下没有子文件夹': 'No subfolders in this folder',
  '无法读取该目录': 'Unable to read this folder',
  '常用位置': 'Quick Locations',
  '当前文件夹': 'Current Folder',
  '转到': 'Go'
}

interface PatternRule {
  're': RegExp
  'to': string
}

const PATTERNS: PatternRule[] = [
  { re: /^已选 (\d+) 项$/, to: '$1 selected' },
  { re: /^共 (\d+) 项$/, to: '$1 total' },
  { re: /^已显示 (\d+)\/(\d+)$/, to: 'Showing $1/$2' },
  { re: /^确定要删除以下 (\d+) 项吗？$/, to: 'Delete the following $1 item(s)?' },
  { re: /^（仅列出前 (\d+) 项）$/, to: '(showing first $1)' },
  { re: /^\.\.\.等共 (\d+) 项$/, to: '...and $1 more' },
  { re: /^复制完成，但以下 (\d+) 项失败：$/, to: 'Copy completed, but $1 items failed:' },
  { re: /^移动完成，但以下 (\d+) 项失败：$/, to: 'Move completed, but $1 items failed:' },
  { re: /^已停止（(.*)）$/, to: 'Stopped ($1)' },
  { re: /^退出码：(.*)$/, to: 'Exit code: $1' },
  { re: /^目标设备：(.*)$/, to: 'Target device: $1' },
  { re: /^发布于 (.*)$/, to: 'Published $1' },
  { re: /^发现新版本 v(.*)$/, to: 'New version v$1' },
  { re: /^当前已是最新版本（已发布 v(.*)）$/, to: "You're up to date (latest v$1)" },
  { re: /^占用 (.*)，单文件上限 (.*)$/, to: 'Using $1, limit $2 per file' },
  { re: /^ROM：剩余 (.*) \/ 共 (.*)（已用 (.*)%）$/, to: 'ROM: $1 free / $2 total ($3% used)' },
  { re: /^RAM：已用 (.*) \/ 共 (.*)（占用 (.*)%）$/, to: 'RAM: $1 used / $2 total ($3% used)' },
  { re: /^(.*)可用$/, to: '$1 free' },
  { re: /^GitHub 接口访问额度已用完（同一网络共享），预计 (.+) 后可重试$/, to: 'GitHub API quota exhausted on this shared network; retry after $1' },
  { re: /^GitHub 接口访问额度已用完（同一网络共享），请稍后重试$/, to: 'GitHub API quota exhausted on this shared network; try again later' },
  { re: /^GitHub 暂时限制了更新检查，请约 (\d+) 分钟后重试$/, to: 'GitHub temporarily limited update checks; try again in about $1 min' },
  { re: /^GitHub 暂时限制了更新检查，预计 (.+) 后可重试$/, to: 'GitHub temporarily limited update checks; retry after $1' },
  { re: /^GitHub 请求失败（(\d+)），请稍后重试$/, to: 'GitHub request failed ($1); try again later' },
  { re: /^无法识别版本号$/, to: 'Unable to parse version' },
  { re: /^无法识别版本号：(.*)$/, to: 'Unable to parse version: $1' },
  { re: /^(.+) · 已导入$/, to: '$1 · Imported' },
  { re: /^(.+) · 自定义$/, to: '$1 · Custom' },
  { re: /^\.(.+) 的默认预览方式$/, to: 'Default preview for .$1' },
  { re: /^下载 (.*) 版本$/, to: 'Download $1 build' },
  { re: /^新版本已发布，但暂未提供适配 (.*) 的安装包。$/, to: 'A new version is available, but no package for $1 has been published yet.' },
  { re: /^文件大小与 (.*) NV21 不匹配（应为 (.*) 字节，实际 (.*) 字节）$/, to: 'File size does not match $1 NV21 (expected $2 bytes, got $3 bytes)' }
]

function translateCore(core: string): string | null {
  const exact = EN[core]
  if (exact !== undefined) return exact

  for (const rule of PATTERNS) {
    if (rule.re.test(core)) {
      return core.replace(rule.re, rule.to)
    }
  }
  return null
}

/** 翻译 DOM 文本节点，保留首尾空白。 */
export function translateText(raw: string): string {
  const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!match) return raw
  const leading = match[1]
  const core = match[2]
  const trailing = match[3]
  if (!core) return raw
  const translated = translateCore(core)
  return translated === null ? raw : `${leading}${translated}${trailing}`
}

/** 翻译 title / placeholder 等属性，不保留首尾空白。 */
export function translateAttribute(raw: string): string {
  const core = raw.trim()
  if (!core) return raw
  const translated = translateCore(core)
  return translated === null ? raw : translated
}
