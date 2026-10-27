import { app, shell } from 'electron'
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogInfo {
  path: string
  dir: string
  size: number
  maxSize: number
}

/** 单个日志文件大小上限：20MB，超出后轮转为 .1 备份（总占用上限 40MB） */
const MAX_LOG_FILE_BYTES = 20 * 1024 * 1024
/** 单条日志最大 16KB，超出部分截断，防止单次输出撑爆日志文件 */
const MAX_MESSAGE_BYTES = 16 * 1024
const LOG_FILE_NAME = 'adbtrans.log'

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
}

let logFilePath = ''
let backupFilePath = ''
let currentSize = 0
let initialized = false
let disabled = false
let hookInstalled = false

function resolveLogDir(): string {
  try {
    return app.getPath('logs')
  } catch {
    // app ready 前 getPath('logs') 可能不可用，回退到 userData/logs
    return join(app.getPath('userData'), 'logs')
  }
}

function rotate(): void {
  try {
    if (existsSync(logFilePath)) {
      // 仅保留 1 个备份：adbtrans.log -> adbtrans.log.1（旧备份直接覆盖）
      if (existsSync(backupFilePath)) unlinkSync(backupFilePath)
      renameSync(logFilePath, backupFilePath)
    }
    currentSize = 0
  } catch (err) {
    disabled = true
    originalConsole.warn('[logger] 日志轮转失败，已禁用文件日志:', err)
  }
}

function ensureInitialized(): boolean {
  if (disabled) return false
  if (initialized) return true
  initialized = true
  try {
    const dir = resolveLogDir()
    mkdirSync(dir, { recursive: true })
    logFilePath = join(dir, LOG_FILE_NAME)
    backupFilePath = `${logFilePath}.1`
    currentSize = existsSync(logFilePath) ? statSync(logFilePath).size : 0
    if (currentSize >= MAX_LOG_FILE_BYTES) rotate()
    return !disabled
  } catch (err) {
    disabled = true
    originalConsole.warn('[logger] 日志初始化失败，已禁用文件日志:', err)
    return false
  }
}

function timestamp(): string {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
  )
}

function truncateMessage(text: string): string {
  const buffer = Buffer.from(text, 'utf8')
  if (buffer.length <= MAX_MESSAGE_BYTES) return text
  // 向前回退到多字节字符边界，避免截断出半个汉字
  let end = MAX_MESSAGE_BYTES
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) end--
  return `${buffer.subarray(0, end).toString('utf8')} …(日志过长已截断)`
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`
  if (arg instanceof Buffer) return arg.toString('utf8')
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}

function formatMessage(args: unknown[]): string {
  return args.map(stringifyArg).join(' ')
}

function writeEntry(level: LogLevel, message: string): void {
  if (!ensureInitialized()) return
  const text = truncateMessage(message)
  const header = `[${timestamp()}] [${level}] `
  // 多行消息逐行补全时间戳与级别，方便 grep 定位
  const content = `${text.split('\n').map((line) => `${header}${line}`).join('\n')}\n`
  const bytes = Buffer.byteLength(content, 'utf8')

  if (currentSize > 0 && currentSize + bytes > MAX_LOG_FILE_BYTES) rotate()
  if (disabled) return

  try {
    appendFileSync(logFilePath, content, 'utf8')
    currentSize += bytes
  } catch (err) {
    disabled = true
    originalConsole.warn('[logger] 写入日志失败，已禁用文件日志:', err)
  }
}

export function getLogInfo(): LogInfo {
  ensureInitialized()
  let size = 0
  try {
    if (logFilePath && existsSync(logFilePath)) size += statSync(logFilePath).size
    if (backupFilePath && existsSync(backupFilePath)) size += statSync(backupFilePath).size
  } catch {
    /* ignore */
  }
  return {
    path: logFilePath,
    dir: logFilePath ? dirname(logFilePath) : '',
    size,
    maxSize: MAX_LOG_FILE_BYTES
  }
}

export function clearLogs(): void {
  if (!ensureInitialized()) return
  try {
    if (existsSync(logFilePath)) writeFileSync(logFilePath, '', 'utf8')
    if (existsSync(backupFilePath)) unlinkSync(backupFilePath)
    currentSize = 0
    writeEntry('INFO', '日志已清空')
  } catch (err) {
    originalConsole.warn('[logger] 清空日志失败:', err)
  }
}

export function openLogDirectory(): void {
  if (!ensureInitialized() || !logFilePath) return
  if (existsSync(logFilePath)) {
    shell.showItemInFolder(logFilePath)
  } else {
    void shell.openPath(dirname(logFilePath))
  }
}

function installConsoleHook(): void {
  if (hookInstalled) return
  hookInstalled = true

  console.log = (...args: unknown[]): void => {
    originalConsole.log(...args)
    writeEntry('INFO', formatMessage(args))
  }
  console.info = (...args: unknown[]): void => {
    originalConsole.info(...args)
    writeEntry('INFO', formatMessage(args))
  }
  console.debug = (...args: unknown[]): void => {
    originalConsole.debug(...args)
    writeEntry('DEBUG', formatMessage(args))
  }
  console.warn = (...args: unknown[]): void => {
    originalConsole.warn(...args)
    writeEntry('WARN', formatMessage(args))
  }
  console.error = (...args: unknown[]): void => {
    originalConsole.error(...args)
    writeEntry('ERROR', formatMessage(args))
  }
}

function installCrashLogging(): void {
  process.on('uncaughtException', (err) => {
    try {
      writeEntry('ERROR', `[uncaughtException] ${err.stack || err.message || String(err)}`)
    } catch {
      /* 日志失败也不能影响退出 */
    }
    originalConsole.error('[uncaughtException]', err)
    // 保持与 Node 默认一致：未捕获异常仍然退出，但原因已写入日志
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    try {
      const detail = reason instanceof Error ? reason.stack || reason.message : String(reason)
      writeEntry('ERROR', `[unhandledRejection] ${detail}`)
    } catch {
      /* ignore */
    }
    originalConsole.error('[unhandledRejection]', reason)
  })
}

// 导入本模块即启用日志：接管 console.* 并捕获崩溃
installConsoleHook()
installCrashLogging()
