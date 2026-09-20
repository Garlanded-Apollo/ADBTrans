import { app, dialog, BrowserWindow } from 'electron'
import { EventEmitter } from 'events'
import { spawn, type ChildProcess } from 'child_process'
import { basename, dirname, extname, join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { getAdbExecutablePath } from './adb'

export type ScriptPlatform = 'mac' | 'win'

export interface AdbScript {
  id: string
  name: string
  fileName: string
  platform: ScriptPlatform
  source: 'custom' | 'imported'
  createdAt: number
  updatedAt: number
  lastRunAt?: number
}

export interface ScriptRunRequest {
  scriptId: string
  serial: string
  model?: string
  args: string[]
}

interface ScriptIndex {
  scripts: AdbScript[]
}

function currentPlatform(): ScriptPlatform | null {
  if (process.platform === 'darwin') return 'mac'
  if (process.platform === 'win32') return 'win'
  return null
}

function allowedExtensions(platform: ScriptPlatform): string[] {
  return platform === 'mac' ? ['.sh', '.command'] : ['.bat', '.cmd']
}

function defaultContent(platform: ScriptPlatform): string {
  if (platform === 'mac') {
    return '#!/bin/zsh\n\necho "Device: $ADBTRANS_SERIAL"\nadb -s "$ADBTRANS_SERIAL" shell getprop ro.product.model\n'
  }
  return '@echo off\r\necho Device: %ADBTRANS_SERIAL%\r\nadb -s "%ADBTRANS_SERIAL%" shell getprop ro.product.model\r\n'
}

function quoteWindowsArgument(value: string): string {
  return `"${value.replace(/(["^&|<>])/g, '^$1')}"`
}

export class ScriptService extends EventEmitter {
  private readonly activeRuns = new Map<string, ChildProcess>()

  private get rootDir(): string {
    return join(app.getPath('userData'), 'scripts')
  }

  private get indexPath(): string {
    return join(this.rootDir, 'index.json')
  }

  private ensureRoot(): void {
    mkdirSync(this.rootDir, { recursive: true })
  }

  private readIndex(): ScriptIndex {
    this.ensureRoot()
    if (!existsSync(this.indexPath)) return { scripts: [] }
    try {
      const parsed = JSON.parse(readFileSync(this.indexPath, 'utf8')) as ScriptIndex
      return { scripts: Array.isArray(parsed.scripts) ? parsed.scripts : [] }
    } catch {
      return { scripts: [] }
    }
  }

  private writeIndex(index: ScriptIndex): void {
    this.ensureRoot()
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf8')
  }

  private getScript(id: string): AdbScript {
    const script = this.readIndex().scripts.find((item) => item.id === id)
    if (!script) throw new Error('脚本不存在或已被删除')
    return script
  }

  private getScriptPath(script: AdbScript): string {
    const path = join(this.rootDir, script.fileName)
    if (!existsSync(path)) throw new Error('脚本文件不存在')
    return path
  }

  list(): AdbScript[] {
    return this.readIndex().scripts.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  read(id: string): { script: AdbScript; content: string } {
    const script = this.getScript(id)
    return { script, content: readFileSync(this.getScriptPath(script), 'utf8') }
  }

  create(name?: string): { script: AdbScript; content: string } {
    const platform = currentPlatform()
    if (!platform) throw new Error('当前系统暂不支持运行主机脚本')
    const id = randomUUID()
    const extension = platform === 'mac' ? '.sh' : '.bat'
    const now = Date.now()
    const script: AdbScript = {
      id,
      name: name?.trim() || '未命名脚本',
      fileName: `${id}${extension}`,
      platform,
      source: 'custom',
      createdAt: now,
      updatedAt: now
    }
    const content = defaultContent(platform)
    this.ensureRoot()
    writeFileSync(join(this.rootDir, script.fileName), content, 'utf8')
    const index = this.readIndex()
    index.scripts.push(script)
    this.writeIndex(index)
    return { script, content }
  }

  async importFromDialog(window: BrowserWindow): Promise<AdbScript[]> {
    const platform = currentPlatform()
    if (!platform) throw new Error('当前系统暂不支持导入脚本')
    const extensions = allowedExtensions(platform).map((extension) => extension.slice(1))
    const result = await dialog.showOpenDialog(window, {
      title: '导入 ADB 脚本',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: platform === 'mac' ? 'Shell 脚本' : '批处理脚本', extensions }]
    })
    if (result.canceled) return []

    for (const sourcePath of result.filePaths) {
      const extension = extname(sourcePath).toLowerCase()
      if (!allowedExtensions(platform).includes(extension)) {
        throw new Error(`当前平台不支持 ${extension || '无后缀'} 脚本`)
      }
      if (statSync(sourcePath).size > 1024 * 1024) {
        throw new Error(`脚本 ${basename(sourcePath)} 超过 1 MB，无法导入`)
      }
    }

    this.ensureRoot()
    const index = this.readIndex()
    const imported: AdbScript[] = []
    for (const sourcePath of result.filePaths) {
      const extension = extname(sourcePath).toLowerCase()
      const id = randomUUID()
      const now = Date.now()
      const script: AdbScript = {
        id,
        name: basename(sourcePath, extension),
        fileName: `${id}${extension}`,
        platform,
        source: 'imported',
        createdAt: now,
        updatedAt: now
      }
      copyFileSync(sourcePath, join(this.rootDir, script.fileName))
      index.scripts.push(script)
      imported.push(script)
    }
    this.writeIndex(index)
    return imported
  }

  update(id: string, name: string, content: string): AdbScript {
    const index = this.readIndex()
    const position = index.scripts.findIndex((item) => item.id === id)
    if (position < 0) throw new Error('脚本不存在或已被删除')
    const script = { ...index.scripts[position], name: name.trim() || '未命名脚本', updatedAt: Date.now() }
    writeFileSync(this.getScriptPath(script), content, 'utf8')
    index.scripts[position] = script
    this.writeIndex(index)
    return script
  }

  delete(id: string): void {
    const index = this.readIndex()
    const script = index.scripts.find((item) => item.id === id)
    if (!script) return
    if ([...this.activeRuns.keys()].some((runId) => runId.startsWith(`${id}:`))) {
      throw new Error('脚本正在运行，请先停止')
    }
    rmSync(join(this.rootDir, script.fileName), { force: true })
    index.scripts = index.scripts.filter((item) => item.id !== id)
    this.writeIndex(index)
  }

  run(request: ScriptRunRequest): string {
    const platform = currentPlatform()
    const script = this.getScript(request.scriptId)
    if (!platform || script.platform !== platform) throw new Error('该脚本与当前操作系统不兼容')
    if (!request.serial.trim()) throw new Error('请先选择已连接设备')

    const scriptPath = this.getScriptPath(script)
    const adbPath = getAdbExecutablePath()
    const env = {
      ...process.env,
      PATH: `${dirname(adbPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}`,
      ADBTRANS_SERIAL: request.serial,
      ADBTRANS_MODEL: request.model || '',
      ADBTRANS_ADB_PATH: adbPath
    }
    const runId = `${script.id}:${randomUUID()}`
    let child: ChildProcess

    if (platform === 'win') {
      const command = [scriptPath, ...request.args].map(quoteWindowsArgument).join(' ')
      // Chinese Windows cmd defaults to GBK (cp936); switch to UTF-8 so the
      // decoded output below matches what the script actually prints.
      // Use the string form + shell:true so Node itself builds the
      // `cmd /d /s /c "<command>"` line with windowsVerbatimArguments; passing
      // the line as a single spawn argument makes libuv escape the inner
      // quotes to \" and cmd then treats \"C:\...bat\" as the command name
      child = spawn(`@chcp 65001 >nul & ${command}`, {
        shell: true,
        cwd: this.rootDir,
        env,
        windowsHide: true
      })
    } else {
      child = spawn('/bin/zsh', [scriptPath, ...request.args], {
        cwd: this.rootDir,
        env,
        detached: true
      })
    }

    this.activeRuns.set(runId, child)
    this.emit('output', { runId, stream: 'system', text: `运行脚本：${script.name}\n设备：${request.serial}\n\n` })
    child.stdout?.on('data', (data: Buffer) => this.emit('output', { runId, stream: 'stdout', text: data.toString() }))
    child.stderr?.on('data', (data: Buffer) => this.emit('output', { runId, stream: 'stderr', text: data.toString() }))

    const timeout = setTimeout(() => {
      this.stop(runId)
      this.emit('output', { runId, stream: 'stderr', text: '\n脚本运行超过 10 分钟，已停止。\n' })
    }, 10 * 60 * 1000)

    child.on('error', (error) => {
      this.emit('output', { runId, stream: 'stderr', text: `${error.message}\n` })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timeout)
      this.activeRuns.delete(runId)
      const index = this.readIndex()
      const position = index.scripts.findIndex((item) => item.id === script.id)
      if (position >= 0) {
        index.scripts[position] = { ...index.scripts[position], lastRunAt: Date.now() }
        this.writeIndex(index)
      }
      this.emit('finished', { runId, code, signal })
    })
    return runId
  }

  stop(runId: string): boolean {
    const child = this.activeRuns.get(runId)
    if (!child?.pid) return false
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true })
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    }
    return true
  }

  stopAll(): void {
    for (const runId of this.activeRuns.keys()) this.stop(runId)
  }
}

export const scriptService = new ScriptService()
